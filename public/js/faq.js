// src/public/js/faq.js
document.addEventListener('DOMContentLoaded', () => {
  const faqForm = document.getElementById('faqForm');
  const faqList = document.getElementById('faqList');

  async function fetchFAQs() {
    try {
      const res = await fetch('/api/faqs');
      const data = await res.json();
      faqList.innerHTML = data.map(f => `
        <div class="card mb-2">
          <div class="card-body">
            <h5 class="card-title">${escapeHtml(f.question)}</h5>
            <p class="card-text">${escapeHtml(f.answer)}</p>
          </div>
        </div>
      `).join('');
    } catch (err) {
      faqList.innerHTML = '<div class="alert alert-danger">Failed to load FAQs</div>';
    }
  }

  faqForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const question = document.getElementById('question').value.trim();
    const answer = document.getElementById('answer').value.trim();
    if (!question || !answer) return;

    await fetch('/api/faqs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, answer })
    });
    faqForm.reset();
    fetchFAQs();
  });

  function escapeHtml(unsafe) {
    return unsafe
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  fetchFAQs();
});
