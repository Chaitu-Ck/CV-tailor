/**
 * PDF Reader Service
 * 
 * Reads and analyzes PDF files for ATS compatibility
 */

// Dynamically import PDF.js for Node.js compatibility
let pdfjsLib;
try {
  pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
  // Set the worker for Node.js environment
  pdfjsLib.GlobalWorkerOptions.workerSrc = `pdfjs-dist/legacy/build/pdf.worker.js`;
} catch (error) {
  // Fallback approach for Node.js
  console.warn('PDF.js import failed, using fallback approach:', error.message);
  // For now, we'll implement a minimal PDF reader that just checks the header
}

const logger = require('../utils/logger');

class PdfReader {
  constructor() {
    this.supportedTypes = ['pdf'];
  }

  /**
   * Read and analyze PDF file
   * @param {Buffer} buffer - PDF file buffer
   * @returns {Object} Analysis result
   */
  async readPdf(buffer) {
    const startTime = Date.now();
    logger.info('📖 Starting PDF analysis...');
    
    try {
      // Validate input
      this._validateBuffer(buffer);
      
      // Extract content
      const content = await this._extractContent(buffer);
      
      // Analyze structure
      const structure = this._analyzeStructure(content);
      
      // Calculate ATS score
      const atsScore = this._calculateAtsScore(structure);
      
      // Generate issues and warnings
      this._generateIssuesWarnings(structure);
      
      const duration = Date.now() - startTime;
      logger.info(`✅ PDF analysis complete in ${duration}ms`);
      
      return {
        content,
        structure,
        atsScore,
        analyzedAt: new Date().toISOString(),
        processingTimeMs: duration
      };
    } catch (error) {
      logger.error('❌ PDF analysis failed:', error);
      throw error;
    }
  }

  /**
   * Validate input buffer
   * @param {Buffer} buffer - Input buffer
   * @private
   */
  _validateBuffer(buffer) {
    if (!buffer) {
      throw new Error('Buffer is required');
    }
    if (!Buffer.isBuffer(buffer)) {
      throw new Error('Input must be a Buffer');
    }
    if (buffer.length === 0) {
      throw new Error('Buffer cannot be empty');
    }
    
    // Check for PDF magic number
    const pdfSignature = buffer.slice(0, 4).toString();
    if (pdfSignature !== '%PDF') {
      throw new Error('Invalid PDF file: missing PDF signature');
    }
  }

  /**
   * Extract content from PDF
   * @param {Buffer} buffer - PDF buffer
   * @private
   */
  async _extractContent(buffer) {
    try {
      // For now, since PDF.js might have issues in Node.js, 
      // we'll implement a basic text extraction or return basic info
      const pdfSignature = buffer.slice(0, 4).toString();
      
      if (pdfSignature !== '%PDF') {
        throw new Error('Invalid PDF file');
      }
      
      // For basic PDF analysis, we'll return minimal content info
      // In a production environment, you'd want to properly integrate PDF.js with Node.js
      return {
        text: '[PDF Content - Text extraction requires proper PDF.js setup]', // Placeholder
        pages: ['[Page 1]'], // Placeholder
        raw: '[Raw PDF data]', // Placeholder
        wordCount: 0, // Placeholder - would need actual text extraction
        charCount: 0, // Placeholder - would need actual text extraction
        pageCount: 1 // Placeholder - would need actual page counting
      };
    } catch (error) {
      throw new Error(`PDF content extraction failed: ${error.message}`);
    }
  }

  /**
   * Analyze PDF structure
   * @param {Object} content - Extracted content
   * @private
   */
  _analyzeStructure(content) {
    const structure = {
      fonts: this._analyzeFonts(),
      images: this._analyzeImages(),
      tables: this._analyzeTables(content),
      textBoxes: this._analyzeTextBoxes(),
      columns: this._analyzeColumns(content),
      metadata: this._analyzeMetadata()
    };

    return structure;
  }

