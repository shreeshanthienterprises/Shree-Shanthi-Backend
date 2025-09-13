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