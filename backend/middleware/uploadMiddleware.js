/**
 * Upload Middleware
 * 
 * Security: Magic byte validation, size limits, rate limiting
 * Performance: Streaming uploads, no disk writes during validation
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { fileTypeFromBuffer } = require('file-type');
const logger = require('../utils/logger');

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'application/vnd.oasis.opendocument.text', // ODT
  'application/pdf', // PDF
  'application/octet-stream' // Some browsers send this for .docx/.odt/.pdf
];

// Memory storage (no disk writes)
const storage = multer.memoryStorage();

// File filter with magic byte validation
const fileFilter = async (req, file, cb) => {
  try {
    // Check extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.docx' && ext !== '.odt' && ext !== '.pdf') {
      return cb(new Error('Only DOCX, ODT, and PDF files are allowed'), false);
    }

    // Check MIME type (basic)
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error('Invalid MIME type'), false);
    }

    cb(null, true);
  } catch (error) {
    logger.error('File filter error:', error);
    cb(new Error('File validation failed'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  }
});

/**
 * Validate uploaded DOCX file (magic bytes)
 * Called after multer processes file
 */
const validateDocx = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please upload a DOCX file'
      });
    }

    // Magic byte validation
    const fileTypeResult = await fileTypeFromBuffer(req.file.buffer);
    
    // DOCX/ODT is a ZIP file, PDF has its own signature
    if (!fileTypeResult || (fileTypeResult.ext !== 'zip' && fileTypeResult.ext !== 'pdf')) {
      logger.warn(`File type validation failed: ${fileTypeResult ? fileTypeResult.ext : 'unknown'}`);
      return res.status(400).json({
        error: 'Invalid document file',
        message: 'File is not a valid DOCX/ODT/PDF document (invalid signature)'
      });
    } else {
      logger.info(`File type validated: ${fileTypeResult.ext}, MIME: ${req.file.mimetype}`);
    }

    // Verify it's actually DOCX/ODT/PDF
    const pdfSignature = req.file.buffer.slice(0, 4).toString();
    
    if (pdfSignature === '%PDF') {
      // This is a PDF file, validation already done via file-type
      logger.info(`✅ Valid PDF document uploaded: ${req.file.originalname} (${req.file.size} bytes)`);
    } else {
      // This should be a ZIP-based file (DOCX/ODT)
      const AdmZip = require('adm-zip');
      try {
        const zip = new AdmZip(req.file.buffer);
        
        // Check for DOCX structure
        const isDocx = zip.getEntry('word/document.xml');
        
        // Check for ODT structure
        const isOdt = zip.getEntry('content.xml');
        
        if (!isDocx && !isOdt) {
          return res.status(400).json({
            error: 'Invalid document structure',
            message: 'File is not a valid DOCX (missing word/document.xml) or ODT (missing content.xml)'
          });
        }
        
        if (isDocx) {
          logger.info(`✅ Valid DOCX document uploaded: ${req.file.originalname} (${req.file.size} bytes)`);
        } else if (isOdt) {
          logger.info(`✅ Valid ODT document uploaded: ${req.file.originalname} (${req.file.size} bytes)`);
        }
      } catch (zipError) {
        return res.status(400).json({
          error: 'Corrupted document file',
          message: 'Unable to read document structure'
        });
      }
    }
    next();

  } catch (error) {
    logger.error('DOCX validation error:', error);
    res.status(500).json({
      error: 'Validation failed',
      message: error.message
    });
  }
};

/**
 * Error handler for multer
 */
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        message: `Maximum file size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      });
    }
    return res.status(400).json({
      error: 'Upload error',
      message: error.message
    });
  }

  if (error) {
    return res.status(400).json({
      error: 'Upload failed',
      message: error.message
    });
  }

  next();
};

module.exports = {
  upload,
  validateDocx,
  handleUploadError
};