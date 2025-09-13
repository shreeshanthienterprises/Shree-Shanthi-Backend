// Logging middleware
const loggingMiddleware = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
};

module.exports = {
  loggingMiddleware
};