const TOGETHER_API_URL = 'https://api.together.xyz/v1/chat/completions';

async function generateEmail({ topic, recipientType, tone, purpose, additionalContext }) {
  // System prompt instructs the model to act as an email writer and return strict JSON
  const systemPrompt = `You are an expert professional email writer.
Your task is to write a well-structured, natural-sounding email based on the user's inputs.
You MUST respond with ONLY a valid JSON object in this exact format:
{
  "subject": "the email subject line here",
  "body": "the full email body here"
}
Do not include any explanation, markdown code fences, or text outside the JSON object.
The email should sound human, avoid robotic wording, and match the requested tone.`;

  // User message includes all context needed for the email
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
      max_tokens: 1024,
      temperature: 0.7,
      // Forces the model to output valid JSON (supported by most Together models)
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`TogetherAI API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  return parseEmailResponse(content);
}

// Parse the JSON response from the model with a fallback for markdown-wrapped JSON
function parseEmailResponse(content) {
  // Step 1: Try parsing the content directly as JSON
  try {
    const parsed = JSON.parse(content);
    if (parsed.subject && parsed.body) return parsed;
  } catch {
    // Step 2: Fallback — extract JSON block in case model wrapped it in ```json ... ```
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (parsed.subject && parsed.body) return parsed;
      } catch {
        // Fall through to error below
      }
    }
  }

  throw new Error('Could not parse a valid email from the AI response. Please try again.');
}

module.exports = { generateEmail };
