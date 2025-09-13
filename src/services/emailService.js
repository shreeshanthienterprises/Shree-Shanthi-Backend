const { transporter } = require('../config/email');

class EmailService {
  static async sendContactEmail(sanitizedData, clientIP) {
      console.log('=== EMAIL SERVICE STARTING ===');
      console.log('From:', process.env.EMAIL_USER);
      console.log('To:', process.env.OWNER_EMAIL);
      console.log('Subject: New Contact Form Message');

      const mailOptions = {
        from: {
          name: 'Shree Shanthi Enterprises',
          address: process.env.EMAIL_USER
        },
        to: process.env.OWNER_EMAIL,
        replyTo: {
          name: sanitizedData.name,
          address: sanitizedData.email
        },
        subject: `New Contact Form Message from ${sanitizedData.name} [${sanitizedData.service}]`,
        html: this.generateEmailHTML(sanitizedData, clientIP),
        text: this.generateEmailText(sanitizedData, clientIP)
      };

    // Send email with timeout and retry mechanism
    const emailPromise = this.sendWithRetry(mailOptions, 3);
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Email timeout after 30 seconds')), 30000)
    );

    return Promise.race([emailPromise, timeout]);
  }

  static async sendWithRetry(mailOptions, maxRetries) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempting to send email (attempt ${attempt}/${maxRetries})...`);
        const result = await transporter.sendMail(mailOptions);
        console.log(`✓ Email sent successfully on attempt ${attempt}`);
        console.log('Email result:', result.messageId);
        return result;
      } catch (error) {
        console.error(`✗ Email send attempt ${attempt} failed:`, error.message);
        console.error('Error code:', error.code);
        console.error('Error response:', error.response);
        
        if (attempt === maxRetries) {
          console.error('=== ALL EMAIL ATTEMPTS FAILED ===');
          throw new Error(`Email failed after ${maxRetries} attempts: ${error.message}`);
        }
        
        // Wait before retry (exponential backoff)
        const waitTime = 2000 * attempt; // 2s, 4s, 6s
        console.log(`Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  static generateEmailHTML(data, clientIP) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; border-radius: 8px; overflow: hidden;">
        <div style="background: #e53935; color: #fff; padding: 24px 32px; text-align: center;">
          <h2 style="margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 1px;">Shree Shanthi Enterprises</h2>
          <p style="margin: 8px 0 0; font-size: 18px; font-weight: 400;">New Contact Form Submission</p>
        </div>
        <div style="background: #fff; padding: 32px;">
          <h3 style="color: #1a237e; margin-top: 0;">Contact Details</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="color: #888; font-weight: bold; padding: 8px 0;">Name:</td>
              <td style="padding: 8px 0;">${data.name}</td>
            </tr>
            <tr>
              <td style="color: #888; font-weight: bold; padding: 8px 0;">Email:</td>
              <td style="padding: 8px 0;">${data.email}</td>
            </tr>
            <tr>
              <td style="color: #888; font-weight: bold; padding: 8px 0;">Service:</td>
              <td style="padding: 8px 0;">${data.service}</td>
            </tr>
            <tr>
              <td style="color: #888; font-weight: bold; padding: 8px 0;">Received:</td>
              <td style="padding: 8px 0;">${new Date().toLocaleString()}</td>
            </tr>
          </table>
          <h3 style="color: #e53935; margin-bottom: 8px;">Message</h3>
          <div style="background: #f4f8ff; border-radius: 4px; padding: 16px; color: #333; font-size: 15px; line-height: 1.6;">
            ${data.message.replace(/\n/g, '<br>')}
          </div>
        </div>
        <div style="background: #1a237e; color: #fff; padding: 16px 32px; text-align: center; font-size: 13px;">
          Housekeeping • Security • Pest Control<br>
          This message was sent via the contact form on Shree Shanthi Enterprises website.
        </div>
      </div>
    `;
  }

  static generateEmailText(data, clientIP) {
  return `
SHREE SHANTHI ENTERPRISES - SERVICE REQUEST
============================================
NAME: ${data.name}
EMAIL: ${data.email}
SERVICE: ${data.service}
DATE: ${new Date().toLocaleString()}

MESSAGE:
--------
${data.message}

============================================
Housekeeping • Security • Pest Control

This message was sent via the contact form on Shree Shanthi Enterprises website.
Please respond to the customer within 24 hours.
`;
  }
}

module.exports = EmailService;