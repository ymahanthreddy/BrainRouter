import { api } from './api.js';
import { escapeHtml } from './utils.js';
import { openModal, getSession } from './auth.js';

let landingMicRecognition = null;

export function initChat() {
  // Landing chat
  document.getElementById('landing-send').addEventListener('click', sendLandingMessage);
  document.getElementById('landing-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendLandingMessage(); }
  });
  document.getElementById('landing-input').addEventListener('input', () => autoResize('landing-input'));
  document.getElementById('landing-mic').addEventListener('click', toggleLandingMic);

  // App chat
  document.getElementById('send-btn').addEventListener('click', sendAppMessage);
  document.getElementById('chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAppMessage(); }
  });
  document.getElementById('chat-input').addEventListener('input', () => autoResize('chat-input'));
}

async function sendLandingMessage() {
  const input = document.getElementById('landing-input');
  const text  = input.value.trim();
  if (!text) return;

  // Prompt login if not authenticated
  if (!getSession()) {
    openModal('signup');
    return;
  }

  appendLandingMessage('user', text);
  input.value = '';
  input.style.height = 'auto';

  const sendBtn = document.getElementById('landing-send');
  sendBtn.disabled = true;
  const thinking = appendLandingMessage('assistant', '⏳ Thinking...', 'Typing');

  try {
    const { responses } = await api.post('/ai/compare', { prompt: text });
    const best = responses.find((r) => r.best) || responses[0];
    thinking.remove();
    appendLandingMessage('assistant', best.text, best.model);
  } catch (e) {
    thinking.remove();
    appendLandingMessage('assistant', `Error: ${e.message}`, 'System');
  } finally {
    sendBtn.disabled = false;
  }
}

async function sendAppMessage() {
  const input = document.getElementById('chat-input');
  const text  = input.value.trim();
  if (!text) return;

  appendAppMessage('user', text);
  input.value = '';
  input.style.height = 'auto';

  const sendBtn = document.getElementById('send-btn');
  sendBtn.disabled = true;
  const thinking = appendAppMessage('assistant', '⏳ Thinking...', 'Typing');

  try {
    const model = document.getElementById('chat-model').value;
    const { responses } = await api.post('/ai/compare', { prompt: text });
    const result =
      responses.find((r) => r.model.toLowerCase().includes(model.toLowerCase())) ||
      responses.find((r) => r.best) ||
      responses[0];

    thinking.remove();
    appendAppMessage('assistant', result.text, result.model);
  } catch (e) {
    thinking.remove();
    appendAppMessage('assistant', `Error: ${e.message}`, 'System');
  } finally {
    sendBtn.disabled = false;
  }
}

function appendLandingMessage(role, text, label) {
  const container = document.getElementById('landing-messages');
  return appendMessage(container, role, text, label);
}

function appendAppMessage(role, text, label) {
  const container = document.getElementById('chat-messages');
  return appendMessage(container, role, text, label);
}

function appendMessage(container, role, text, label) {
  const el = document.createElement('div');
  el.className = `message ${role}`;
  el.innerHTML = `
    ${label ? `<div class="message-label">${escapeHtml(label)}</div>` : ''}
    <div>${escapeHtml(text)}</div>
  `;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
  return el;
}

function autoResize(id) {
  const el = document.getElementById(id);
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 110) + 'px';
}

function toggleLandingMic() {
  const btn   = document.getElementById('landing-mic');
  const input = document.getElementById('landing-input');

  if (landingMicRecognition) { landingMicRecognition.stop(); return; }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { alert('Speech recognition requires Chrome.'); return; }

  landingMicRecognition = new SR();
  landingMicRecognition.lang = document.getElementById('landing-lang').value;
  landingMicRecognition.continuous = true;
  landingMicRecognition.interimResults = true;

  landingMicRecognition.onstart  = () => { btn.classList.add('listening'); btn.textContent = '⏹'; };
  landingMicRecognition.onresult = (e) => {
    let t = '';
    for (let i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript;
    input.value = t;
    autoResize('landing-input');
  };
  landingMicRecognition.onerror = landingMicRecognition.onend = () => {
    btn.classList.remove('listening');
    btn.textContent = '🎤';
    landingMicRecognition = null;
  };
  landingMicRecognition.start();
}
