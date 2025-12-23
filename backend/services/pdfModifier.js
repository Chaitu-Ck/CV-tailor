/**
 * PDF Modifier Service
 * 
 * Modifies PDF files to fix ATS compatibility issues
 * Note: PDF modification is limited compared to DOCX/ODF
 */

const logger = require('../utils/logger');

class PdfModifierError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'PdfModifierError';
    this.code = code;
    this.details = details;
  }
}

class PdfModifier {
  constructor() {
    this.supportedTypes = ['pdf'];
  }

  /**
   * Fix ATS issues in PDF file
   * @param {Buffer} buffer - Original PDF buffer
   * @param {Object} structure - Document structure analysis
   * @param {Object} options - Fix options
   * @returns {Object} Modified buffer and modifications
   */
  async fixAtsIssues(buffer, structure, options = {}) {
    const {
      fixFonts = true,
      removeTextBoxes = true,
      simplifyTables = true,
      convertColumns = true,
      optimizeContent = false
    } = options;

    logger.info('🔧 Starting PDF modifications...');
    const startTime = Date.now();

    try {
      // PDF modification is complex and has limitations
      // For now, we'll return the original buffer with a note about limitations
      const modifications = [];

      // Note: True PDF modification requires complex libraries and is often not practical
      // Instead, we'll return the original buffer with information about what can't be fixed
      if (structure.textBoxes && structure.textBoxes.hasTextBoxes) {
        modifications.push('textboxes_detected_but_not_fixed (requires manual editing)');
      }

      if (structure.columns && structure.columns.hasColumns) {
        modifications.push('columns_detected_but_not_fixed (requires manual editing)');
      }

      if (structure.tables && structure.tables.hasNestedTables) {
        modifications.push('tables_detected_but_not_fixed (requires manual editing)');
      }

      const duration = Date.now() - startTime;
      logger.info(`✅ PDF analysis for modifications complete in ${duration}ms. Limitations noted: ${modifications.join(', ')}`);

      return {
        buffer: buffer, // Return original buffer since true PDF modification is complex
        modifications,
        processingTimeMs: duration,
        modifiedAt: new Date().toISOString(),
        note: "PDF modification has significant limitations. Consider converting to DOCX/ODT for full ATS optimization."
      };
    } catch (error) {
      logger.error('❌ PDF modification failed:', error);
      throw new PdfModifierError(
        `Modification failed: ${error.message}`,
        'MODIFICATION_FAILED',
        { originalError: error.message }
      );
    }
  }
}

module.exports = new PdfModifier();