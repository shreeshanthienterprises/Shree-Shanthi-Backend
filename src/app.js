const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { generalLimiter } = require('./middleware/rateLimiter');
const { loggingMiddleware } = require('./middleware/logging');
const { globalErrorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { corsOptions } = require('./config/cors');
const routes = require('./routes');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
app.use(generalLimiter);

// Body parsing middleware with optimized size limits
app.use(express.json({ 
  limit: '1mb', // Reduced from 10mb for contact forms
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

app.use(express.urlencoded({ 
  extended: true,
  limit: '1mb' // Reduced from 10mb for contact forms
}));

// CORS configuration
app.use(cors(corsOptions));

// Logging middleware
app.use(loggingMiddleware);

// Routes
app.use('/api', routes);

// 404 handler
app.use('*', notFoundHandler);

// Global error handler
app.use(globalErrorHandler);

module.exports = app;