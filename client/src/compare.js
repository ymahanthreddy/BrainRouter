import { api } from './api.js';
import { escapeHtml } from './utils.js';
import { openModal } from './auth.js';
import { getSession } from './auth.js';

let landingRecognition = null;
let appRecognition = null;

export function initCompare() {
  // Landing compare page
  document.getElementById('compare-btn').addEventListener('click', runLandingCompare);
  document.getElementById('mic-btn').addEventListener('click', () => toggleMic('landing'));

  // App compare page
  document.getElementById('app-compare-btn').addEventListener('click', runAppCompare);
  document.getElementById('app-mic-btn').addEventListener('click', () => toggleMic('app'));
}

async function runLandingCompare() {
  const prompt = document.getElementById('prompt-input').value.trim();
  if (!prompt) return;

  if (!getSession()) { openModal('signup'); return; }

  const btn     = document.getElementById('compare-btn');
  const loading = document.getElementById('loading');
  const cards   = document.getElementById('response-cards');

  btn.disabled = true;
  btn.textContent = '⏳ Comparing...';
  loading.classList.remove('hidden');
  cards.innerHTML = '';

  try {
    const { responses } = await api.post('/ai/compare', { prompt });
    renderCards(cards, responses);
  } catch (e) {
    cards.innerHTML = `<p style="color:#ff6584;padding:0 32px">${e.message}</p>`;
  } finally {
    btn.disabled = false;
    btn.textContent = '⚡ Compare';
    loading.classList.add('hidden');
  }
}

async function runAppCompare() {
  const prompt = document.getElementById('app-prompt-input').value.trim();
  if (!prompt) return;

  const btn     = document.getElementById('app-compare-btn');
  const loading = document.getElementById('app-loading');
  const cards   = document.getElementById('app-response-cards');

  btn.disabled = true;
  btn.textContent = '⏳ Comparing...';
  loading.classList.remove('hidden');
  cards.innerHTML = '';

  try {
    const { responses } = await api.post('/ai/compare', { prompt });
    renderCards(cards, responses);
  } catch (e) {
    cards.innerHTML = `<p style="color:#ff6584">${e.message}</p>`;
  } finally {
    btn.disabled = false;
    btn.textContent = '⚡ Compare Models';
    loading.classList.add('hidden');
  }
}

function renderCards(container, responses) {
  responses.forEach((r) => {
    const card = document.createElement('div');
    card.className = `response-card${r.best ? ' best' : ''}`;
    card.innerHTML = `
      <div class="card-header">
        <span class="model-name">${r.model}</span>
        <div class="badges">
          ${r.best ? '<span class="badge-best">⭐ Best</span>' : ''}
          <span class="score-badge">Score: ${r.score}</span>
        </div>
      </div>
      <div class="response-text">${escapeHtml(r.text)}</div>
    `;
    container.appendChild(card);
  });
}

function toggleMic(context) {
  const btnId   = context === 'app' ? 'app-mic-btn' : 'mic-btn';
  const inputId = context === 'app' ? 'app-prompt-input' : 'prompt-input';
  const langId  = context === 'app' ? 'app-lang-select' : 'lang-select';

  const btn   = document.getElementById(btnId);
  const input = document.getElementById(inputId);

  const active = context === 'app' ? appRecognition : landingRecognition;

  if (active) { active.stop(); return; }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { alert('Speech recognition requires Chrome.'); return; }

  const r = new SR();
  r.lang = document.getElementById(langId).value;
  r.continuous = true;
  r.interimResults = true;

  r.onstart  = () => { btn.classList.add('listening'); btn.textContent = '⏹'; };
  r.onresult = (e) => {
    let t = '';
    for (let i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript;
    input.value = t;
  };
  r.onerror = r.onend = () => {
    btn.classList.remove('listening');
    btn.textContent = '🎤';
    if (context === 'app') appRecognition = null;
    else landingRecognition = null;
  };

  r.start();
  if (context === 'app') appRecognition = r;
  else landingRecognition = r;
}
