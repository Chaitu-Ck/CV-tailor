/**
 * Universal ATS Service
 * 
 * Handles DOCX, ODF, and PDF file formats for ATS validation
 */

const docxReader = require('./docxReader');
const docxModifier = require('./docxModifier');
const odfReader = require('./odfReader');
const odfModifier = require('./odfModifier');
const pdfReader = require('./pdfReader');
const pdfModifier = require('./pdfModifier');
const atsService = require('./atsService');
const ATSColorCode = require('../utils/atsColorCode');
const logger = require('../utils/logger');

class UniversalAtsService {
  constructor() {
    this.supportedTypes = ['docx', 'odt', 'pdf'];
  }

  /**
   * Get file type from buffer
   * @param {Buffer} buffer - File buffer
   * @returns {string} File type ('docx', 'odt', or 'pdf')
   */
  async getFileType(buffer) {
    // Check for PDF signature first
    const pdfSignature = buffer.slice(0, 4).toString();
    if (pdfSignature === '%PDF') {
      return 'pdf';
    }
    
    // For DOCX and ODT, check ZIP structure
    try {
      const AdmZip = require('adm-zip');
      const zip = new AdmZip(buffer);
      
      // Check for DOCX structure
      if (zip.getEntry('word/document.xml')) {
        return 'docx';
      }
      
      // Check for ODT structure
      if (zip.getEntry('content.xml')) {
        return 'odt';
      }
    } catch (error) {
      // If it's not a ZIP file, it's not DOCX or ODT
    }
    
    throw new Error('Unsupported file type: not DOCX, ODT, or PDF');
  }

