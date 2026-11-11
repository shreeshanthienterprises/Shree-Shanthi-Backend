const express = require('express');
const { healthPayload } = require('../../utils/buildInfo');

const router = express.Router();

// Health check endpoint (also mounted at /health for Render)
router.get('/', (req, res) => {
  res.json(healthPayload());
});

module.exports = router;
