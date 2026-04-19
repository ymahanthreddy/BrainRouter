import './style.css';
import { initAuth, getSession } from './auth.js';
import { initNav, showApp } from './app.js';
import { initCompare } from './compare.js';
import { initChat } from './chat.js';

initAuth();
initNav();
initCompare();
initChat();

// Auto-login if session exists
if (getSession()) {
  showApp();
}
// Otherwise landing page is shown by default (no action needed)
