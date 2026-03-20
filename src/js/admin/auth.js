/* ══════════════════════════════════════════
   AUTH — Login / Logout del panel admin
══════════════════════════════════════════ */
import { ADMIN_KEY } from './config.js';
import { showToast } from './admin-toast.js';

export function initAuth({ onLogin, onLogout }) {
  const loginInput = document.getElementById('loginInput');
  const loginBtn   = document.getElementById('loginBtn');
  const logoutBtn  = document.getElementById('logoutBtn');
  const loginErr   = document.getElementById('loginErr');

  function doLogin() {
    if (loginInput.value.trim() === ADMIN_KEY) {
      document.getElementById('loginWrap').classList.add('hidden');
      const app = document.getElementById('app');
      app.classList.remove('hidden');
      app.classList.add('flex');
      onLogin();
    } else {
      loginErr.textContent = '❌ Clave incorrecta';
      setTimeout(() => { loginErr.textContent = ''; }, 2000);
    }
  }

  loginBtn.addEventListener('click', doLogin);
  loginInput.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

  logoutBtn.addEventListener('click', () => {
    document.getElementById('app').classList.add('hidden');
    document.getElementById('app').classList.remove('flex');
    document.getElementById('loginWrap').classList.remove('hidden');
    loginInput.value = '';
    onLogout();
  });

  // Foco automático al cargar
  loginInput.focus();
}