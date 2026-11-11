const express = require('express');
const contactRoutes = require('./api/contact');
const healthRoutes = require('./api/health');

const router = express.Router();

// API routes
router.use('/contact', contactRoutes);
router.use('/health', healthRoutes);

module.exports = router;
