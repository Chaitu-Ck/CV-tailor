/**
 * ODF ATS Service
 * 
 * Comprehensive ATS validation for ODF files
 * Combines structure analysis with content scoring
 */

const odfReader = require('./odfReader');
const odfModifier = require('./odfModifier');
const atsService = require('./atsService');
const ATSColorCode = require('../utils/atsColorCode');
const logger = require('../utils/logger');

class OdfAtsService {
  constructor() {
    this.supportedTypes = ['odt'];
  }

  /**
   * Validate ODF for ATS compatibility
   * @param {Buffer} odfBuffer - ODF file buffer
   * @param {string} jobDescription - Job description for content analysis
   * @returns {Object} Validation result with scores and recommendations
   */
  async validateOdfAts(odfBuffer, jobDescription) {
    try {
      logger.info('🔍 Starting ODF ATS validation');
      const startTime = Date.now();

      // 1. Read ODF and analyze structure
      const odfData = await odfReader.readOdf(odfBuffer);

      // 2. Score content using existing ATS service
      const contentScore = await atsService.computeATS(
        odfData.content.text,
        jobDescription
      );

      // 3. Combined scoring: 50% structure + 50% content
      const structureScore = odfData.structure.atsScore;
      const finalScore = Math.round((structureScore * 0.5) + (contentScore.finalATS * 0.5));

      // 4. Build comprehensive result
      const result = {
        success: true,
        finalScore,
        breakdown: {
          structure: {
            score: structureScore,
            weight: '50%',
            issues: odfData.structure.issues,
            warnings: odfData.structure.warnings,
            details: {
              fonts: odfData.structure.fonts,
              images: odfData.structure.images,
              tables: odfData.structure.tables,
              textBoxes: odfData.structure.textBoxes,
              columns: odfData.structure.columns
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
          odfData.structure,
          contentScore
        ),
        metadata: {
          wordCount: odfData.content.wordCount,
          charCount: odfData.content.charCount,
          fileSize: odfBuffer.length,
          processingTimeMs: Date.now() - startTime,
          analyzedAt: new Date().toISOString()
        }
      };

      // Add color coding
      const enriched = ATSColorCode.enrichATSResponse({
        ...result,
        finalATS: finalScore
      });

      logger.info(`✅ ODF ATS validation complete: ${finalScore}/100`);
      return enriched;
    } catch (error) {
      logger.error('❌ ODF ATS validation failed:', error);
      throw error;
    }
  }

  /**
   * Optimize ODF for ATS compatibility
   * @param {Buffer} odfBuffer - Original ODF buffer
   * @param {string} jobDescription - Job description
   * @returns {Object} Optimized ODF and analysis
   */
  async optimizeOdf(odfBuffer, jobDescription) {
    try {
      logger.info('🚀 Starting ODF optimization');

      // 1. Analyze original
      const originalAnalysis = await this.validateOdfAts(odfBuffer, jobDescription);

      // 2. Read structure for modifications
      const odfData = await odfReader.readOdf(odfBuffer);

      // 3. Apply fixes
      const fixed = await odfModifier.fixAtsIssues(odfBuffer, odfData.structure);

      // 4. Re-analyze to confirm improvements
      const optimizedAnalysis = await this.validateOdfAts(fixed.buffer, jobDescription);

      const result = {
        success: true,
        analysis: {
          before: {
            score: originalAnalysis.finalScore,
            issues: originalAnalysis.breakdown.structure.issues.length,
            warnings: originalAnalysis.breakdown.structure.warnings.length
          },
          after: {
            score: optimizedAnalysis.finalScore,
            issues: optimizedAnalysis.breakdown.structure.issues.length,
            warnings: optimizedAnalysis.breakdown.structure.warnings.length
          },
          improvement: optimizedAnalysis.finalScore - originalAnalysis.finalScore
        },
        modifications: fixed.modifications,
        recommendations: optimizedAnalysis.recommendations,
        optimizedBuffer: fixed.buffer,
        processingTimeMs: fixed.processingTimeMs + (Date.now() - new Date(optimizedAnalysis.metadata.analyzedAt).getTime())
      };

      logger.info(`✅ ODF optimization complete. Improvement: ${result.analysis.improvement}`);
      return result;
    } catch (error) {
      logger.error('❌ ODF optimization failed:', error);
      throw error;
    }
  }

  /**
   * Generate recommendations based on structure and content
   * @param {Object} structure - Document structure
   * @param {Object} contentScore - Content analysis result
   * @private
   */
  _generateRecommendations(structure, contentScore) {
    const recommendations = [];

    // Structure-based recommendations
    if (structure.textBoxes.hasTextBoxes) {
      recommendations.push({
        category: 'structure',
        priority: 'high',
        description: 'Remove text boxes',
        action: 'Text boxes are not ATS-friendly and cause parsing issues'
      });
    }

    if (structure.columns.hasColumns) {
      recommendations.push({
        category: 'structure',
        priority: 'high',
        description: 'Convert to single column',
        action: 'Multiple columns cause ATS parsing problems'
      });
    }

    if (structure.fonts.nonSafeFonts.length > 0) {
      recommendations.push({
        category: 'formatting',
        priority: 'medium',
        description: 'Use ATS-safe fonts',
        action: `Replace fonts: ${structure.fonts.nonSafeFonts.join(', ')} with Arial, Times New Roman, or Calibri`
      });
    }

    // Content-based recommendations
    if (contentScore.missingKeywords && contentScore.missingKeywords.length > 0) {
      recommendations.push({
        category: 'content',
        priority: 'high',
        description: 'Include missing keywords',
        action: `Add these keywords to your CV: ${contentScore.missingKeywords.slice(0, 5).join(', ')}`
      });
    }

    if (contentScore.skillScore?.missingSkills && contentScore.skillScore.missingSkills.length > 0) {
      recommendations.push({
        category: 'skills',
        priority: 'medium',
        description: 'Add missing skills',
        action: `Include these skills: ${contentScore.skillScore.missingSkills.slice(0, 5).join(', ')}`
      });
    }

    return recommendations;
  }
}

module.exports = new OdfAtsService();