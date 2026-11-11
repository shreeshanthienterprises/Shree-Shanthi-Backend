const crypto = require('crypto');

// Assigns a request id and logs method/path/status/duration only.
// Never log request bodies, emails, names or IPs.
const loggingMiddleware = (req, res, next) => {
  req.id = crypto.randomUUID().slice(0, 8);
  res.setHeader('X-Request-Id', req.id);
  const start = Date.now();
  res.on('finish', () => {
    console.log(`[${req.id}] ${req.method} ${req.originalUrl.split("?")[0]} -> ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
};

module.exports = {
  loggingMiddleware
};
