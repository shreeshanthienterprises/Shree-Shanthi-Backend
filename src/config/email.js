const nodemailer = require('nodemailer');

// Create email transporter optimized for Gmail and Render
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // Use STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  connectionTimeout: 60000, // 60 seconds
  greetingTimeout: 30000,   // 30 seconds
  socketTimeout: 60000,     // 60 seconds
  debug: true, // Enable debug for troubleshooting
  logger: true
});

// Verify transporter configuration with better error handling
transporter.verify((error, success) => {
  if (error) {
    console.error('Email transporter verification failed:', error.message);
    console.warn('Email service will continue but may have issues sending emails');
  } else {
    console.log('✓ Gmail SMTP transporter verified and ready');
    console.log('✓ Email service configured for:', process.env.EMAIL_USER);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  transporter.close();
});

process.on('SIGINT', () => {
  transporter.close();
});

module.exports = {
  transporter
};