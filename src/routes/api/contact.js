const express = require('express');
const ContactController = require('../../controllers/contactController');
const { contactLimiter } = require('../../middleware/rateLimiter');
const { validateContactForm } = require('../../middleware/validation');

const router = express.Router();

// Contact form endpoint
router.post('/', contactLimiter, validateContactForm, ContactController.submitContactForm);

module.exports = router;