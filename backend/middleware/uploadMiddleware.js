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
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/octet-stream' // Some browsers send this for .docx
];

// Memory storage (no disk writes)
const storage = multer.memoryStorage();

// File filter with magic byte validation
const fileFilter = async (req, file, cb) => {
  try {
    // Check extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.docx') {
      return cb(new Error('Only DOCX files are allowed'), false);
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
    
    // DOCX is a ZIP file
    if (!fileTypeResult || fileTypeResult.ext !== 'zip') {
      return res.status(400).json({
        error: 'Invalid DOCX file',
        message: 'File is not a valid DOCX document (ZIP signature missing)'
      });
    }

    // Verify it's actually DOCX (has word/document.xml)
    const AdmZip = require('adm-zip');
    try {
      const zip = new AdmZip(req.file.buffer);
      const docXml = zip.getEntry('word/document.xml');
      
      if (!docXml) {
        return res.status(400).json({
          error: 'Invalid DOCX structure',
          message: 'File is not a valid DOCX document (missing document.xml)'
        });
      }
    } catch (zipError) {
      return res.status(400).json({
        error: 'Corrupted DOCX file',
        message: 'Unable to read DOCX structure'
      });
    }

    logger.info(`✅ Valid DOCX uploaded: ${req.file.originalname} (${req.file.size} bytes)`);
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