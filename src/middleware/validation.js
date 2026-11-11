const validator = require('validator');

// Validation middleware
const validateContactForm = (req, res, next) => {
  const { name, email, service, message } = req.body;

  // Check required fields
  if (!name || !email || !service || !message) {
    return res.status(400).json({
      success: false,
      message: 'Name, email, service, and message are required.'
    });
  }

  if ([name, email, service, message].some((v) => typeof v !== 'string')) {
    return res.status(400).json({
      success: false,
      message: 'Name, email, service, and message are required.'
    });
  }

  // Validate field lengths
  if (name.length > 100) {
    return res.status(400).json({
      success: false,
      message: 'Name must be less than 100 characters.'
    });
  }
  if (message.length > 2000) {
    return res.status(400).json({
      success: false,
      message: 'Message must be less than 2000 characters.'
    });
  }

  // Validate email
  if (!validator.isEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email address.'
    });
  }

  // Validate phone (optional, so existing clients that don't send it keep working)
  const { phone } = req.body;
  if (phone !== undefined && phone !== null && phone !== '') {
    const digits = typeof phone === 'string' ? phone.replace(/\D/g, '') : '';
    if (
      typeof phone !== 'string' ||
      !/^\+?[\d\s\-().]{7,20}$/.test(phone.trim()) ||
      digits.length < 7 ||
      digits.length > 15
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number.'
      });
    }
  }

  // Validate service value
  const allowedServices = ['Housekeeping services', 'Security services', 'Pest control'];
  if (!allowedServices.includes(service)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid service selected.'
    });
  }

  next();
};

module.exports = { validateContactForm };