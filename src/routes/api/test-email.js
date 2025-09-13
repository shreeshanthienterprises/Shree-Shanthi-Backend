const express = require('express');
const router = express.Router();
const EmailService = require('../../services/emailService');

// Test email endpoint for debugging
router.post('/send-test', async (req, res) => {
  try {
    console.log('=== EMAIL TEST STARTED ===');
    console.log('Environment check:');
    console.log('EMAIL_USER:', process.env.EMAIL_USER);
    console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '[SET]' : '[NOT SET]');
    console.log('OWNER_EMAIL:', process.env.OWNER_EMAIL);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    
    // Test data
    const testData = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      phone: '1234567890',
      address: 'Test Address, Test City',
      message: 'This is a test message to verify AFC Restaurant email functionality is working correctly on Render deployment.'
    };

    console.log('Sending test email with data:', testData);

    // Attempt to send test email
    const result = await EmailService.sendContactEmail(testData, req.ip);
    
    console.log('=== EMAIL TEST SUCCESSFUL ===');
    console.log('Email result:', result);
    
    res.status(200).json({
      success: true,
      message: 'Test email sent successfully!',
      messageId: result.messageId,
      result: result
    });

  } catch (error) {
    console.error('=== EMAIL TEST FAILED ===');
    console.error('Error details:', error.message);
    console.error('Full error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Test email failed',
      error: error.message,
      details: error.stack
    });
  }
});

// Environment check endpoint
router.get('/check-env', (req, res) => {
  console.log('=== ENVIRONMENT CHECK ===');
  
  const envCheck = {
    EMAIL_USER: process.env.EMAIL_USER ? 'SET' : 'NOT SET',
    EMAIL_PASS: process.env.EMAIL_PASS ? 'SET' : 'NOT SET',
    EMAIL_HOST: process.env.EMAIL_HOST || 'NOT SET',
    EMAIL_PORT: process.env.EMAIL_PORT || 'NOT SET',
    OWNER_EMAIL: process.env.OWNER_EMAIL ? 'SET' : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV || 'NOT SET',
    PORT: process.env.PORT || 'NOT SET'
  };
  
  console.log('Environment variables:', envCheck);
  
  res.json({
    success: true,
    environment: envCheck,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
