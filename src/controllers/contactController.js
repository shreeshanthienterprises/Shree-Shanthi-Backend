const EmailService = require('../services/emailService');
const { sanitizeInput } = require('../utils/sanitizer');

class ContactController {
  static async submitContactForm(req, res) {
    try {
      console.log('=== CONTACT FORM SUBMISSION STARTED ===');
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      console.log('Client IP:', req.ip);
      
      const { name, email, service, message } = req.body;

      // Validate required fields
      if (!name || !email || !service || !message) {
        return res.status(400).json({
          success: false,
          message: 'Please fill in all required fields (name, email, service, message)'
        });
      }

      // Sanitize inputs
      const sanitizedData = {
        name: sanitizeInput(name),
        email: sanitizeInput(email),
        service: sanitizeInput(service),
        message: sanitizeInput(message)
      };

      console.log('Sanitized data:', JSON.stringify(sanitizedData, null, 2));

      // Send email
      console.log('Attempting to send email...');
      const emailResult = await EmailService.sendContactEmail(sanitizedData, req.ip);
      console.log('Email sent successfully:', emailResult.messageId);

      // Log successful submission
      console.log(`✓ Contact form submitted successfully by ${sanitizedData.email} from IP ${req.ip}`);

      res.status(200).json({
        success: true,
        message: 'Message sent successfully! We will get back to you soon.',
        messageId: emailResult.messageId
      });

    } catch (error) {
      console.error('=== CONTACT FORM ERROR ===');
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to send message. Please try again later.';
      
      if (error.message.includes('timeout')) {
        errorMessage = 'Email service timeout. Please try again in a moment.';
      } else if (error.message.includes('authentication')) {
        errorMessage = 'Email configuration issue. Please contact support.';
        console.error('EMAIL AUTH ERROR - Check Gmail credentials!');
      } else if (error.message.includes('network') || error.message.includes('ENOTFOUND')) {
        errorMessage = 'Network connection issue. Please try again.';
      }
      
      res.status(500).json({
        success: false,
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = ContactController;