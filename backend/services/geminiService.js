/**
 * Gemini AI Service
 * Integrates Google Gemini API for intelligent CV optimization
 * Uses AI to rewrite bullets, suggest improvements, and match keywords
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

class GeminiService {
  constructor() {
    // Initialize Gemini API
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.warn('⚠️  GEMINI_API_KEY not set - AI features disabled');
      this.client = null;
    } else {
      this.client = new GoogleGenerativeAI(apiKey);
      this.model = this.client.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-pro' });
    }
  }

  /**
   * Check if Gemini is available
   */
  isAvailable() {
    return this.client !== null;
  }

  /**
   * Rewrite CV bullet point to include job keywords
   * Maintains authenticity while optimizing for ATS
   */
  async optimizeBulletPoint(bulletPoint, jobDescription, jobTitle) {
    if (!this.isAvailable()) {
      logger.warn('Gemini not available, returning original bullet');
      return bulletPoint;
    }

    try {
      const prompt = `You are an expert resume writer specializing in ATS optimization.

Rewrite this CV bullet point to better match the job requirements while keeping it authentic and concise.

Current Bullet Point:
"${bulletPoint}"

Job Title: ${jobTitle}

Job Description:
${jobDescription.substring(0, 500)}...

Instructions:
1. Keep the original achievement/action
2. Include relevant keywords from the job description
3. Use action verbs and metrics
4. Keep it under 100 words
5. Maintain professional tone
6. Return ONLY the rewritten bullet point, nothing else

Optimized Bullet Point:`;

      const result = await this.model.generateContent(prompt);
      const optimizedText = result.response.text().trim();

      if (optimizedText.length < 20) {
        return bulletPoint; // Fallback if response too short
      }

      logger.info(`✅ Optimized bullet point using Gemini`);
      return optimizedText;
    } catch (error) {
      logger.error('Gemini bullet optimization failed:', error);
      return bulletPoint; // Fallback to original
    }
  }

  /**
   * Generate professional summary matched to job
   */
  async generateOptimizedSummary(currentSummary, jobDescription, jobTitle, skills) {
    if (!this.isAvailable()) {
      return currentSummary;
    }

    try {
      const prompt = `You are an expert resume writer specializing in ATS optimization.

Rewrite this professional summary to better match the job requirements. Include relevant keywords and achievements.

Current Summary:
"${currentSummary}"

Key Skills:
${skills.slice(0, 10).join(', ')}

Target Job Title: ${jobTitle}

Job Description:
${jobDescription.substring(0, 500)}...

Instructions:
1. Keep it 2-3 sentences
2. Include job-relevant keywords
3. Highlight key achievements
4. Use action-oriented language
5. Maintain professional tone
6. Return ONLY the rewritten summary

Optimized Summary:`;

      const result = await this.model.generateContent(prompt);
      const optimized = result.response.text().trim();

      if (optimized.length < 50) {
        return currentSummary;
      }

      logger.info(`✅ Generated optimized summary using Gemini`);
      return optimized;
    } catch (error) {
      logger.error('Gemini summary generation failed:', error);
      return currentSummary;
    }
  }

  /**
   * Suggest missing skills and how to add them
   */
  async suggestSkillEnhancements(currentSkills, jobDescription, missingSkills) {
    if (!this.isAvailable()) {
      return { suggestions: [], enhancements: [] };
    }

    try {
      const prompt = `You are an expert in career development and ATS optimization.

The candidate has these skills:
${currentSkills.slice(0, 15).join(', ')}

But the job requires these missing skills:
${missingSkills.slice(0, 10).join(', ')}

Job Description:
${jobDescription.substring(0, 500)}...

Provide suggestions on:
1. How to highlight existing skills that relate to missing ones
2. Specific certifications or experiences to add
3. How to reframe current experience

Format your response as:
Suggestions:
- Suggestion 1
- Suggestion 2
- Suggestion 3

Enhancements:
- Enhancement 1
- Enhancement 2`;

      const result = await this.model.generateContent(prompt);
      const text = result.response.text();

      // Parse suggestions and enhancements
      const suggestions = text.match(/Suggestions:[\s\S]*?(?=Enhancements:|$)/)?.[0]
        ?.split('-')
        .slice(1)
        .map(s => s.trim())
        .filter(s => s.length > 0) || [];

      const enhancements = text.match(/Enhancements:[\s\S]*/)?.[0]
        ?.split('-')
        .slice(1)
        .map(e => e.trim())
        .filter(e => e.length > 0) || [];

      logger.info(`✅ Generated skill enhancement suggestions`);
      return { suggestions, enhancements };
    } catch (error) {
      logger.error('Gemini skill suggestion failed:', error);
      return { suggestions: [], enhancements: [] };
    }
  }

  /**
   * Score CV content relevance to job (semantic matching)
   */
  async scoreContentRelevance(cvText, jobDescription) {
    if (!this.isAvailable()) {
      return 0.5; // Return neutral score if Gemini unavailable
    }

    try {
      const prompt = `You are an ATS expert evaluating CV content relevance.

Rate how well this CV matches this job description on a scale of 0-100.

CV Content (first 500 chars):
${cvText.substring(0, 500)}...

Job Description:
${jobDescription.substring(0, 500)}...

Consider:
1. Skill alignment
2. Experience relevance
3. Industry terminology match
4. Achievement alignment with job goals

Respond with ONLY a number between 0-100.

Relevance Score:`;

      const result = await this.model.generateContent(prompt);
      const scoreText = result.response.text().trim();
      const score = parseInt(scoreText);

      if (isNaN(score)) {
        return 0.5;
      }

      logger.info(`✅ Content relevance score: ${score}%`);
      return Math.min(score / 100, 1.0);
    } catch (error) {
      logger.error('Gemini relevance scoring failed:', error);
      return 0.5;
    }
  }

  /**
   * Generate optimized experience section
   */
  async optimizeExperienceSection(experiences, jobDescription, jobTitle) {
    if (!this.isAvailable() || !experiences || experiences.length === 0) {
      return experiences;
    }

    try {
      const experienceText = experiences
        .map(exp => `${exp.title} at ${exp.company}:\n${(exp.bullets || []).join('\n')}`)
        .join('\n\n');

      const prompt = `You are an expert resume writer specializing in ATS optimization.

Optimize these experience entries to better match the job requirements.

Current Experience:
${experienceText}

Target Job Title: ${jobTitle}

Job Requirements:
${jobDescription.substring(0, 400)}...

For each role, provide optimized bullet points that:
1. Highlight achievements with metrics
2. Include relevant keywords
3. Use action verbs
4. Show impact and results

Format:
[Role Title] at [Company]
- Optimized bullet 1
- Optimized bullet 2
- Optimized bullet 3

Optimized Experience:`;

      const result = await this.model.generateContent(prompt);
      const optimizedText = result.response.text();

      logger.info(`✅ Optimized experience section using Gemini`);
      return optimizedText; // Return as structured text
    } catch (error) {
      logger.error('Gemini experience optimization failed:', error);
      return experiences;
    }
  }

  /**
   * Batch optimize multiple bullet points
   */
  async optimizeMultipleBullets(bulletPoints, jobDescription, jobTitle) {
    if (!this.isAvailable() || !bulletPoints || bulletPoints.length === 0) {
      return bulletPoints;
    }

    try {
      const bulletsText = bulletPoints.map((b, i) => `${i + 1}. ${b}`).join('\n');

      const prompt = `You are an expert resume writer specializing in ATS optimization.

Optimize these CV bullet points to include job keywords and improve ATS matching.

Current Bullets:
${bulletsText}

Job Title: ${jobTitle}

Job Description (first 500 chars):
${jobDescription.substring(0, 500)}...

For each bullet:
1. Keep the original achievement
2. Add relevant job keywords
3. Use strong action verbs
4. Include metrics if possible
5. Keep under 100 words each

Return ONLY the optimized bullets in the same numbered format.

Optimized Bullets:`;

      const result = await this.model.generateContent(prompt);
      const optimizedText = result.response.text();

      // Parse optimized bullets
      const optimized = optimizedText
        .split('\n')
        .filter(line => line.trim().match(/^\d+\./)) // Lines starting with numbers
        .map(line => line.replace(/^\d+\.\s+/, '').trim())
        .filter(line => line.length > 0);

      if (optimized.length > 0) {
        logger.info(`✅ Optimized ${optimized.length} bullet points using Gemini`);
        return optimized;
      }

      return bulletPoints; // Fallback
    } catch (error) {
      logger.error('Gemini batch bullet optimization failed:', error);
      return bulletPoints;
    }
  }

  /**
   * Get AI recommendations for CV improvement
   */
  async getImprovementRecommendations(cvText, jobDescription, atsScore) {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const prompt = `You are an ATS and career development expert.

Based on this CV and job requirements, provide specific actionable recommendations to improve ATS matching.

Current ATS Score: ${atsScore}%

CV (first 500 chars):
${cvText.substring(0, 500)}...

Job Description:
${jobDescription.substring(0, 500)}...

Provide 3-5 specific recommendations in this format:
1. [Category]: [Specific action to take]

Focus on:
- Keyword placement
- Skill highlighting
- Achievement quantification
- Format optimization

Recommendations:`;

      const result = await this.model.generateContent(prompt);
      const text = result.response.text();

      // Parse recommendations
      const recommendations = text
        .split('\n')
        .filter(line => line.trim().match(/^\d+\./)) // Lines starting with numbers
        .map(line => line.replace(/^\d+\.\s+/, '').trim())
        .filter(line => line.length > 0)
        .slice(0, 5); // Max 5 recommendations

      logger.info(`✅ Generated ${recommendations.length} improvement recommendations`);
      return recommendations;
    } catch (error) {
      logger.error('Gemini recommendation generation failed:', error);
      return [];
    }
  }
}

module.exports = new GeminiService();
