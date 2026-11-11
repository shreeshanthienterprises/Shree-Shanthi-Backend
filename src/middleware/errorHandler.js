// 404 handler
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
};

// Global error handler (logs the message only - never the request body)
const globalErrorHandler = (error, req, res, next) => {
  console.error(`[${req.id || '-'}] Unhandled error: ${error.message}`);

  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation'
    });
  }

  // Malformed JSON / oversized body from body-parser
  if (error.status >= 400 && error.status < 500) {
    return res.status(error.status).json({
      success: false,
      message: error.type === 'entity.too.large' ? 'Request body too large.' : 'Invalid request.'
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
