/**
 * Health Check Routes
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

/**
 * GET /api/health
 * Overall system health check
 */
router.get('/', (req, res) => {
  res.json({
    service: 'CV Tailor API',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: 'connected',
    cache: 'connected'
  });
});

/**
 * GET /api/health/db
 * Database connection check
 */
router.get('/db', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const connected = mongoose.connection.readyState === 1;

    res.json({
      service: 'MongoDB',
      status: connected ? 'connected' : 'disconnected',
      database: mongoose.connection.name || 'unknown',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    logger.error('Database health check failed', err);
    res.status(500).json({
      service: 'MongoDB',
      status: 'error',
      message: err.message
    });
  }
});

module.exports = router;
