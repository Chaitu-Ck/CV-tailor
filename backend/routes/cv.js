/**
 * CV Routes - Universal Document Support
 * 
 * Support for DOCX, ODF, and PDF files
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const { upload, validateDocx, handleUploadError } = require('../middleware/uploadMiddleware');
const docxAtsService = require('../services/docxAtsService');
const universalAtsService = require('../services/universalAtsService');
const logger = require('../utils/logger');

/**
 * POST /api/cv/analyze-docx
 * Analyze document for ATS compatibility (no modifications)
 * 
 * Body: multipart/form-data
 * - cvFile: DOCX, ODT, or PDF file
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

      // Analyze document using universal service
      const result = await universalAtsService.validateDocumentAts(
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
      logger.error('Document analysis failed:', error);
      res.status(500).json({
        error: 'Analysis failed',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/cv/fix-docx-ats
 * Fix ATS issues in document and return modified file
 * 
 * Body: multipart/form-data
 * - cvFile: DOCX, ODT, or PDF file
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

      // Determine file type using universal service
      const fileType = await universalAtsService.getFileType(req.file.buffer);
      
      // Use universal service to fix ATS issues
      const docData = await universalAtsService.validateDocumentAts(req.file.buffer, req.body.jobDescription || '');
      
      // Fix ATS issues using universal service
      const fixed = await universalAtsService.fixDocumentAtsIssues(
        req.file.buffer,
        docData.structure,
        fileType,
        fixOptions
      );

      // Generate filename
      const originalName = path.parse(req.file.originalname).name;
      const fileExtension = req.file.originalname.split('.').pop().toLowerCase();
      const modifiedFilename = `${originalName}_ATS_Fixed.${fileExtension}`;

      // Set headers for file download
      let contentType = 'application/octet-stream';
      if (fileExtension === 'docx') {
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      } else if (fileExtension === 'odt') {
        contentType = 'application/vnd.oasis.opendocument.text';
      } else if (fileExtension === 'pdf') {
        contentType = 'application/pdf';
      }
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${modifiedFilename}"`);
      res.setHeader('X-Modifications', JSON.stringify(fixed.modifications));
      res.setHeader('X-Processing-Time', fixed.processingTimeMs);

      // Send modified document
      res.send(fixed.buffer);

      logger.info(`✅ Document fixed and sent: ${modifiedFilename}`);

    } catch (error) {
      logger.error('Document fix failed:', error);
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
 * - cvFile: DOCX, ODT, or PDF file
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

      // Use universal service to optimize document
      const result = await universalAtsService.optimizeDocument(
        req.file.buffer,
        jobDescription
      );

      // Generate filename
      const originalName = path.parse(req.file.originalname).name;
      const fileExtension = req.file.originalname.split('.').pop().toLowerCase();
      const optimizedFilename = `${originalName}_ATS_Optimized.${fileExtension}`;

      // Return analysis and file info
      res.json({
        success: true,
        analysis: result.analysis,
        modifications: result.modifications,
        recommendations: result.recommendations,
        download: {
          filename: optimizedFilename,
          url: `/api/cv/download/${req.file.originalname}` // Implement download endpoint
        },
        processingTimeMs: Date.now() - startTime
      });

    } catch (error) {
      logger.error('Document optimization failed:', error);
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
    service: 'CV Tailor Universal Service',
    status: 'healthy',
    version: '2.0.0',
    supportedFormats: ['docx', 'odt', 'pdf'],
    timestamp: new Date().toISOString()
  });
});

module.exports = router;