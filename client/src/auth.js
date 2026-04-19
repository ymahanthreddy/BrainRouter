import { api } from './api.js';
import { showApp } from './app.js';

export function initAuth() {
  // Modal open buttons
  document.getElementById('open-login').addEventListener('click', () => openModal('login'));
  document.getElementById('open-signup').addEventListener('click', () => openModal('signup'));
  document.getElementById('modal-close').addEventListener('click', closeModal);

  // Click outside to close
  document.getElementById('auth-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('auth-modal')) closeModal();
  });

  // Tab switching
  document.getElementById('go-signup').addEventListener('click', (e) => { e.preventDefault(); showAuthPage('signup'); });
  document.getElementById('go-login').addEventListener('click', (e) => { e.preventDefault(); showAuthPage('login'); });

  // Submit on Enter
  document.getElementById('login-password').addEventListener('keydown', (e) => { if (e.key === 'Enter') login(); });
  document.getElementById('signup-password').addEventListener('keydown', (e) => { if (e.key === 'Enter') signup(); });

  // Buttons
  document.getElementById('login-btn').addEventListener('click', login);
  document.getElementById('signup-btn').addEventListener('click', signup);
}

export function openModal(page = 'login') {
  showAuthPage(page);
  document.getElementById('auth-modal').classList.remove('hidden');
}

export function closeModal() {
  document.getElementById('auth-modal').classList.add('hidden');
}

export function showAuthPage(page) {
  document.getElementById('login-page').classList.toggle('hidden', page !== 'login');
  document.getElementById('signup-page').classList.toggle('hidden', page !== 'signup');
}

async function login() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');
  clearError(errEl);

  const btn = document.getElementById('login-btn');
  btn.disabled = true;
  btn.textContent = 'Signing in...';

  try {
    const data = await api.post('/auth/login', { email, password }, false);
    saveSession(data);
    closeModal();
    showApp();
  } catch (e) {
    showError(errEl, e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}

async function signup() {
  const username = document.getElementById('signup-username').value.trim();
  const email    = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const errEl    = document.getElementById('signup-error');
  clearError(errEl);

  if (!email || !username || !password) { showError(errEl, 'Please fill in all fields'); return; }

  const btn = document.getElementById('signup-btn');
  btn.disabled = true;
  btn.textContent = 'Creating account...';

  try {
    const data = await api.post('/auth/signup', { email, username, password }, false);
    saveSession(data);
    closeModal();
    showApp();
  } catch (e) {
    showError(errEl, e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
}

export function saveSession(data) {
  localStorage.setItem('br_token', data.token);
  localStorage.setItem('br_user', JSON.stringify({ username: data.username, email: data.email }));
}

export function clearSession() {
  localStorage.removeItem('br_token');
  localStorage.removeItem('br_user');
}

export function getSession() {
  const token = localStorage.getItem('br_token');
  const user  = JSON.parse(localStorage.getItem('br_user') || 'null');
  return token && user ? { token, user } : null;
}

function showError(el, msg) { el.textContent = msg; el.classList.add('visible'); }
function clearError(el)     { el.classList.remove('visible'); }
