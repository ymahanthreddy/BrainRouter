import { loadHistory } from './history.js';
import { clearSession } from './auth.js';

export function initNav() {
  // Logged-in app nav
  document.querySelectorAll('[data-page]').forEach((item) => {
    item.addEventListener('click', () => navigateTo(item.dataset.page));
  });

  // Landing sidebar nav
  document.querySelectorAll('[data-landing-page]').forEach((item) => {
    item.addEventListener('click', () => switchLandingSection(item.dataset.landingPage));
  });

  document.getElementById('logout-btn').addEventListener('click', logout);
}

export function navigateTo(page) {
  document.querySelectorAll('[data-page]').forEach((el) =>
    el.classList.toggle('active', el.dataset.page === page)
  );
  document.querySelectorAll('#app .page').forEach((el) =>
    el.classList.toggle('active', el.id === `page-${page}`)
  );
  if (page === 'history') loadHistory();
}

export function switchLandingSection(name) {
  document.querySelectorAll('[data-landing-page]').forEach((el) =>
    el.classList.toggle('active', el.dataset.landingPage === name)
  );
  document.querySelectorAll('.landing-section').forEach((el) =>
    el.classList.toggle('active', el.id === `landing-${name}`)
  );
}

export function showApp() {
  const session = JSON.parse(localStorage.getItem('br_user') || 'null');

  document.getElementById('landing').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');

  if (session) {
    const initial = (session.username || session.email || 'U')[0].toUpperCase();
    document.getElementById('user-initial').textContent = initial;
    document.getElementById('user-name').textContent    = session.username || 'User';
    document.getElementById('user-email').textContent   = session.email || '';
  }

  navigateTo('chat');
}

export function showLanding() {
  document.getElementById('app').classList.add('hidden');
  document.getElementById('landing').classList.remove('hidden');
}

function logout() {
  clearSession();
  showLanding();
}
