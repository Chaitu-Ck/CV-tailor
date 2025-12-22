/**
 * AI Optimizer Service
 * Orchestrates AI-powered CV optimization
 * Integrates Gemini with existing ATS scoring for maximum impact
 */

const geminiService = require('./geminiService');
const atsService = require('./atsService');
const cvParser = require('./cvParser');
const logger = require('../utils/logger');

class AIOptimizer {
  constructor() {
    this.geminiAvailable = geminiService.isAvailable();
  }

  /**
   * Perform full AI optimization on CV
   * Returns optimized text + tracking of all changes
   */
  async optimizeCV(cvText, jobDescription, jobTitle, options = {}) {
    try {
      const startTime = Date.now();
      logger.info(`🤖 [AI Optimizer] Starting full AI optimization for: ${jobTitle}`);

      if (!this.geminiAvailable) {
        logger.warn('⚠️  Gemini not available - returning original CV');
        return {
          optimizedText: cvText,
          improvements: [],
          changes: [],
          aiEnabled: false,
          processingTimeMs: Date.now() - startTime
        };
      }

      // Parse CV
      const parsedCV = cvParser.parseCV(cvText);
      let improvements = [];
      let changes = [];

      // 1. OPTIMIZE PROFESSIONAL SUMMARY
      logger.info('[AI] Optimizing professional summary...');
      const optimizedSummary = await geminiService.generateOptimizedSummary(
        parsedCV.summary || '',
        jobDescription,
        jobTitle,
        parsedCV.skills || []
      );

      if (optimizedSummary !== parsedCV.summary) {
        improvements.push('Enhanced professional summary with job-relevant keywords');
        changes.push({
          type: 'summary',
          before: parsedCV.summary,
          after: optimizedSummary
        });
        parsedCV.summary = optimizedSummary;
      }

      // 2. OPTIMIZE EXPERIENCE BULLETS
      logger.info('[AI] Optimizing experience bullets...');
      const optimizedExperience = await this.optimizeExperienceBullets(
        parsedCV.experience || [],
        jobDescription,
        jobTitle
      );

      if (optimizedExperience.changedBullets > 0) {
        improvements.push(`Enhanced ${optimizedExperience.changedBullets} experience bullets with job-relevant keywords`);
        changes.push({
          type: 'experience',
          changedBullets: optimizedExperience.changedBullets,
          details: optimizedExperience.details
        });
        parsedCV.experience = optimizedExperience.experience;
      }

      // 3. GET SKILL ENHANCEMENT SUGGESTIONS
      logger.info('[AI] Analyzing skill gaps...');
      const skillAnalysis = await this.analyzeSkillGaps(
        parsedCV.skills || [],
        jobDescription,
        jobTitle
      );

      if (skillAnalysis.missingSkills.length > 0) {
        improvements.push(`Identified ${skillAnalysis.missingSkills.length} gap-filling opportunities`);
        changes.push({
          type: 'skills',
          missingSkills: skillAnalysis.missingSkills,
          suggestions: skillAnalysis.suggestions
        });
      }

      // 4. REBUILD CV WITH OPTIMIZED CONTENT
      const optimizedCVText = this.rebuildCV(parsedCV, improvements);

      // 5. GET IMPROVEMENT RECOMMENDATIONS
      logger.info('[AI] Generating improvement recommendations...');
      const recommendations = await geminiService.getImprovementRecommendations(
        optimizedCVText,
        jobDescription,
        0 // Will be updated after ATS scoring
      );

      if (recommendations.length > 0) {
        improvements.push('Generated personalized optimization recommendations');
      }

      const processingTimeMs = Date.now() - startTime;
      logger.info(`✅ [AI] CV optimization complete in ${processingTimeMs}ms`);

      return {
        optimizedText: optimizedCVText,
        improvements,
        changes,
        recommendations,
        aiEnabled: true,
        processingTimeMs,
        stats: {
          summaryOptimized: optimizedSummary !== parsedCV.summary,
          bulletsOptimized: optimizedExperience.changedBullets,
          skillGapsIdentified: skillAnalysis.missingSkills.length,
          recommendationsGenerated: recommendations.length
        }
      };
    } catch (error) {
      logger.error('❌ [AI] CV optimization failed:', error);
      // Return original CV on error
      return {
        optimizedText: cvText,
        improvements: [],
        changes: [],
        error: error.message,
        aiEnabled: false,
        processingTimeMs: Date.now() - startTime
      };
    }
  }

  /**
   * Optimize individual experience bullets
   */
  async optimizeExperienceBullets(experiences, jobDescription, jobTitle) {
    let changedBullets = 0;
    const details = [];

    for (const experience of experiences) {
      if (!experience.bullets || experience.bullets.length === 0) continue;

      const optimizedBullets = await geminiService.optimizeMultipleBullets(
        experience.bullets,
        jobDescription,
        jobTitle
      );

      if (optimizedBullets.length > 0 && optimizedBullets[0] !== experience.bullets[0]) {
        changedBullets += optimizedBullets.length;
        details.push({
          position: experience.title,
          company: experience.company,
          bulletsCount: optimizedBullets.length
        });
        experience.bullets = optimizedBullets;
      }
    }

    return {
      experience: experiences,
      changedBullets,
      details
    };
  }

