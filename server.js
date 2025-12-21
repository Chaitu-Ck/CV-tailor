/**
 * CV Tailor - AI-Powered CV Tailoring and ATS Optimization System
 * Main Application Server
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Redis = require('ioredis');

// Load environment variables
dotenv.config();

// Import routes and utilities
const logger = require('./backend/utils/logger');
const cvRoutes = require('./backend/routes/cv');
const healthRoutes = require('./backend/routes/health');
const errorHandler = require('./backend/middleware/errorHandler');
const requestLogger = require('./backend/middleware/requestLogger');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
  credentials: true,
  optionsSuccessStatus: 200
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request logging
app.use(requestLogger);

// ============================================================================
// DATABASE & CACHE INITIALIZATION
// ============================================================================

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_NAME || 'cv-tailor',
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    logger.info('✅ MongoDB connected successfully');
  } catch (err) {
    logger.error('❌ MongoDB connection failed:', err);
    process.exit(1);
  }
};

// Redis Connection
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

redis.on('connect', () => {
  logger.info('✅ Redis connected successfully');
});

redis.on('error', (err) => {
  logger.error('❌ Redis connection error:', err);
});

// Graceful Redis reconnection
redis.on('close', () => {
  logger.warn('⚠️  Redis connection closed');
});

// ============================================================================
// ROUTES
// ============================================================================

// Health check endpoint
app.use('/api/health', healthRoutes);

// CV tailoring endpoints
app.use('/api/cv', cvRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'CV Tailor API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      cv: '/api/cv'
    }
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    statusCode: 404
  });
});

// Global error handler
app.use(errorHandler);

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

const gracefulShutdown = () => {
  logger.info('Graceful shutdown initiated...');
  
  server.close(() => {
    logger.info('HTTP server closed');
    
    mongoose.connection.close(() => {
      logger.info('MongoDB connection closed');
    });
    
    redis.quit(() => {
      logger.info('Redis connection closed');
      process.exit(0);
    });
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Uncaught exception handler
process.on('uncaughtException', (err) => {
  logger.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// ============================================================================
// START SERVER
// ============================================================================

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Start Express server
    const server = app.listen(PORT, () => {
      logger.info(`
╔════════════════════════════════════════════╗
║  CV TAILOR API SERVER STARTED              ║
╠════════════════════════════════════════════╣
║  🚀 Server running on port ${PORT.toString().padEnd(32)}║
║  📝 Environment: ${(process.env.NODE_ENV || 'development').padEnd(33)}║
║  🗄️  Database: MongoDB                      ║
║  💾 Cache: Redis                          ║
╚════════════════════════════════════════════╝
    `);
    });
    
    // Make server accessible to graceful shutdown handler
    global.server = server;
    
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
};

// Start server
if (require.main === module) {
  startServer();
}

module.exports = app;