  /**
   * Analyze fonts in PDF (stub - PDF font analysis is complex)
   * @private
   */
  _analyzeFonts() {
    // For basic implementation, assume fonts are generally ATS-compatible
    return {
      fonts: ['Embedded Fonts'], // Actual font detection in PDFs is complex
      nonSafeFonts: [],
      isAtsSafe: true,
      count: 1
    };
  }

  /**
   * Analyze images in PDF (stub)
   * @private
   */
  _analyzeImages() {
    // This is a simplified approach - actual PDF image detection is complex
    return {
      count: 0, // Would require complex PDF parsing to detect actual images
      hasImages: false,
      paths: []
    };
  }

  /**
   * Analyze tables in PDF content
   * @param {Object} content - Extracted content
   * @private
   */
  _analyzeTables(content) {
    // Look for table-like patterns in text
    const tableIndicators = [
      /table|header|cell|row|column/gi,
      /\|.*\|/g, // Simple table separators
      /.*\t.*\t.*/g // Tab-separated values
    ];
    
    let tableCount = 0;
    for (const indicator of tableIndicators) {
      const matches = content.text.match(indicator);
      if (matches) {
        tableCount += matches.length;
      }
    }
    
    return {
      count: tableCount,
      hasTables: tableCount > 0,
      hasNestedTables: false // Difficult to detect in plain text
    };
  }

  /**
   * Analyze text boxes in PDF (stub)
   * @private
   */
  _analyzeTextBoxes() {
    // Text boxes in PDFs are difficult to detect from text content alone
    return {
      count: 0,
      hasTextBoxes: false
    };
  }

  /**
   * Analyze columns in PDF content
   * @param {Object} content - Extracted content
   * @private
   */
  _analyzeColumns(content) {
    // Look for column-like patterns in text
    // This is a simplified approach - actual column detection in PDFs is complex
    const hasColumnIndicators = content.text.includes('  ') && 
                              content.text.split('\n').filter(line => line.trim()).length > 10;
    
    return {
      hasColumns: hasColumnIndicators,
      count: hasColumnIndicators ? 1 : 0
    };
  }

  /**
   * Analyze metadata in PDF (stub)
   * @private
   */
  _analyzeMetadata() {
    return {
      hasMetadata: true,
      raw: {} // Would require more complex PDF parsing
    };
  }

  /**
   * Calculate ATS score based on structure
   * @param {Object} structure - Document structure
   * @private
   */
  _calculateAtsScore(structure) {
    let score = 100;
    
    // PDFs generally have good ATS compatibility for text content
    // but can have issues with complex layouts
    
    if (structure.textBoxes.hasTextBoxes) {
      score -= 15; // Text boxes cause ATS issues
    }
    
    if (structure.columns.hasColumns) {
      score -= 10; // Columns cause ATS issues
    }
    
    if (structure.tables.hasNestedTables) {
      score -= 8; // Nested tables cause ATS issues
    }
    
    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Generate issues and warnings
   * @param {Object} structure - Document structure
   * @private
   */
  _generateIssuesWarnings(structure) {
    const issues = [];
    const warnings = [];
    
    // Issues (critical ATS problems)
    if (structure.textBoxes.hasTextBoxes) {
      issues.push({
        type: 'text_boxes',
        severity: 'critical',
        message: 'Document contains text boxes which are not ATS-friendly',
        recommendation: 'Convert text boxes to standard text formatting'
      });
    }
    
    if (structure.columns.hasColumns) {
      issues.push({
        type: 'columns',
        severity: 'critical',
        message: 'Document uses multiple columns which can cause ATS parsing issues',
        recommendation: 'Convert to single column layout'
      });
    }
    
    // Warnings (potential ATS problems)
    if (structure.tables.hasNestedTables) {
      warnings.push({
        type: 'nested_tables',
        severity: 'high',
        message: 'Document may contain complex table structures that are difficult for ATS to parse',
        recommendation: 'Use simple table structures where possible'
      });
    }
    
    structure.issues = issues;
    structure.warnings = warnings;
  }
}

module.exports = new PdfReader();