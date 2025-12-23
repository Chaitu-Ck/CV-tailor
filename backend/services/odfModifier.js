/**
 * ODF Modifier Service
 * 
 * Modifies ODF files to fix ATS compatibility issues
 */

const AdmZip = require('adm-zip');
const logger = require('../utils/logger');

class OdfModifierError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'OdfModifierError';
    this.code = code;
    this.details = details;
  }
}

class OdfModifier {
  constructor() {
    this.supportedTypes = ['odt'];
  }

  /**
   * Fix ATS issues in ODF file
   * @param {Buffer} buffer - Original ODF buffer
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

    logger.info('🔧 Starting ODF modifications...');
    const startTime = Date.now();

    try {
      let modifiedBuffer = buffer;
      const modifications = [];

      // 1. Fix fonts (highest priority)
      if (fixFonts && structure.fonts && !structure.fonts.isAtsSafe) {
        modifiedBuffer = await this._fixFonts(modifiedBuffer, structure.fonts.nonSafeFonts);
        modifications.push('fonts_fixed');
      }

      // 2. Remove text boxes (CRITICAL)
      if (removeTextBoxes && structure.textBoxes && structure.textBoxes.hasTextBoxes) {
        modifiedBuffer = await this._removeTextBoxes(modifiedBuffer);
        modifications.push('textboxes_removed');
      }

      // 3. Convert columns to single column
      if (convertColumns && structure.columns && structure.columns.hasColumns) {
        modifiedBuffer = await this._convertColumns(modifiedBuffer);
        modifications.push('columns_converted');
      }

      // 4. Simplify tables
      if (simplifyTables && structure.tables && structure.tables.hasNestedTables) {
        modifiedBuffer = await this._simplifyTables(modifiedBuffer);
        modifications.push('tables_simplified');
      }

      const duration = Date.now() - startTime;
      logger.info(`✅ ODF modified in ${duration}ms. Changes: ${modifications.join(', ')}`);

      return {
        buffer: modifiedBuffer,
        modifications,
        processingTimeMs: duration,
        modifiedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('❌ ODF modification failed:', error);
      throw new OdfModifierError(
        `Modification failed: ${error.message}`,
        'MODIFICATION_FAILED',
        { originalError: error.message }
      );
    }
  }

  /**
   * Fix fonts in ODF file
   * @param {Buffer} buffer - ODF buffer
   * @param {Array} nonSafeFonts - List of non-safe fonts to replace
   * @private
   */
  async _fixFonts(buffer, nonSafeFonts) {
    logger.info(`📝 Fixing fonts: ${nonSafeFonts.join(', ')}`);
    
    const zip = new AdmZip(buffer);
    const stylesEntry = zip.getEntry('styles.xml');
    const contentEntry = zip.getEntry('content.xml');
    
    if (stylesEntry) {
      let stylesContent = stylesEntry.getData().toString('utf8');
      
      // Replace non-ATS-safe fonts with Arial (ATS-safe)
      for (const font of nonSafeFonts) {
        // Replace in styles.xml
        stylesContent = stylesContent.replace(
          new RegExp(`style:font-name="${font}"`, 'g'),
          'style:font-name="Arial"'
        );
        
        // Replace generic font-family references
        stylesContent = stylesContent.replace(
          new RegExp(`style:font-family="${font}"`, 'g'),
          'style:font-family="Arial"'
        );
      }
      
      zip.updateFile('styles.xml', Buffer.from(stylesContent, 'utf8'));
    }
    
    if (contentEntry) {
      let contentContent = contentEntry.getData().toString('utf8');
      
      // Replace non-ATS-safe fonts in content.xml as well
      for (const font of nonSafeFonts) {
        contentContent = contentContent.replace(
          new RegExp(`style:font-name="${font}"`, 'g'),
          'style:font-name="Arial"'
        );
        
        contentContent = contentContent.replace(
          new RegExp(`style:font-family="${font}"`, 'g'),
          'style:font-family="Arial"'
        );
      }
      
      zip.updateFile('content.xml', Buffer.from(contentContent, 'utf8'));
    }
    
    return zip.toBuffer();
  }

