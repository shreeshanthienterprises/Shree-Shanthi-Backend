// 404 handler
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
};

// Global error handler
const globalErrorHandler = (error, req, res, next) => {
  console.error('Unhandled error:', error);
  
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation'
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
};

module.exports = {
  notFoundHandler,
  globalErrorHandler
};