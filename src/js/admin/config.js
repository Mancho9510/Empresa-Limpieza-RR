/* ══════════════════════════════════════════
   CONFIG — Variables del panel admin
   Las claves vienen de variables de entorno.
   En local:  .env.local
   En Vercel: Settings → Environment Variables
══════════════════════════════════════════ */

if (!import.meta.env.VITE_APPS_URL) {
  console.error('[Config] VITE_APPS_URL no está definida. Crea .env.local');
}
if (!import.meta.env.VITE_ADMIN_KEY) {
  console.error('[Config] VITE_ADMIN_KEY no está definida. Crea .env.local');
}

export const APPS_URL  = import.meta.env.VITE_APPS_URL  ?? '';
export const ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY ?? '';
export const WA_NUMBER = import.meta.env.VITE_WA_NUMBER ?? '573503443140';