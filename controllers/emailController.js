const togetherAI = require('../services/togetherAI');

// POST /api/generate-email
async function generateEmail(req, res, next) {
  const { topic, recipientType, tone, purpose, additionalContext } = req.body;

  // Validate required fields
  if (!topic || !recipientType || !tone || !purpose) {
    return res.status(400).json({ error: 'Missing required fields: topic, recipientType, tone, purpose' });
  }

  try {
    const result = await togetherAI.generateEmail({
      topic,
      recipientType,
      tone,
      purpose,
      additionalContext: additionalContext || '',
    });

    res.json(result); // { subject, body }
  } catch (err) {
    next(err); // Forward to global error handler in server.js
  }
}

module.exports = { generateEmail };
