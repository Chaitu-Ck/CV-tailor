/**
 * ODF Reader Service
 * 
 * Reads and analyzes ODF (OpenDocument Format) files for ATS compatibility
 * ODT files are ZIP archives containing XML files similar to DOCX
 */

const AdmZip = require('adm-zip');
const logger = require('../utils/logger');

class OdfReader {
  constructor() {
    this.supportedTypes = ['odt'];
  }

  /**
   * Read and analyze ODF file
   * @param {Buffer} buffer - ODF file buffer
   * @returns {Object} Analysis result
   */
  async readOdf(buffer) {
    const startTime = Date.now();
    logger.info('📖 Starting ODF analysis...');
    
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
      logger.info(`✅ ODF analysis complete in ${duration}ms`);
      
      return {
        content,
        structure,
        atsScore,
        analyzedAt: new Date().toISOString(),
        processingTimeMs: duration
      };
    } catch (error) {
      logger.error('❌ ODF analysis failed:', error);
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
  }

  /**
   * Extract content from ODF
   * @param {Buffer} buffer - ODF buffer
   * @private
   */
  async _extractContent(buffer) {
    const zip = new AdmZip(buffer);
    
    // Get content.xml (main content)
    const contentEntry = zip.getEntry('content.xml');
    if (!contentEntry) {
      throw new Error('Invalid ODF: missing content.xml');
    }
    
    const contentXml = contentEntry.getData().toString('utf8');
    
    // Extract text content from XML
    const textContent = this._extractTextFromOdfXml(contentXml);
    
    return {
      text: textContent,
      raw: contentXml,
      wordCount: textContent.split(/\s+/).filter(word => word.length > 0).length,
      charCount: textContent.length,
      hasImages: contentXml.includes('<draw:image'),
      hasTables: contentXml.includes('<table:'),
      hasLists: contentXml.includes('<text:list')
    };
  }

  /**
   * Extract text from ODF XML content
   * @param {string} xmlContent - XML content
   * @private
   */
  _extractTextFromOdfXml(xmlContent) {
    // Simple regex to extract text content from ODF XML
    // Remove XML tags and clean up whitespace
    let text = xmlContent
      .replace(/<[^>]*>/g, ' ') // Remove all XML tags
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/&gt;/g, '>') // Decode HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .trim();
    
