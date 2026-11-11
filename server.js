require('dotenv').config();
const app = require('./src/app');
const { getEmailConfigStatus } = require('./src/services/emailService');

const PORT = process.env.PORT || 3001;

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  const email = getEmailConfigStatus();
  console.log(email.configured ? 'Email: configured (resend)' : `WARNING: email NOT configured - ${email.reason}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});