const express = require('express');
const contactRoutes = require('./api/contact');
const healthRoutes = require('./api/health');
const testEmailRoutes = require('./api/test-email');

const router = express.Router();

// API routes
router.use('/contact', contactRoutes);
router.use('/health', healthRoutes);
router.use('/test-email', testEmailRoutes);

module.exports = router;