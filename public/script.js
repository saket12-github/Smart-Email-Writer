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

// Toggle loading state: disables button, shows spinner, hides stale output
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

// Populate the output section and scroll it into view
function showOutput(subject, body) {
  subjectOutput.textContent = subject;
  bodyOutput.textContent = body; // <pre> preserves newlines automatically
  outputSection.classList.remove('hidden');
  outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    // Briefly show "Copied!" feedback then revert
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

  // Collect and trim form values
  const payload = {
    topic: document.getElementById('topic').value.trim(),
    recipientType: document.getElementById('recipientType').value,
    tone: document.getElementById('tone').value,
    purpose: document.getElementById('purpose').value,
    additionalContext: document.getElementById('additionalContext').value.trim(),
  };

  // Client-side validation: check required fields are not empty
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

    const data = await response.json();

    if (!response.ok) {
      // Server returned an error (4xx or 5xx) with a JSON error message
      throw new Error(data.error || 'Failed to generate email. Please try again.');
    }

    showOutput(data.subject, data.body);
  } catch (err) {
    // Catches both network errors and thrown errors from the block above
    showError(err.message);
  } finally {
    // Always re-enable the button whether success or failure
    setLoading(false);
  }
});