  /**
   * Validate document for ATS compatibility
   * @param {Buffer} documentBuffer - Document buffer
   * @param {string} jobDescription - Job description for content analysis
   * @returns {Object} Validation result with scores and recommendations
   */
  async validateDocumentAts(documentBuffer, jobDescription) {
    try {
      const fileType = await this.getFileType(documentBuffer);
      logger.info(`🔍 Starting ${fileType.toUpperCase()} ATS validation`);
      const startTime = Date.now();

      // Read document and analyze structure based on file type
      let documentData;
      if (fileType === 'docx') {
        documentData = await docxReader.readDocx(documentBuffer);
      } else if (fileType === 'odt') {
        documentData = await odfReader.readOdf(documentBuffer);
      } else if (fileType === 'pdf') {
        documentData = await pdfReader.readPdf(documentBuffer);
      } else {
        throw new Error(`Unsupported file type: ${fileType}`);
      }

      // Score content using existing ATS service
      const contentScore = await atsService.computeATS(
        documentData.content.text,
        jobDescription
      );

      // Combined scoring: 50% structure + 50% content
      const structureScore = documentData.structure.atsScore;
      const finalScore = Math.round((structureScore * 0.5) + (contentScore.finalATS * 0.5));

      // Build comprehensive result
      const result = {
        success: true,
        finalScore,
        fileType,
        breakdown: {
          structure: {
            score: structureScore,
            weight: '50%',
            issues: documentData.structure.issues,
            warnings: documentData.structure.warnings,
            details: {
              fonts: documentData.structure.fonts,
              images: documentData.structure.images,
              tables: documentData.structure.tables,
              textBoxes: documentData.structure.textBoxes,
              columns: documentData.structure.columns
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
          documentData.structure,
          contentScore
        ),
        metadata: {
          wordCount: documentData.content.wordCount,
          charCount: documentData.content.charCount,
          fileSize: documentBuffer.length,
          processingTimeMs: Date.now() - startTime,
          analyzedAt: new Date().toISOString()
        }
      };

      // Add color coding
      const enriched = ATSColorCode.enrichATSResponse({
        ...result,
        finalATS: finalScore
      });

      logger.info(`✅ ${fileType.toUpperCase()} ATS validation complete: ${finalScore}/100`);
      return enriched;
    } catch (error) {
      logger.error(`❌ Document ATS validation failed:`, error);
      throw error;
    }
  }

  /**
   * Optimize document for ATS compatibility
   * @param {Buffer} documentBuffer - Original document buffer
   * @param {string} jobDescription - Job description
   * @returns {Object} Optimized document and analysis
   */
  async optimizeDocument(documentBuffer, jobDescription) {
    try {
      const fileType = await this.getFileType(documentBuffer);
      logger.info(`🚀 Starting ${fileType.toUpperCase()} optimization`);

      // Analyze original
      const originalAnalysis = await this.validateDocumentAts(documentBuffer, jobDescription);

      // Read structure for modifications based on file type
      let documentData;
      if (fileType === 'docx') {
        documentData = await docxReader.readDocx(documentBuffer);
      } else if (fileType === 'odt') {
        documentData = await odfReader.readOdf(documentBuffer);
      } else if (fileType === 'pdf') {
        documentData = await pdfReader.readPdf(documentBuffer);
      } else {
        throw new Error(`Unsupported file type: ${fileType}`);
      }

      // Apply fixes based on file type
      let fixed;
      if (fileType === 'docx') {
        fixed = await docxModifier.fixAtsIssues(documentBuffer, documentData.structure);
      } else if (fileType === 'odt') {
        fixed = await odfModifier.fixAtsIssues(documentBuffer, documentData.structure);
      } else if (fileType === 'pdf') {
        fixed = await pdfModifier.fixAtsIssues(documentBuffer, documentData.structure);
      }

      // Re-analyze to confirm improvements
      const optimizedAnalysis = await this.validateDocumentAts(fixed.buffer, jobDescription);

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

      logger.info(`✅ ${fileType.toUpperCase()} optimization complete. Improvement: ${result.analysis.improvement}`);
      return result;
    } catch (error) {
      logger.error(`❌ ${fileType.toUpperCase()} optimization failed:`, error);
      throw error;
    }
  }

  /**
   * Fix ATS issues in document
   * @param {Buffer} documentBuffer - Original document buffer
   * @param {Object} structure - Document structure analysis
   * @param {string} fileType - File type ('docx', 'odt', or 'pdf')
   * @param {Object} options - Fix options
   * @returns {Object} Fixed document and modifications
   */
  async fixDocumentAtsIssues(documentBuffer, structure, fileType, options = {}) {
    logger.info(`🔧 Starting ${fileType} modifications...`);
    const startTime = Date.now();

    try {
      // Apply fixes based on file type and options
      let modifiedBuffer;
      const modifications = [];

      if (options.fixFonts && structure.fonts && !structure.fonts.isAtsSafe) {
        if (fileType === 'docx') {
          modifiedBuffer = await docxModifier._fixFonts(documentBuffer, structure.fonts.nonSafeFonts);
        } else if (fileType === 'odt') {
          modifiedBuffer = await odfModifier._fixFonts(documentBuffer, structure.fonts.nonSafeFonts);
        } else if (fileType === 'pdf') {
          // PDF modification is limited
          modifications.push('fonts_fixed_note (PDF font modification requires manual editing)');
          modifiedBuffer = documentBuffer;
        } else {
          modifiedBuffer = documentBuffer; // Use original if no modifications needed
        }
        modifications.push('fonts_fixed');
      } else {
        modifiedBuffer = documentBuffer; // Use original if no modifications needed
      }

      if (options.removeTextBoxes && structure.textBoxes && structure.textBoxes.hasTextBoxes) {
        if (fileType === 'docx') {
          modifiedBuffer = await docxModifier._removeTextBoxes(modifiedBuffer);
        } else if (fileType === 'odt') {
          modifiedBuffer = await odfModifier._removeTextBoxes(modifiedBuffer);
        } else if (fileType === 'pdf') {
          // PDF modification is limited
          modifications.push('textboxes_note (PDF text box removal requires manual editing)');
          modifiedBuffer = documentBuffer;
        } else {
          modifiedBuffer = documentBuffer; // Use original if no modifications needed
        }
        modifications.push('textboxes_removed');
      }

      if (options.convertColumns && structure.columns && structure.columns.hasColumns) {
        if (fileType === 'docx') {
          modifiedBuffer = await docxModifier._convertColumns(modifiedBuffer);
        } else if (fileType === 'odt') {
          modifiedBuffer = await odfModifier._convertColumns(modifiedBuffer);
        } else if (fileType === 'pdf') {
          // PDF modification is limited
          modifications.push('columns_note (PDF column conversion requires manual editing)');
          modifiedBuffer = documentBuffer;
        } else {
          modifiedBuffer = documentBuffer; // Use original if no modifications needed
        }
        modifications.push('columns_converted');
      }

      if (options.simplifyTables && structure.tables && structure.tables.hasNestedTables) {
        if (fileType === 'docx') {
          modifiedBuffer = await docxModifier._simplifyTables(modifiedBuffer);
        } else if (fileType === 'odt') {
          modifiedBuffer = await odfModifier._simplifyTables(modifiedBuffer);
        } else if (fileType === 'pdf') {
          // PDF modification is limited
          modifications.push('tables_note (PDF table simplification requires manual editing)');
          modifiedBuffer = documentBuffer;
        } else {
          modifiedBuffer = documentBuffer; // Use original if no modifications needed
        }
        modifications.push('tables_simplified');
      }

      const duration = Date.now() - startTime;
      logger.info(`✅ ${fileType.toUpperCase()} modified in ${duration}ms. Changes: ${modifications.join(', ')}`);

      return {
        buffer: modifiedBuffer,
        modifications,
        processingTimeMs: duration,
        modifiedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`❌ ${fileType.toUpperCase()} modification failed:`, error);
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

module.exports = new UniversalAtsService();