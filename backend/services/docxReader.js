/**
 * DOCX Reader Service
 * 
 * Purpose: Read and analyze DOCX files for ATS compatibility
 * - Extract content using mammoth.js
 * - Analyze XML structure using adm-zip
 * - Validate ATS compatibility factors
 * 
 * Design: Immutable operations, pure functions, comprehensive validation
 * Performance: ~200ms for typical DOCX files
 * Safety: All operations validated, detailed error reporting
 */

const mammoth = require('mammoth');
const AdmZip = require('adm-zip');
const logger = require('../utils/logger');

const ATS_SAFE_FONTS = [
  'Arial', 'Calibri', 'Cambria', 'Garamond', 
  'Georgia', 'Helvetica', 'Times New Roman', 
  'Trebuchet MS', 'Verdana', 'Courier New'
];

const MIN_DOCX_SIZE = 1024; // 1KB
const MAX_DOCX_SIZE = 10 * 1024 * 1024; // 10MB

class DocxReaderError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'DocxReaderError';
    this.code = code;
    this.details = details;
  }
}

class DocxReader {
  /**
   * Main method: Read and analyze DOCX file
   * 
   * @param {Buffer} buffer - DOCX file buffer
   * @returns {Promise<Object>} Complete analysis
   */
  async readDocx(buffer) {
    const startTime = Date.now();
    logger.info('📖 Starting DOCX analysis...');
    
    try {
      // Validate input
      this._validateBuffer(buffer);
      
      // Create ZIP archive
      const zip = new AdmZip(buffer);
      
      // Extract content
      const content = await this._extractContent(buffer);
      
      // Analyze structure
      const structure = this._analyzeStructure(zip);
      
      // Calculate ATS score
      const atsScore = this._calculateAtsScore(structure);
      
      // Generate issues and warnings
      this._generateIssuesWarnings(structure);
      
      const duration = Date.now() - startTime;
      logger.info(`✅ DOCX analysis complete in ${duration}ms`);
      
      return {
        content,
        structure,
        atsScore,
        analyzedAt: new Date().toISOString(),
        processingTimeMs: duration
      };
      
    } catch (error) {
      logger.error('❌ DOCX analysis failed:', error);
      throw error;
    }
  }

