/* ══════════════════════════════════════════
   CONFIG — Variables del panel admin
   Las peticiones irán dirigidas a los Proxys Serverless
   de Vercel, omitiendo el viaje de la clave secreta.
══════════════════════════════════════════ */

export const APPS_URL   = '/api/proxy';
export const AUTH_URL   = '/api/auth';
export const LOGOUT_URL = '/api/logout';

export const WA_NUMBER = import.meta.env.VITE_WA_NUMBER ?? '573503443140';