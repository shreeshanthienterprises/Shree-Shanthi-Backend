// Normalise user input: trim and strip control characters (keeping newlines
// and tabs). HTML escaping happens where the value is rendered (emailService).
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
};

module.exports = {
  sanitizeInput
};
