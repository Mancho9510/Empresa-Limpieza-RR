import 'server-only'

/**
 * CORS Configuration — Limpieza RR
 * Whitelist de orígenes permitidos para la API.
 */

const ALLOWED_ORIGINS_ENV = process.env.ALLOWED_ORIGINS || ''

/** Orígenes siempre permitidos */
const STATIC_ORIGINS: string[] = [
  'https://limpiezarr.com',
  'https://www.limpiezarr.com',
]

/** Construir lista completa de orígenes */
function getAllowedOrigins(): string[] {
  const envOrigins = ALLOWED_ORIGINS_ENV
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)

  const origins = [...STATIC_ORIGINS, ...envOrigins]

  // En desarrollo, permitir localhost
  if (process.env.NODE_ENV === 'development') {
    origins.push('http://localhost:3000')
    origins.push('http://localhost:3001')
    origins.push('http://127.0.0.1:3000')
  }

  return origins
}

const allowedOrigins = getAllowedOrigins()

/**
 * Valida si un origen está en la whitelist
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false
  return allowedOrigins.includes(origin)
}

/**
 * Genera CORS headers para un origen válido.
 * Si el origen no es válido, NO devuelve Access-Control-Allow-Origin.
 */
export function getCorsHeaders(origin: string | null): HeadersInit {
  const headers: Record<string, string> = {
    'Vary': 'Origin',
  }

  if (origin && isOriginAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Methods'] = 'GET, POST, PATCH, DELETE, OPTIONS'
    headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    headers['Access-Control-Allow-Credentials'] = 'true'
    headers['Access-Control-Max-Age'] = '86400'
  }

  return headers
}

/**
 * Maneja preflight OPTIONS requests
 */
export function handlePreflight(origin: string | null): Response {
  if (origin && isOriginAllowed(origin)) {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    })
  }

  return new Response('Forbidden', { status: 403 })
}