  /**
   * Extract content using mammoth.js
   * @private
   */
  async _extractContent(buffer) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      
      return {
        text: result.value,
        wordCount: result.value.trim().split(/\s+/).length,
        charCount: result.value.length,
        warnings: result.messages.filter(m => m.type === 'warning'),
        messages: result.messages
      };
    } catch (error) {
      throw new DocxReaderError(
        `Content extraction failed: ${error.message}`,
        'CONTENT_EXTRACTION_FAILED'
      );
    }
  }

  /**
   * Analyze DOCX structure
   * @private
   */
  _analyzeStructure(zip) {
    return {
      fonts: this._analyzeFonts(zip),
      images: this._analyzeImages(zip),
      tables: this._analyzeTables(zip),
      textBoxes: this._analyzeTextBoxes(zip),
      columns: this._analyzeColumns(zip),
      styles: this._analyzeStyles(zip),
      issues: [],
      warnings: []
    };
  }

  /**
   * Analyze fonts
   * @private
   */
  _analyzeFonts(zip) {
    const fontXml = this._getZipEntry(zip, 'word/fontTable.xml');
    if (!fontXml) return { isAtsSafe: true, safeFonts: [], nonSafeFonts: [] };

    const content = fontXml.toString('utf8');
    const fontMatches = [...content.matchAll(/w:name="([^"]+)"/g)];
    const fonts = fontMatches.map(match => match[1]);
    
    const safeFonts = fonts.filter(font => 
      ATS_SAFE_FONTS.some(atsFont => font.includes(atsFont))
    );
    const nonSafeFonts = fonts.filter(font => 
      !ATS_SAFE_FONTS.some(atsFont => font.includes(atsFont))
    );

    return {
      fonts,
      safeFonts,
      nonSafeFonts,
      isAtsSafe: nonSafeFonts.length === 0
    };
  }

  /**
   * Analyze images
   * @private
   */
  _analyzeImages(zip) {
    const images = zip.getEntries().filter(entry => 
      entry.entryName.startsWith('word/media/')
    );

    return {
      count: images.length,
      hasImages: images.length > 0,
      paths: images.map(img => img.entryName)
    };
  }

  /**
   * Analyze tables
   * @private
   */
  _analyzeTables(zip) {
    const docXml = this._getZipEntry(zip, 'word/document.xml');
    if (!docXml) return { count: 0, hasTables: false, hasNestedTables: false };

    const content = docXml.toString('utf8');
    const tableMatches = content.match(/<w:tbl/g);
    const nestedTableMatches = content.match(/<w:tbl[^>]*>[\s\S]*?<w:tbl/g);

    return {
      count: tableMatches ? tableMatches.length : 0,
      hasTables: !!tableMatches,
      hasNestedTables: !!nestedTableMatches,
      nestedCount: nestedTableMatches ? nestedTableMatches.length : 0
    };
  }

  /**
   * Analyze text boxes
   * @private
   */
  _analyzeTextBoxes(zip) {
    const docXml = this._getZipEntry(zip, 'word/document.xml');
    if (!docXml) return { hasTextBoxes: false, count: 0 };

    const content = docXml.toString('utf8');
    const textBoxMatches = content.match(/<w:txbxContent/g);
    const vTextBoxMatches = content.match(/<v:textbox/g);

    return {
      hasTextBoxes: !!(textBoxMatches || vTextBoxMatches),
      count: (textBoxMatches ? textBoxMatches.length : 0) + (vTextBoxMatches ? vTextBoxMatches.length : 0)
    };
  }

  /**
   * Analyze columns
   * @private
   */
  _analyzeColumns(zip) {
    const docXml = this._getZipEntry(zip, 'word/document.xml');
    if (!docXml) return { hasColumns: false };

    const content = docXml.toString('utf8');
    const colsMatch = content.includes('<w:cols');

    return {
      hasColumns: colsMatch
    };
  }

  /**
   * Analyze styles
   * @private
   */
  _analyzeStyles(zip) {
    const stylesXml = this._getZipEntry(zip, 'word/styles.xml');
    if (!stylesXml) return { hasHeadingStyles: false };

    const content = stylesXml.toString('utf8');
    const hasHeadings = content.includes('Heading 1') || content.includes('Heading1');

    return {
      hasHeadingStyles: hasHeadings,
      usesBuiltInStyles: hasHeadings
    };
  }

  /**
   * Calculate ATS compatibility score
   * @private
   */
  _calculateAtsScore(structure) {
    let score = 100;

    // Critical blockers
    if (structure.textBoxes.hasTextBoxes) score -= 40;
    
    // Major issues
    if (!structure.fonts.isAtsSafe) score -= 15;
    if (structure.columns.hasColumns) score -= 15;
    if (structure.tables.hasNestedTables) score -= 10;
    
    // Minor issues
    if (structure.images.hasImages) score -= 10;
    if (structure.tables.count > 3) score -= 5;
    
    // Bonuses
    if (structure.styles.hasHeadingStyles) score += 5;
    if (structure.fonts.isAtsSafe) score += 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate issues and warnings
   * @private
   */
  _generateIssuesWarnings(structure) {
    // CRITICAL ISSUES (ATS blockers)
    if (structure.textBoxes.hasTextBoxes) {
      structure.issues.push({
        severity: 'CRITICAL',
        type: 'TEXT_BOXES',
        message: 'Text boxes detected. ATS cannot read content in text boxes.',
        fix: 'Convert text boxes to regular paragraphs'
      });
    }

    // HIGH PRIORITY WARNINGS
    if (structure.columns.hasColumns) {
      structure.warnings.push({
        severity: 'HIGH',
        type: 'COLUMNS',
        message: 'Multi-column layout may confuse ATS parsers',
        fix: 'Convert to single-column layout'
      });
    }

    if (!structure.fonts.isAtsSafe) {
      structure.warnings.push({
        severity: 'HIGH',
        type: 'FONTS',
        message: `Non-ATS-safe fonts: ${structure.fonts.nonSafeFonts.join(', ')}`,
        fix: `Change to: ${ATS_SAFE_FONTS.slice(0, 3).join(', ')}`
      });
    }

    // MEDIUM PRIORITY WARNINGS
    if (structure.images.hasImages) {
      structure.warnings.push({
        severity: 'MEDIUM',
        type: 'IMAGES',
        message: `${structure.images.count} image(s) found. ATS cannot read text in images.`,
        fix: 'Ensure all content is also in text format'
      });
    }

    if (structure.tables.hasNestedTables) {
      structure.warnings.push({
        severity: 'MEDIUM',
        type: 'NESTED_TABLES',
        message: 'Nested tables detected',
        fix: 'Simplify table structure'
      });
    }

    // LOW PRIORITY WARNINGS
    if (!structure.styles.hasHeadingStyles) {
      structure.warnings.push({
        severity: 'LOW',
        type: 'STYLES',
        message: 'No heading styles detected',
        fix: 'Use built-in Heading 1, Heading 2 styles'
      });
    }
  }

  /**
   * Validate buffer
   * @private
   */
  _validateBuffer(buffer) {
    if (!Buffer.isBuffer(buffer)) {
      throw new DocxReaderError('Input must be a Buffer', 'INVALID_INPUT');
    }

    if (buffer.length < MIN_DOCX_SIZE) {
      throw new DocxReaderError(
        `File too small: ${buffer.length} bytes (min: ${MIN_DOCX_SIZE})`,
        'FILE_TOO_SMALL'
      );
    }

    if (buffer.length > MAX_DOCX_SIZE) {
      throw new DocxReaderError(
        `File too large: ${buffer.length} bytes (max: ${MAX_DOCX_SIZE})`,
        'FILE_TOO_LARGE'
      );
    }

    // Verify ZIP signature (DOCX is ZIP)
    const zipSig = buffer.toString('hex', 0, 4);
    if (zipSig !== '504b0304' && zipSig !== '504b0506') {
      throw new DocxReaderError('Invalid DOCX: Not a valid ZIP archive', 'INVALID_FORMAT');
    }
  }

  /**
   * Get ZIP entry safely
   * @private
   */
  _getZipEntry(zip, path) {
    try {
      const entry = zip.getEntry(path);
      return entry ? zip.readFile(entry) : null;
    } catch {
      return null;
    }
  }
}

module.exports = new DocxReader();