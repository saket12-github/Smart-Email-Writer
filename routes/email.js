const express = require('express');
const router = express.Router();
const { generateEmail } = require('../controllers/emailController');

// POST /api/generate-email
router.post('/generate-email', generateEmail);

module.exports = router;
