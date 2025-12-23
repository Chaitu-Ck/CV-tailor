/**
 * CV Tailor Server - DOCX-Only Version
 * 
 * Pure DOCX workflow, no text input support
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./backend/utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later'
});
app.use('/api/', limiter);

// Body parsing (for job descriptions, not DOCX - handled by multer)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Routes
const cvRoutes = require('./backend/routes/cv');
app.use('/api/cv', cvRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'CV Tailor DOCX API',
    version: '2.0.0',
    description: 'DOCX-native CV tailoring and ATS optimization',
    endpoints: {
      analyze: 'POST /api/cv/analyze-docx',
      fix: 'POST /api/cv/fix-docx-ats',
      optimize: 'POST /api/cv/optimize-docx',
      health: 'GET /api/cv/health'
    },
    documentation: '/api/docs'
  });
});

// Error handling
app.use((error, req, res, next) => {
  logger.error('Server error:', error);
  res.status(error.status || 500).json({
    error: error.message || 'Internal server error',
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`
╔═══════════════════════════════════════════════╗
║   CV TAILOR DOCX API - VERSION 2.0           ║
╠═══════════════════════════════════════════════╣
║ 🚀 Server running on port ${PORT.toString().padEnd(4)}                ║
║ 📝 DOCX-only workflow (no text input)        ║
║ 🔒 Security: Enabled                          ║
║ 📊 Rate limit: 100 req/15min                  ║
╚═══════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

module.exports = app;
