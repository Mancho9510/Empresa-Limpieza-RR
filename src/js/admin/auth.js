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
      // Usar style.display para evitar conflicto con Tailwind flex/hidden
      document.getElementById('loginWrap').style.display = 'none';
      const app = document.getElementById('app');
      app.classList.remove('hidden');
      app.classList.add('flex');
      app.style.display = 'flex';
      onLogin();
    } else {
      loginErr.textContent = '❌ Clave incorrecta';
      setTimeout(() => { loginErr.textContent = ''; }, 2000);
    }
  }

  if (loginBtn)   loginBtn.addEventListener('click', doLogin);
  if (loginInput) loginInput.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      const app = document.getElementById('app');
      app.classList.add('hidden');
      app.classList.remove('flex');
      app.style.display = '';
      const lw = document.getElementById('loginWrap');
      lw.style.display = 'flex';
      if (loginInput) loginInput.value = '';
      onLogout();
    });
  }

  // Foco automático al cargar
  if (loginInput) loginInput.focus();
}