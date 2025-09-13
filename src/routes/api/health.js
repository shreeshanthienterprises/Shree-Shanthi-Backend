const express = require('express');
const router = express.Router();

// Health check endpoint
router.get('/', (req, res) => {
  res.json({ 
    status: 'Shree Shanthi Enterprises backend is running!',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;