    return text;
  }

  /**
   * Analyze ODF structure
   * @param {AdmZip} zip - ZIP archive
   * @private
   */
  _analyzeStructure(zip) {
    const structure = {
      fonts: this._analyzeFonts(zip),
      images: this._analyzeImages(zip),
      tables: this._analyzeTables(zip),
      textBoxes: this._analyzeTextBoxes(zip),
      columns: this._analyzeColumns(zip),
      styles: this._analyzeStyles(zip),
      metadata: this._analyzeMetadata(zip)
    };

    return structure;
  }

  /**
   * Analyze fonts in ODF
   * @param {AdmZip} zip - ZIP archive
   * @private
   */
  _analyzeFonts(zip) {
    const settingsEntry = zip.getEntry('styles.xml');
    let fontSettings = '';
    
    if (settingsEntry) {
      fontSettings = settingsEntry.getData().toString('utf8');
    }
    
    const contentEntry = zip.getEntry('content.xml');
    let contentSettings = '';
    
    if (contentEntry) {
      contentSettings = contentEntry.getData().toString('utf8');
    }
    
    // Extract font information from XML
    const allSettings = fontSettings + contentSettings;
    const fontMatches = allSettings.match(/style:font-name="([^"]*)"/g) || [];
    const fonts = [...new Set(fontMatches.map(match => {
      const fontMatch = match.match(/style:font-name="([^"]*)"/);
      return fontMatch ? fontMatch[1] : null;
    }).filter(Boolean))];
    
    // Check for ATS-safe fonts
    const atsSafeFonts = [
      'Arial', 'Times New Roman', 'Calibri', 'Cambria', 'Garamond', 
      'Georgia', 'Helvetica', 'Trebuchet MS', 'Verdana'
    ];
    
    const nonSafeFonts = fonts.filter(font => !atsSafeFonts.includes(font));
    
    return {
      fonts,
      nonSafeFonts,
      isAtsSafe: nonSafeFonts.length === 0,
      count: fonts.length
    };
  }

  /**
   * Analyze images in ODF
   * @param {AdmZip} zip - ZIP archive
   * @private
   */
  _analyzeImages(zip) {
    const pics = zip.getEntries().filter(entry => 
      entry.entryName.startsWith('Pictures/') && 
      (entry.entryName.endsWith('.png') || 
       entry.entryName.endsWith('.jpg') || 
       entry.entryName.endsWith('.jpeg') ||
       entry.entryName.endsWith('.gif'))
    );
    
    return {
      count: pics.length,
      hasImages: pics.length > 0,
      paths: pics.map(pic => pic.entryName)
    };
  }

  /**
   * Analyze tables in ODF
   * @param {AdmZip} zip - ZIP archive
   * @private
   */
  _analyzeTables(zip) {
    const contentEntry = zip.getEntry('content.xml');
    if (!contentEntry) return { count: 0, hasTables: false, hasNestedTables: false };
    
    const content = contentEntry.getData().toString('utf8');
    const tableMatches = content.match(/<table:table/g) || [];
    const nestedTableMatches = content.match(/<table:table[^>]*>[\s\S]*?<table:table/g) || [];
    
    return {
      count: tableMatches.length,
      hasTables: tableMatches.length > 0,
      hasNestedTables: nestedTableMatches.length > 0
    };
  }

  /**
   * Analyze text boxes in ODF
   * @param {AdmZip} zip - ZIP archive
   * @private
   */
  _analyzeTextBoxes(zip) {
    const contentEntry = zip.getEntry('content.xml');
    if (!contentEntry) return { hasTextBoxes: false, count: 0 };
    
    const content = contentEntry.getData().toString('utf8');
    const textBoxMatches = content.match(/<draw:frame[^>]*text-box[^>]*>/g) || [];
    
    return {
      count: textBoxMatches.length,
      hasTextBoxes: textBoxMatches.length > 0
    };
  }

  /**
   * Analyze columns in ODF
   * @param {AdmZip} zip - ZIP archive
   * @private
   */
  _analyzeColumns(zip) {
    const contentEntry = zip.getEntry('content.xml');
    if (!contentEntry) return { hasColumns: false };
    
    const content = contentEntry.getData().toString('utf8');
    const columnMatches = content.match(/style:column-count/g) || [];
    
    return {
      hasColumns: columnMatches.length > 0,
      count: columnMatches.length
    };
  }

  /**
   * Analyze styles in ODF
   * @param {AdmZip} zip - ZIP archive
   * @private
   */
  _analyzeStyles(zip) {
    const stylesEntry = zip.getEntry('styles.xml');
    if (!stylesEntry) return { count: 0, hasComplexStyles: false };
    
    const styles = stylesEntry.getData().toString('utf8');
    
    // Look for complex formatting that might cause ATS issues
    const complexStyleMatches = styles.match(/style:shadow|style:text-line-through|style:text-outline|style:text-overline/g) || [];
    
    return {
      count: (styles.match(/style:style/g) || []).length,
      hasComplexStyles: complexStyleMatches.length > 0,
      complexStyleTypes: [...new Set(complexStyleMatches)]
    };
  }

  /**
   * Analyze metadata in ODF
   * @param {AdmZip} zip - ZIP archive
   * @private
   */
  _analyzeMetadata(zip) {
    const metaEntry = zip.getEntry('meta.xml');
    if (!metaEntry) return { hasMetadata: false };
    
    const meta = metaEntry.getData().toString('utf8');
    
    return {
      hasMetadata: true,
      raw: meta
    };
  }

  /**
   * Calculate ATS score based on structure
   * @param {Object} structure - Document structure
   * @private
   */
  _calculateAtsScore(structure) {
    let score = 100;
    
    // Deduct points for ATS issues
    if (structure.fonts.nonSafeFonts.length > 0) {
      score -= structure.fonts.nonSafeFonts.length * 10; // 10 points per non-ATS-safe font
    }
    
    if (structure.images.count > 0) {
      score -= 5; // Images can cause ATS issues
    }
    
    if (structure.textBoxes.hasTextBoxes) {
      score -= 15; // Text boxes cause major ATS issues
    }
    
    if (structure.columns.hasColumns) {
      score -= 10; // Columns cause ATS issues
    }
    
    if (structure.tables.hasNestedTables) {
      score -= 8; // Nested tables cause ATS issues
    }
    
    if (structure.styles.hasComplexStyles) {
      score -= 5; // Complex styles cause ATS issues
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
        recommendation: 'Remove all text boxes and use standard text formatting instead'
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
    
    if (structure.tables.hasNestedTables) {
      issues.push({
        type: 'nested_tables',
        severity: 'high',
        message: 'Document contains nested tables which are difficult for ATS to parse',
        recommendation: 'Simplify table structure by removing nested tables'
      });
    }
    
    // Warnings (potential ATS problems)
    if (structure.fonts.nonSafeFonts.length > 0) {
      warnings.push({
        type: 'unsafe_fonts',
        severity: 'medium',
        message: `Document uses non-ATS-safe fonts: ${structure.fonts.nonSafeFonts.join(', ')}`,
        recommendation: 'Use ATS-safe fonts like Arial, Times New Roman, or Calibri'
      });
    }
    
    if (structure.images.count > 0) {
      warnings.push({
        type: 'images',
        severity: 'medium',
        message: `Document contains ${structure.images.count} image(s) which may cause ATS parsing issues`,
        recommendation: 'Consider removing images unless absolutely necessary'
      });
    }
    
    if (structure.styles.hasComplexStyles) {
      warnings.push({
        type: 'complex_styles',
        severity: 'low',
        message: 'Document contains complex formatting that may affect ATS parsing',
        recommendation: 'Use simple, consistent formatting throughout the document'
      });
    }
    
    structure.issues = issues;
    structure.warnings = warnings;
  }
}

module.exports = new OdfReader();