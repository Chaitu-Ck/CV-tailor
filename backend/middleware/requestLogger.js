/**
 * Request Logger Middleware
 * Logs all incoming requests
 */

const logger = require('../utils/logger');

const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request
  logger.info(`${req.method} ${req.path}`, {
    query: req.query,
    ip: req.ip
  });
  
  // Log response when it finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    
    logger[logLevel](`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  
  next();
};

module.exports = requestLogger;