  /**
   * Remove text boxes from ODF file
   * @param {Buffer} buffer - ODF buffer
   * @private
   */
  async _removeTextBoxes(buffer) {
    logger.info('📝 Removing text boxes');
    
    const zip = new AdmZip(buffer);
    const contentEntry = zip.getEntry('content.xml');
    
    if (contentEntry) {
      let contentContent = contentEntry.getData().toString('utf8');
      
      // Remove text box elements (draw:frame with text-box attribute)
      const textBoxRegex = /<draw:frame[^>]*text-box[^>]*>[\s\S]*?<\/draw:frame>/g;
      const textBoxMatches = contentContent.match(textBoxRegex) || [];
      
      if (textBoxMatches.length > 0) {
        // Extract text content from text boxes and preserve it
        let updatedContent = contentContent;
        
        for (const textBox of textBoxMatches) {
          // Extract text content from the text box
          const textMatches = textBox.match(/<text:p[^>]*>(.*?)<\/text:p>/g) || [];
          const textContent = textMatches
            .map(text => text.replace(/<[^>]*>/g, '').trim())
            .filter(text => text.length > 0)
            .join(' ');
          
          // Replace the entire text box with its extracted text content
          if (textContent) {
            updatedContent = updatedContent.replace(textBox, `<text:p text:style-name="Standard">${textContent}</text:p>`);
          } else {
            updatedContent = updatedContent.replace(textBox, '');
          }
        }
        
        zip.updateFile('content.xml', Buffer.from(updatedContent, 'utf8'));
      }
    }
    
    return zip.toBuffer();
  }

  /**
   * Convert columns to single column in ODF file
   * @param {Buffer} buffer - ODF buffer
   * @private
   */
  async _convertColumns(buffer) {
    logger.info('📝 Converting to single column');
    
    const zip = new AdmZip(buffer);
    const stylesEntry = zip.getEntry('styles.xml');
    
    if (stylesEntry) {
      let stylesContent = stylesEntry.getData().toString('utf8');
      
      // Remove column-related style properties
      stylesContent = stylesContent.replace(
        /<style:columns[^>]*>[\s\S]*?<\/style:columns>/g,
        '<style:columns fo:column-count="1"/>'
      );
      
      // Remove column count attributes
      stylesContent = stylesContent.replace(
        /fo:column-count="[^"]*"/g,
        'fo:column-count="1"'
      );
      
      zip.updateFile('styles.xml', Buffer.from(stylesContent, 'utf8'));
    }
    
    return zip.toBuffer();
  }

  /**
   * Simplify tables in ODF file
   * @param {Buffer} buffer - ODF buffer
   * @private
   */
  async _simplifyTables(buffer) {
    logger.info('📝 Simplifying tables');
    
    const zip = new AdmZip(buffer);
    const contentEntry = zip.getEntry('content.xml');
    
    if (contentEntry) {
      let contentContent = contentEntry.getData().toString('utf8');
      
      // Replace nested tables with flattened content
      // This is a simplified approach - in reality, nested tables would need more complex handling
      let updatedContent = contentContent;
      
      // Find nested table patterns and flatten them
      const nestedTableRegex = /(<table:table[^>]*>)([\s\S]*?)(<table:table[^>]*>[\s\S]*?<\/table:table>)([\s\S]*?)(<\/table:table>)/g;
      
      while (nestedTableRegex.test(updatedContent)) {
        updatedContent = updatedContent.replace(nestedTableRegex, (match, openTable, beforeNested, nestedTable, afterNested, closeTable) => {
          // Extract content from nested table and insert as regular content
          const nestedContent = nestedTable
            .replace(/<table:table[^>]*>/g, '')
            .replace(/<\/table:table>/g, '')
            .replace(/<table:table-row>/g, '')
            .replace(/<\/table:table-row>/g, '')
            .replace(/<table:table-cell>/g, '')
            .replace(/<\/table:table-cell>/g, '')
            .replace(/<text:p[^>]*>/g, '')
            .replace(/<\/text:p>/g, ' ')
            .trim();
          
          return `${openTable}${beforeNested}${nestedContent}${afterNested}${closeTable}`;
        });
      }
      
      zip.updateFile('content.xml', Buffer.from(updatedContent, 'utf8'));
    }
    
    return zip.toBuffer();
  }
}

module.exports = new OdfModifier();