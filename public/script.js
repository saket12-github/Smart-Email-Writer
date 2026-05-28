// =============================================
// DOM References
// =============================================
const form = document.getElementById('emailForm');
const generateBtn = document.getElementById('generateBtn');
const btnText = document.getElementById('btnText');
const btnSpinner = document.getElementById('btnSpinner');
const outputSection = document.getElementById('outputSection');
const subjectOutput = document.getElementById('subjectOutput');
const bodyOutput = document.getElementById('bodyOutput');
const errorBanner = document.getElementById('errorBanner');

// =============================================
// UI State Helpers
// =============================================

function setLoading(isLoading) {
  generateBtn.disabled = isLoading;
  btnText.textContent = isLoading ? 'Generating...' : 'Generate Email';
  btnSpinner.classList.toggle('hidden', !isLoading);

  if (isLoading) {
    outputSection.classList.add('hidden');
    hideError();
  }
}

function showError(message) {
  errorBanner.textContent = message;
  errorBanner.classList.remove('hidden');
}

function hideError() {
  errorBanner.textContent = '';
  errorBanner.classList.add('hidden');
}

// =============================================
// Copy to Clipboard
// =============================================
document.querySelectorAll('.copy-btn').forEach((btn) => {
  btn.addEventListener('click', handleCopy);
});

async function handleCopy(e) {
  const targetId = e.currentTarget.dataset.target;
  const text = document.getElementById(targetId).textContent;

  try {
    await navigator.clipboard.writeText(text);
    e.currentTarget.textContent = 'Copied!';
    setTimeout(() => (e.currentTarget.textContent = 'Copy'), 2000);
  } catch {
    e.currentTarget.textContent = 'Failed';
    setTimeout(() => (e.currentTarget.textContent = 'Copy'), 2000);
  }
}

// =============================================
// Form Submission
// =============================================
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const payload = {
    topic: document.getElementById('topic').value.trim(),
    recipientType: document.getElementById('recipientType').value,
    tone: document.getElementById('tone').value,
    purpose: document.getElementById('purpose').value,
    additionalContext: document.getElementById('additionalContext').value.trim(),
  };

  if (!payload.topic || !payload.recipientType || !payload.tone || !payload.purpose) {
    showError('Please fill in all required fields before generating.');
    return;
  }

  setLoading(true);

  try {
    const response = await fetch('/api/generate-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // If the request itself failed before streaming started (e.g. 400 validation error)
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to generate email. Please try again.');
    }

    // --- Read the SSE stream token by token ---
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';       // Accumulates all tokens received so far
    let subjectDone = false; // Tracks whether we've extracted the subject line yet

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue;

        const data = line.slice(6).trim();
        if (data === '[DONE]') break;

        try {
          const parsed = JSON.parse(data);

          if (parsed.error) throw new Error(parsed.error);

          const token = parsed.token;
          if (!token) continue;

          fullText += token;

          if (!subjectDone) {
            // The model outputs "Subject: ...\n\n[body]"
            // Wait until the double newline appears so we have the complete subject
            if (fullText.includes('\n\n')) {
              const splitAt = fullText.indexOf('\n\n');
              subjectOutput.textContent = fullText.slice(0, splitAt).replace(/^Subject:\s*/i, '').trim();
              bodyOutput.textContent = fullText.slice(splitAt + 2);

              // Reveal the output section and scroll to it
              outputSection.classList.remove('hidden');
              outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
              subjectDone = true;
            }
          } else {
            // Subject already shown — just append each new token to the body
            bodyOutput.textContent += token;
          }
        } catch (err) {
          if (err instanceof SyntaxError) continue; // Skip malformed SSE chunks
          throw err; // Re-throw real errors (e.g. parsed.error from server)
        }
      }
    }
  } catch (err) {
    showError(err.message);
  } finally {
    setLoading(false);
  }
});
