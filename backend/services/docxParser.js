/**
 * DOCX Parser Service
 * Extracts text and structure from DOCX files WITHOUT conversion
 * Uses mammoth.js for text + JSZip for XML structure analysis
 */

const mammoth = require('mammoth');
const AdmZip = require('adm-zip');
const logger = require('../utils/logger');

class DocxParser {
  /**
   * Extract text content from DOCX buffer
   * @param {Buffer} buffer - DOCX file buffer
   * @returns {Promise<{text: string, messages: Array}>}
   */
  async extractText(buffer) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return {
        text: result.value,
        messages: result.messages,
        warnings: result.messages.filter(m => m.type === 'warning')
      };
    } catch (error) {
      logger.error('Text extraction failed:', error);
      throw new Error(`DOCX text extraction failed: ${error.message}`);
    }
  }

  /**
   * Analyze DOCX XML structure for ATS compatibility
   * Checks: fonts, styles, tables, images, columns
   * @param {Buffer} buffer - DOCX file buffer
   * @returns {Object} Structure analysis result
   */
  analyzeStructure(buffer) {
    try {
      const zip = new AdmZip(buffer);
      const analysis = {
        isAtsCompatible: true,
        issues: [],
        warnings: [],
        structure: {}
      };

      // 1. Check document.xml (main content)
      const documentXml = zip.readAsText('word/document.xml');
      if (!documentXml) {
        analysis.isAtsCompatible = false;
        analysis.issues.push('Invalid DOCX structure: document.xml missing');
        return analysis;
      }

      // 2. Check fonts (ATS-friendly: Arial, Calibri, Times New Roman)
      const fontsXml = zip.getEntry('word/fontTable.xml');
      if (fontsXml) {
        const fontsContent = zip.readAsText('word/fontTable.xml');
        const unsupportedFonts = this._checkFonts(fontsContent);
        if (unsupportedFonts.length > 0) {
          analysis.warnings.push(`Non-standard fonts detected: ${unsupportedFonts.join(', ')}`);
        }
      }

      // 3. Check for images (ATS warning)
      const images = zip.getEntries().filter(e => 
        e.entryName.startsWith('word/media/')
      );
      if (images.length > 0) {
        analysis.warnings.push(`${images.length} image(s) found - may not be parsed by ATS`);
        analysis.structure.hasImages = true;
      }

      // 4. Check for tables
      const hasTables = documentXml.includes('<w:tbl');
      if (hasTables) {
        // Check if tables are simple (ATS-friendly)
        const nestedTables = documentXml.match(/<w:tbl[^>]*>[\s\S]*?<w:tbl/g);
        if (nestedTables) {
          analysis.warnings.push('Nested tables detected - may confuse ATS parsers');
        }
        analysis.structure.hasTables = true;
      }

      // 5. Check for text boxes (ATS blocker)
      const hasTextBoxes = documentXml.includes('<w:txbxContent');
      if (hasTextBoxes) {
        analysis.isAtsCompatible = false;
        analysis.issues.push('Text boxes detected - ATS cannot parse content in text boxes');
      }

      // 6. Check for columns (ATS may struggle)
      const hasColumns = documentXml.includes('<w:cols');
      if (hasColumns) {
        analysis.warnings.push('Multi-column layout detected - some ATS may have parsing issues');
        analysis.structure.hasColumns = true;
      }

      // 7. Check for headers/footers with content
      const hasHeader = zip.getEntry('word/header1.xml') !== null;
      const hasFooter = zip.getEntry('word/footer1.xml') !== null;
      if (hasHeader || hasFooter) {
        analysis.warnings.push('Header/footer detected - content may not be indexed by ATS');
      }

      // 8. Check styles (proper heading usage)
      const stylesXml = zip.getEntry('word/styles.xml');
      if (stylesXml) {
        const stylesContent = zip.readAsText('word/styles.xml');
        const hasHeadingStyles = stylesContent.includes('Heading 1') || 
                                  stylesContent.includes('Heading1');
        if (hasHeadingStyles) {
          analysis.structure.usesHeadingStyles = true;
        } else {
          analysis.warnings.push('No heading styles detected - use built-in headings for better ATS parsing');
        }
      }

      return analysis;
    } catch (error) {
      logger.error('Structure analysis failed:', error);
      throw new Error(`DOCX structure analysis failed: ${error.message}`);
    }
  }

  /**
   * Check fonts against ATS-safe list
   * @private
   */
  _checkFonts(fontsXml) {
    const atsSafeFonts = [
      'Arial', 'Calibri', 'Cambria', 'Garamond', 
      'Georgia', 'Helvetica', 'Times New Roman', 
      'Trebuchet MS', 'Verdana'
    ];
    
    const unsupported = [];
    const fontMatches = fontsXml.matchAll(/w:name="([^"]+)"/g);
    
    for (const match of fontMatches) {
      const fontName = match[1];
      if (!atsSafeFonts.some(safe => fontName.includes(safe))) {
        unsupported.push(fontName);
      }
    }
    
    return [...new Set(unsupported)]; // Remove duplicates
  }

  /**
   * Complete DOCX analysis (text + structure)
   * @param {Buffer} buffer - DOCX file buffer
   * @returns {Promise<Object>}
   */
  async parseDocx(buffer) {
    const [textResult, structureResult] = await Promise.all([
      this.extractText(buffer),
      Promise.resolve(this.analyzeStructure(buffer))
    ]);

    return {
      text: textResult.text,
      textWarnings: textResult.warnings,
      structure: structureResult,
      extractedAt: new Date().toISOString()
    };
  }
}

module.exports = new DocxParser();