/**
 * CV Routes - DOCX-ONLY
 * 
 * All text-based endpoints removed
 * Pure DOCX workflow
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const { upload, validateDocx, handleUploadError } = require('../middleware/uploadMiddleware');
const docxAtsService = require('../services/docxAtsService');
const docxModifier = require('../services/docxModifier');
const docxReader = require('../services/docxReader');
const logger = require('../utils/logger');

/**
 * POST /api/cv/analyze-docx
 * Analyze DOCX for ATS compatibility (no modifications)
 * 
 * Body: multipart/form-data
 * - cvFile: DOCX file
 * - jobDescription: text
 */
router.post(
  '/analyze-docx',
  upload.single('cvFile'),
  handleUploadError,
  validateDocx,
  async (req, res) => {
    const startTime = Date.now();

    try {
      const { jobDescription } = req.body;

      // Validate job description
      if (!jobDescription || jobDescription.trim().length < 50) {
        return res.status(400).json({
          error: 'Invalid job description',
          message: 'Job description must be at least 50 characters'
        });
      }

      // Analyze DOCX
      const result = await docxAtsService.validateDocxAts(
        req.file.buffer,
        jobDescription
      );

      res.json({
        ...result,
        file: {
          originalName: req.file.originalname,
          size: req.file.size
        },
        totalProcessingMs: Date.now() - startTime
      });

    } catch (error) {
      logger.error('DOCX analysis failed:', error);
      res.status(500).json({
        error: 'Analysis failed',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/cv/fix-docx-ats
 * Fix ATS issues in DOCX and return modified file
 * 
 * Body: multipart/form-data
 * - cvFile: DOCX file
 * - fixOptions: JSON string (optional)
 */
router.post(
  '/fix-docx-ats',
  upload.single('cvFile'),
  handleUploadError,
  validateDocx,
  async (req, res) => {
    try {
      // Parse fix options
      const fixOptions = req.body.fixOptions ? 
        JSON.parse(req.body.fixOptions) : {};

      // Read DOCX to get structure
      const docxData = await docxReader.readDocx(req.file.buffer);

      // Fix ATS issues
      const fixed = await docxModifier.fixAtsIssues(
        req.file.buffer,
        docxData.structure,
        fixOptions
      );

      // Generate filename
      const originalName = path.parse(req.file.originalname).name;
      const modifiedFilename = `${originalName}_ATS_Fixed.docx`;

      // Set headers for file download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${modifiedFilename}"`);
      res.setHeader('X-Modifications', JSON.stringify(fixed.modifications));
      res.setHeader('X-Processing-Time', fixed.processingTimeMs);

      // Send modified DOCX
      res.send(fixed.buffer);

      logger.info(`✅ DOCX fixed and sent: ${modifiedFilename}`);

    } catch (error) {
      logger.error('DOCX fix failed:', error);
      res.status(500).json({
        error: 'Fix failed',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/cv/optimize-docx
 * Analyze + Fix + AI Optimization (complete workflow)
 * 
 * Body: multipart/form-data
 * - cvFile: DOCX file
 * - jobDescription: text
 */
router.post(
  '/optimize-docx',
  upload.single('cvFile'),
  handleUploadError,
  validateDocx,
  async (req, res) => {
    const startTime = Date.now();

    try {
      const { jobDescription } = req.body;

      if (!jobDescription || jobDescription.trim().length < 50) {
        return res.status(400).json({
          error: 'Invalid job description',
          message: 'Job description must be at least 50 characters'
        });
      }

      // Step 1: Analyze
      const analysis = await docxAtsService.validateDocxAts(
        req.file.buffer,
        jobDescription
      );

      // Step 2: Fix structure issues
      const docxData = await docxReader.readDocx(req.file.buffer);
      const fixed = await docxModifier.fixAtsIssues(
        req.file.buffer,
        docxData.structure
      );

      // Step 3: Re-analyze to confirm improvements
      const reanalysis = await docxAtsService.validateDocxAts(
        fixed.buffer,
        jobDescription
      );

      // Generate filename
      const originalName = path.parse(req.file.originalname).name;
      const optimizedFilename = `${originalName}_ATS_Optimized.docx`;

      // Return both analysis and file
      res.json({
        success: true,
        analysis: {
          before: {
            score: analysis.finalScore,
            issues: analysis.breakdown.structure.issues.length,
            warnings: analysis.breakdown.structure.warnings.length
          },
          after: {
            score: reanalysis.finalScore,
            issues: reanalysis.breakdown.structure.issues.length,
            warnings: reanalysis.breakdown.structure.warnings.length
          },
          improvement: reanalysis.finalScore - analysis.finalScore
        },
        modifications: fixed.modifications,
        recommendations: reanalysis.recommendations,
        download: {
          filename: optimizedFilename,
          url: `/api/cv/download/${req.file.originalname}` // Implement download endpoint
        },
        processingTimeMs: Date.now() - startTime
      });

    } catch (error) {
      logger.error('DOCX optimization failed:', error);
      res.status(500).json({
        error: 'Optimization failed',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/cv/health
 * Health check
 */
router.get('/health', (req, res) => {
  res.json({
    service: 'CV Tailor DOCX Service',
    status: 'healthy',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
