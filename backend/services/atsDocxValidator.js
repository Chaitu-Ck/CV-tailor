/**
 * ATS DOCX Validator
 * Validates DOCX files for ATS compatibility WITHOUT text conversion
 * Checks structure, formatting, fonts, and layout
 */

const docxParser = require('./docxParser');
const atsService = require('./atsService');
const logger = require('../utils/logger');
const atsColorCode = require('../utils/atsColorCode');

class AtsDocxValidator {
  /**
   * Validate DOCX file for ATS compatibility
   * @param {Buffer} buffer - DOCX file buffer
   * @param {string} jobDescription - Job description text
   * @returns {Promise<Object>} Validation result with ATS score
   */
  async validateDocx(buffer, jobDescription) {
    try {
      logger.info('🔍 Starting DOCX ATS validation');

      // Step 1: Parse DOCX (text + structure)
      const parsed = await docxParser.parseDocx(buffer);

      // Step 2: Structure validation score (0-100)
      const structureScore = this._calculateStructureScore(parsed.structure);

      // Step 3: Content ATS score (existing algorithm)
      const contentAts = await atsService.computeATS(
        parsed.text, 
        jobDescription
      );

      // Step 4: Combined score (70% content, 30% structure)
      const finalAtsScore = Math.round(
        (contentAts.finalATS * 0.7) + (structureScore.score * 0.3)
      );

      // Step 5: Generate comprehensive report
      const result = {
        success: true,
        finalAtsScore,
        color: atsColorCode.getColor(finalAtsScore),
        colorName: atsColorCode.getColorName(finalAtsScore),
        breakdown: {
          contentScore: {
            score: contentAts.finalATS,
            weight: '70%',
            details: {
              keywordScore: contentAts.keywordScore,
              skillScore: contentAts.skillScore?.percent || 0,
              tfidfScore: contentAts.tfidfScore,
              embeddingScore: contentAts.embeddingScore
            }
          },
          structureScore: {
            score: structureScore.score,
            weight: '30%',
            details: structureScore.details
          }
        },
        compatibility: {
          isAtsCompatible: parsed.structure.isAtsCompatible,
          criticalIssues: parsed.structure.issues,
          warnings: [
            ...parsed.structure.warnings,
            ...parsed.textWarnings.map(w => w.message)
          ]
        },
        recommendations: this._generateRecommendations(
          parsed.structure,
          structureScore,
          contentAts
        ),
        extractedText: parsed.text.substring(0, 500) + '...', // Preview
        metadata: {
          fileSize: buffer.length,
          hasImages: parsed.structure.structure.hasImages || false,
          hasTables: parsed.structure.structure.hasTables || false,
          hasColumns: parsed.structure.structure.hasColumns || false,
          usesHeadingStyles: parsed.structure.structure.usesHeadingStyles || false
        }
      };

      logger.info(`✅ DOCX ATS Score: ${finalAtsScore}/100`);
      return result;

    } catch (error) {
      logger.error('❌ DOCX validation failed:', error);
      throw new Error(`DOCX ATS validation failed: ${error.message}`);
    }
  }

  /**
   * Calculate structure score based on ATS compatibility factors
   * @private
   */
  _calculateStructureScore(structure) {
    let score = 100;
    const details = {};

    // Critical issues (-30 points each)
    if (!structure.isAtsCompatible) {
      score -= 30 * structure.issues.length;
      details.criticalIssues = structure.issues;
    }

    // Warnings (-5 points each, max -25)
    const warningPenalty = Math.min(structure.warnings.length * 5, 25);
    score -= warningPenalty;
    details.warnings = structure.warnings;

    // Bonus for good practices
    if (structure.structure.usesHeadingStyles) {
      score += 5;
      details.usesHeadingStyles = true;
    }

    // Penalties for risky elements
    if (structure.structure.hasImages) score -= 5;
    if (structure.structure.hasColumns) score -= 10;
    if (structure.structure.hasTables) score -= 3;

    return {
      score: Math.max(0, Math.min(100, score)),
      details
    };
  }

  /**
   * Generate actionable recommendations
   * @private
   */
  _generateRecommendations(structure, structureScore, contentAts) {
    const recommendations = [];

    // Critical issues first
    if (structure.issues.length > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        issue: 'ATS-blocking elements detected',
        actions: structure.issues.map(issue => `Remove: ${issue}`)
      });
    }

    // Structure improvements
    if (!structure.structure.usesHeadingStyles) {
      recommendations.push({
        priority: 'HIGH',
        issue: 'Missing heading styles',
        action: 'Use Word built-in styles: Heading 1, Heading 2 for section titles'
      });
    }

    if (structure.structure.hasImages) {
      recommendations.push({
        priority: 'MEDIUM',
        issue: 'Images detected',
        action: 'Remove images or ensure all text is also written in plain text'
      });
    }

    if (structure.structure.hasColumns) {
      recommendations.push({
        priority: 'HIGH',
        issue: 'Multi-column layout detected',
        action: 'Convert to single-column layout for better ATS parsing'
      });
    }

    // Content improvements from existing ATS service
    if (contentAts.missingKeywords?.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        issue: 'Missing important keywords',
        action: `Add keywords: ${contentAts.missingKeywords.slice(0, 5).join(', ')}`
      });
    }

    if (contentAts.skillScore?.missingSkills?.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        issue: 'Missing required skills',
        action: `Include skills: ${contentAts.skillScore.missingSkills.slice(0, 5).join(', ')}`
      });
    }

    // Font warnings
    const fontWarnings = structure.warnings.filter(w => w.includes('font'));
    if (fontWarnings.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        issue: 'Non-standard fonts',
        action: 'Use ATS-safe fonts: Arial, Calibri, Times New Roman, or Helvetica'
      });
    }

    return recommendations;
  }

  /**
   * Quick validation (structure only, no content analysis)
   * Faster for initial file check
   */
  async quickValidate(buffer) {
    const parsed = await docxParser.parseDocx(buffer);
    const structureScore = this._calculateStructureScore(parsed.structure);

    return {
      isValid: parsed.structure.isAtsCompatible,
      structureScore: structureScore.score,
      issues: parsed.structure.issues,
      warnings: parsed.structure.warnings,
      metadata: {
        hasImages: parsed.structure.structure.hasImages,
        hasTables: parsed.structure.structure.hasTables,
        hasColumns: parsed.structure.structure.hasColumns
      }
    };
  }
}

module.exports = new AtsDocxValidator();