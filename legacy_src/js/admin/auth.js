/* ══════════════════════════════════════════
   AUTH — Login / Logout del panel admin
══════════════════════════════════════════ */
import { AUTH_URL, LOGOUT_URL } from './config.js';
import { showToast } from './admin-toast.js';

export function initAuth({ onLogin, onLogout }) {
  const loginInput = document.getElementById('loginInput');
  const loginBtn   = document.getElementById('loginBtn');
  const logoutBtn  = document.getElementById('logoutBtn');
  const loginErr   = document.getElementById('loginErr');

  async function doLogin() {
    const clave = loginInput.value.trim();
    if (!clave) return;

    try {
      const res = await fetch(AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clave })
      });
      const data = await res.json();

      if (data.ok) {
        document.getElementById('loginWrap').style.display = 'none';
        const app = document.getElementById('app');
        app.classList.remove('hidden');
        app.classList.add('flex');
        app.style.display = 'flex';
        onLogin();
      } else {
        throw new Error('Clave incorrecta');
      }
    } catch (e) {
      loginErr.textContent = '❌ Clave incorrecta';
      setTimeout(() => { loginErr.textContent = ''; }, 2000);
    }
  }

  if (loginBtn)   loginBtn.addEventListener('click', doLogin);
  if (loginInput) loginInput.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try { await fetch(LOGOUT_URL, { method: 'POST' }); } catch(err) {}
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