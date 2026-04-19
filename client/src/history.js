import { api } from './api.js';
import { escapeHtml } from './utils.js';

export async function loadHistory() {
  const container = document.getElementById('history-list');
  container.innerHTML = '<p class="muted">Loading...</p>';

  try {
    const data = await api.get('/ai/history');

    if (!data.length) {
      container.innerHTML = '<p class="muted">No history yet. Start comparing models!</p>';
      return;
    }

    container.innerHTML = '';
    data.forEach((item) => {
      const date = new Date(item.createdAt).toLocaleString();
      const el = document.createElement('div');
      el.className = 'history-item';
      el.innerHTML = `
        <div class="prompt-text">${escapeHtml(item.prompt)}</div>
        <div class="meta">${date}</div>
        <div class="history-models">
          ${(item.responses || []).map((r) =>
            `<span class="history-model-tag${r.best ? ' best' : ''}">${r.model} · ${r.score}${r.best ? ' ⭐' : ''}</span>`
          ).join('')}
        </div>
      `;
      container.appendChild(el);
    });
  } catch (e) {
    container.innerHTML = `<p class="muted">Could not load history: ${e.message}</p>`;
  }
}
