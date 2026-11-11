const EmailService = require('../services/emailService');
const { sanitizeInput } = require('../utils/sanitizer');

class ContactController {
  // Input presence/format is validated by validateContactForm before this runs.
  static async submitContactForm(req, res) {
    const { name, email, phone, service, message } = req.body;
    const data = {
      name: sanitizeInput(name),
      email: sanitizeInput(email),
      phone: sanitizeInput(phone),
      service: sanitizeInput(service),
      message: sanitizeInput(message)
    };

    try {
      const result = await EmailService.sendContactEmail(data);
      console.log(`[${req.id}] contact email sent service="${data.service}" providerId=${result.id}`);

      return res.status(200).json({
        success: true,
        message: 'Message sent successfully! We will get back to you soon.'
      });
    } catch (error) {
      console.error(`[${req.id}] contact email FAILED service="${data.service}" reason="${error.message}" providerStatus=${error.status || "-"} providerCode=${error.code || "-"}`);

      const misconfigured = error.code === 'not_configured';
      return res.status(misconfigured ? 500 : 502).json({
        success: false,
        message: 'We could not send your message right now. Please try again later.'
      });
    }
  }
}

module.exports = ContactController;
