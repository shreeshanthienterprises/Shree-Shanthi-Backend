const xss = require('xss');

// Input sanitization function
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  return xss(input.trim());
};

module.exports = {
  sanitizeInput
};