  /**
   * Analyze skill gaps and get suggestions
   */
  async analyzeSkillGaps(currentSkills, jobDescription, jobTitle) {
    try {
      // Extract job-required skills
      const jobSkills = this.extractJobSkills(jobDescription);

      // Find missing skills
      const missingSkills = jobSkills.filter(
        skill => !currentSkills.some(cs => cs.toLowerCase().includes(skill.toLowerCase()))
      );

      let suggestions = [];
      if (missingSkills.length > 0) {
        const skillSuggestions = await geminiService.suggestSkillEnhancements(
          currentSkills,
          jobDescription,
          missingSkills.slice(0, 5)
        );
        suggestions = skillSuggestions.suggestions || [];
      }

      return {
        currentSkills,
        jobSkills,
        missingSkills: missingSkills.slice(0, 5), // Top 5 missing
        matched: currentSkills.filter(skill =>
          jobSkills.some(js => js.toLowerCase().includes(skill.toLowerCase()))
        ),
        suggestions,
        matchPercentage: jobSkills.length > 0 ?
          Math.round((currentSkills.length / jobSkills.length) * 100) : 100
      };
    } catch (error) {
      logger.error('Skill gap analysis failed:', error);
      return {
        currentSkills,
        jobSkills: [],
        missingSkills: [],
        matched: [],
        suggestions: [],
        matchPercentage: 0
      };
    }
  }

  /**
   * Extract required skills from job description
   */
  extractJobSkills(jobDescription) {
    const techSkills = [
      'python', 'javascript', 'java', 'golang', 'rust', 'typescript',
      'node.js', 'react', 'angular', 'vue', 'django', 'flask', 'spring',
      'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'terraform',
      'sql', 'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch',
      'linux', 'bash', 'git', 'jenkins', 'gitlab', 'github',
      'ci/cd', 'devops', 'microservices', 'rest api', 'graphql',
      'kubernetes', 'ansible', 'terraform', 'jenkins',
      'security', 'penetration testing', 'firewall', 'iam',
      'agile', 'scrum', 'kanban', 'jira', 'confluence'
    ];

    const jobLower = jobDescription.toLowerCase();
    return techSkills.filter(skill => jobLower.includes(skill));
  }

  /**
   * Rebuild CV with optimized content
   */
  rebuildCV(parsedCV, improvements) {
    const lines = [];

    // Header
    if (parsedCV.header && parsedCV.header.name) {
      lines.push(parsedCV.header.name.toUpperCase());
      const contact = [
        parsedCV.header.location ? `📍 ${parsedCV.header.location}` : '',
        parsedCV.header.phone ? `📞 ${parsedCV.header.phone}` : '',
        parsedCV.header.email ? `📧 ${parsedCV.header.email}` : '',
        parsedCV.header.linkedin ? `🔗 ${parsedCV.header.linkedin}` : ''
      ].filter(x => x).join(' | ');
      if (contact) lines.push(contact);
    }

    lines.push('');

    // Professional Summary
    if (parsedCV.summary) {
      lines.push('PROFESSIONAL SUMMARY');
      lines.push(parsedCV.summary);
      lines.push('');
    }

    // Core Competencies
    if (parsedCV.skills && parsedCV.skills.length > 0) {
      lines.push('CORE COMPETENCIES');
      lines.push(parsedCV.skills.slice(0, 15).join(', '));
      lines.push('');
    }

    // Professional Experience
    if (parsedCV.experience && parsedCV.experience.length > 0) {
      lines.push('PROFESSIONAL EXPERIENCE');
      for (const exp of parsedCV.experience) {
        lines.push('');
        lines.push(`${exp.title || 'Position'} | ${exp.company || 'Company'}`);
        if (exp.startDate || exp.endDate) {
          lines.push(`${exp.startDate || 'Start'} - ${exp.endDate || 'Present'}`);
        }
        if (exp.bullets && exp.bullets.length > 0) {
          for (const bullet of exp.bullets) {
            lines.push(`  • ${bullet}`);
          }
        }
      }
      lines.push('');
    }

    // Education
    if (parsedCV.education && parsedCV.education.length > 0) {
      lines.push('EDUCATION');
      for (const edu of parsedCV.education) {
        lines.push(`${edu.degree} | ${edu.institution}`);
        if (edu.year) lines.push(`Year: ${edu.year}`);
      }
      lines.push('');
    }

    // Certifications
    if (parsedCV.certifications && parsedCV.certifications.length > 0) {
      lines.push('CERTIFICATIONS');
      for (const cert of parsedCV.certifications.slice(0, 10)) {
        lines.push(`  ✓ ${cert}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Get optimization impact summary
   */
  getOptimizationSummary(result) {
    const summary = {
      aiEnabled: result.aiEnabled,
      improvements: result.improvements.length,
      processingTimeMs: result.processingTimeMs,
      changes: {
        summary: result.changes.some(c => c.type === 'summary'),
        experience: result.changes.some(c => c.type === 'experience'),
        skills: result.changes.some(c => c.type === 'skills')
      },
      recommendations: result.recommendations ? result.recommendations.length : 0,
      details: {
        improvements: result.improvements.slice(0, 3),
        topRecommendations: result.recommendations ? result.recommendations.slice(0, 2) : []
      }
    };

    return summary;
  }
}

module.exports = new AIOptimizer();
