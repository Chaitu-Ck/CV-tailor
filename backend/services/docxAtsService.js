/**
 * DOCX ATS Service
 * 
 * Purpose: Validate DOCX files for ATS compatibility
 * Combines structure analysis + content scoring
 * 
 * Scoring: 50% structure + 50% content
 */

const docxReader = require('./docxReader');
const atsService = require('./atsService'); // Reuse existing content scoring
const logger = require('../utils/logger');
const ATSColorCode = require('../utils/atsColorCode');

class DocxAtsService {
  /**
   * Complete DOCX ATS validation
   * 
   * @param {Buffer} docxBuffer - DOCX file buffer
   * @param {string} jobDescription - Job description text
   * @returns {Promise<Object>} Complete ATS analysis
   */
  async validateDocxAts(docxBuffer, jobDescription) {
    try {
      logger.info('🔍 Starting DOCX ATS validation');
      const startTime = Date.now();

      // 1. Read DOCX and analyze structure
      const docxData = await docxReader.readDocx(docxBuffer);

      // 2. Score content using existing ATS service
      const contentScore = await atsService.computeATS(
        docxData.content.text,
        jobDescription
      );

      // 3. Combined scoring: 50% structure + 50% content
      const structureScore = docxData.structure.atsScore;
      const finalScore = Math.round((structureScore * 0.5) + (contentScore.finalATS * 0.5));

      // 4. Build comprehensive result
      const result = {
        success: true,
        finalScore,
        breakdown: {
          structure: {
            score: structureScore,
            weight: '50%',
            issues: docxData.structure.issues,
            warnings: docxData.structure.warnings,
            details: {
              fonts: docxData.structure.fonts,
              images: docxData.structure.images,
              tables: docxData.structure.tables,
              textBoxes: docxData.structure.textBoxes,
              columns: docxData.structure.columns
            }
          },
          content: {
            score: contentScore.finalATS,
            weight: '50%',
            keywordScore: contentScore.keywordScore,
            skillScore: contentScore.skillScore,
            tfidfScore: contentScore.tfidfScore,
            missingKeywords: contentScore.missingKeywords,
            missingSkills: contentScore.skillScore?.missingSkills || []
          }
        },
        recommendations: this._generateRecommendations(
          docxData.structure,
          contentScore
        ),
        metadata: {
          wordCount: docxData.content.wordCount,
          charCount: docxData.content.charCount,
          fileSize: docxBuffer.length,
          processingTimeMs: Date.now() - startTime,
          analyzedAt: new Date().toISOString()
        }
      };

      // Add color coding
      const enriched = ATSColorCode.enrichATSResponse({
        ...result,
        finalATS: finalScore
      });

      logger.info(`✅ DOCX ATS validation complete: ${finalScore}/100`);
      return enriched;

    } catch (error) {
      logger.error('❌ DOCX ATS validation failed:', error);
      throw error;
    }
  }

  /**
   * Generate actionable recommendations
   * @private
   */
  _generateRecommendations(structure, contentScore) {
    const recommendations = [];

    // Structure recommendations (HIGH PRIORITY)
    if (structure.issues.length > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        category: 'Structure',
        issues: structure.issues.map(i => i.message),
        action: 'Use the "Fix ATS Issues" button to automatically fix these'
      });
    }

    if (structure.warnings.length > 0) {
      const highWarnings = structure.warnings.filter(w => w.severity === 'HIGH');
      if (highWarnings.length > 0) {
        recommendations.push({
          priority: 'HIGH',
          category: 'Formatting',
          issues: highWarnings.map(w => w.message),
          action: 'Automatic fixes available'
        });
      }
    }

    // Content recommendations
    if (contentScore.skillScore?.missingSkills?.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Skills',
        missing: contentScore.skillScore.missingSkills.slice(0, 5),
        action: 'Add these skills to your CV if you have them'
      });
    }

    if (contentScore.missingKeywords?.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Keywords',
        missing: contentScore.missingKeywords.slice(0, 10),
        action: 'Incorporate relevant keywords naturally'
      });
    }

    // Score-based recommendations
    if (structure.atsScore >= 80 && contentScore.finalATS >= 75) {
      recommendations.push({
        priority: 'INFO',
        category: 'Overall',
        message: '🚀 Excellent! Your CV is well-optimized for ATS',
        action: 'Ready to submit'
      });
    } else if (structure.atsScore < 60 || contentScore.finalATS < 60) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Overall',
        message: 'Significant improvements needed',
        action: 'Focus on fixing structure issues first, then content'
      });
    }

    return recommendations;
  }
}

module.exports = new DocxAtsService();