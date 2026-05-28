const togetherAI = require('../services/togetherAI');

// POST /api/generate-email
async function generateEmail(req, res, next) {
  const { topic, recipientType, tone, purpose, additionalContext } = req.body;

  // Validate required fields
  if (!topic || !recipientType || !tone || !purpose) {
    return res.status(400).json({ error: 'Missing required fields: topic, recipientType, tone, purpose' });
  }

  try {
    const stream = await togetherAI.getEmailStream({
      topic,
      recipientType,
      tone,
      purpose,
      additionalContext: additionalContext || '',
    });

    // SSE headers tell the browser this is a live stream, not a one-shot response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Decode the incoming bytes and add to buffer
      buffer += decoder.decode(value, { stream: true });

      // Together streams one line at a time — split on newlines and process complete lines
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Last item may be an incomplete line — keep it for next iteration

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;

        const data = line.slice(6).trim();

        if (data === '[DONE]') {
          res.write('data: [DONE]\n\n');
          break;
        }

        try {
          const parsed = JSON.parse(data);
          const token = parsed.choices?.[0]?.delta?.content;
          if (token) {
            // Forward each token to the browser as an SSE event
            res.write(`data: ${JSON.stringify({ token })}\n\n`);
          }
        } catch {
          // Skip any malformed chunks — not uncommon in SSE streams
        }
      }
    }

    res.end();
  } catch (err) {
    if (!res.headersSent) {
      next(err); // Headers not sent yet — use global error handler
    } else {
      // Stream already started — send the error as an SSE event so the browser can show it
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  }
}

module.exports = { generateEmail };
