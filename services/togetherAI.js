const TOGETHER_API_URL = 'https://api.together.xyz/v1/chat/completions';

// Calls the Together API with stream: true and returns the raw response body (a ReadableStream)
async function getEmailStream({ topic, recipientType, tone, purpose, additionalContext }) {
  const systemPrompt = `You are an expert professional email writer.
Write an email based on the details provided.
Use this exact format and nothing else:

Subject: [subject line here]

[full email body here]

The email should sound natural, human, and match the requested tone. Avoid robotic wording.`;

  const userMessage = `Write an email with the following details:
- Topic: ${topic}
- Recipient Type: ${recipientType}
- Tone: ${tone}
- Purpose: ${purpose}
- Additional Context: ${additionalContext || 'None'}`;

  const response = await fetch(TOGETHER_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.TOGETHER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.TOGETHER_MODEL_ID,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 600,
      temperature: 0.7,
      stream: true, // Ask Together to stream tokens as they are generated
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`TogetherAI API error (${response.status}): ${errorText}`);
  }

  return response.body; // Native ReadableStream — controller will pipe this to the client
}

module.exports = { getEmailStream };
