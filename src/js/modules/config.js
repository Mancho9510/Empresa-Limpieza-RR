/* ══════════════════════════════════════════
   CONFIG — Variables de la tienda pública
   Las claves vienen de variables de entorno.
   En local:  .env.local
   En Vercel: Settings → Environment Variables
══════════════════════════════════════════ */

export const APPS_URL  = import.meta.env.VITE_APPS_URL  ?? '';
export const ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY ?? '';
export const WA_NUMBER = import.meta.env.VITE_WA_NUMBER ?? '573503443140';
