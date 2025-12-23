/**
 * PDF ATS Service
 * 
 * Comprehensive ATS validation for PDF files
 * Combines structure analysis with content scoring
 */

const pdfReader = require('./pdfReader');
const pdfModifier = require('./pdfModifier');
const atsService = require('./atsService');
const ATSColorCode = require('../utils/atsColorCode');
const logger = require('../utils/logger');

class PdfAtsService {
  constructor() {
    this.supportedTypes = ['pdf'];
  }

  /**
   * Validate PDF for ATS compatibility
   * @param {Buffer} pdfBuffer - PDF file buffer
   * @param {string} jobDescription - Job description for content analysis
   * @returns {Object} Validation result with scores and recommendations
   */
  async validatePdfAts(pdfBuffer, jobDescription) {
    try {
      logger.info('🔍 Starting PDF ATS validation');
      const startTime = Date.now();

      // 1. Read PDF and analyze structure
      const pdfData = await pdfReader.readPdf(pdfBuffer);

      // 2. Score content using existing ATS service
      const contentScore = await atsService.computeATS(
        pdfData.content.text,
        jobDescription
      );

      // 3. Combined scoring: 50% structure + 50% content
      const structureScore = pdfData.structure.atsScore;
      const finalScore = Math.round((structureScore * 0.5) + (contentScore.finalATS * 0.5));

      // 4. Build comprehensive result
      const result = {
        success: true,
        finalScore,
        fileType: 'pdf',
        breakdown: {
          structure: {
            score: structureScore,
            weight: '50%',
            issues: pdfData.structure.issues,
            warnings: pdfData.structure.warnings,
            details: {
              fonts: pdfData.structure.fonts,
              images: pdfData.structure.images,
              tables: pdfData.structure.tables,
              textBoxes: pdfData.structure.textBoxes,
              columns: pdfData.structure.columns
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
          pdfData.structure,
          contentScore
        ),
        metadata: {
          wordCount: pdfData.content.wordCount,
          charCount: pdfData.content.charCount,
          pageCount: pdfData.content.pageCount,
          fileSize: pdfBuffer.length,
          processingTimeMs: Date.now() - startTime,
          analyzedAt: new Date().toISOString()
        }
      };

      // Add color coding
      const enriched = ATSColorCode.enrichATSResponse({
        ...result,
        finalATS: finalScore
      });

      logger.info(`✅ PDF ATS validation complete: ${finalScore}/100`);
      return enriched;
    } catch (error) {
      logger.error('❌ PDF ATS validation failed:', error);
      throw error;
    }
  }

  /**
   * Optimize PDF for ATS compatibility
   * @param {Buffer} pdfBuffer - Original PDF buffer
   * @param {string} jobDescription - Job description
   * @returns {Object} Optimized PDF and analysis
   */
  async optimizePdf(pdfBuffer, jobDescription) {
    try {
      logger.info('🚀 Starting PDF optimization');

      // 1. Analyze original
      const originalAnalysis = await this.validatePdfAts(pdfBuffer, jobDescription);

      // 2. Read structure for modifications
      const pdfData = await pdfReader.readPdf(pdfBuffer);

      // 3. Apply fixes (with limitations noted)
      const fixed = await pdfModifier.fixAtsIssues(pdfBuffer, pdfData.structure);

      // 4. Re-analyze to confirm current state
      const optimizedAnalysis = await this.validatePdfAts(fixed.buffer, jobDescription);

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
        note: fixed.note,
        processingTimeMs: fixed.processingTimeMs + (Date.now() - new Date(optimizedAnalysis.metadata.analyzedAt).getTime())
      };

      logger.info(`✅ PDF analysis complete. Note: ${result.note}`);
      return result;
    } catch (error) {
      logger.error('❌ PDF optimization failed:', error);
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
        description: 'PDF contains text boxes',
        action: 'Consider converting to DOCX/ODT for better ATS compatibility'
      });
    }

    if (structure.columns.hasColumns) {
      recommendations.push({
        category: 'structure',
        priority: 'high',
        description: 'PDF uses multiple columns',
        action: 'Convert to single column format in DOCX/ODT for better ATS parsing'
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

    // General recommendation about PDF limitations
    recommendations.push({
      category: 'format',
      priority: 'info',
      description: 'PDF format limitations',
      action: 'For best ATS compatibility, consider using DOCX or ODT formats which allow for more comprehensive optimization'
    });

    return recommendations;
  }
}

module.exports = new PdfAtsService();