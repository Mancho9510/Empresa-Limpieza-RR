import { NextRequest, NextResponse } from 'next/server'
import { isOriginAllowed } from '@/lib/security/cors'

/**
 * Proxy — Limpieza RR
 * 
 * Se ejecuta en CADA request (excepto assets estáticos).
 * Responsable de:
 * 1. Security headers (CSP, HSTS, X-Frame-Options, etc.)
 * 2. CORS validation para API routes
 * 3. Protección de rutas /admin y /api/admin/*
 */

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const origin = request.headers.get('origin')
  const response = NextResponse.next()

  // ═══ 1. SECURITY HEADERS (todas las rutas) ═══════════════
  const isDev = process.env.NODE_ENV === 'development'
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

  // Content-Security-Policy
  const csp = [
    `default-src 'self'`,
    `script-src 'self' https://www.googletagmanager.com https://www.google-analytics.com${isDev ? " 'unsafe-eval' 'unsafe-inline'" : " 'unsafe-inline'"}`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `img-src 'self' blob: data: https://drive.google.com https://lh3.googleusercontent.com https://*.googleusercontent.com ${supabaseUrl}`,
    `font-src 'self' https://fonts.gstatic.com`,
    `connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com ${supabaseUrl}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
  ].join('; ')

  response.headers.set('Content-Security-Policy', csp)
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(self)')

  if (!isDev) {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  }

  // ═══ 2. CORS para API routes ═════════════════════════════
  if (pathname.startsWith('/api/')) {
    // OPTIONS preflight
    if (request.method === 'OPTIONS') {
      const preflightResponse = new NextResponse(null, { status: 204 })

      if (origin && isOriginAllowed(origin)) {
        preflightResponse.headers.set('Access-Control-Allow-Origin', origin)
        preflightResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
        preflightResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        preflightResponse.headers.set('Access-Control-Allow-Credentials', 'true')
        preflightResponse.headers.set('Access-Control-Max-Age', '86400')
      }

      return preflightResponse
    }

    // CORS headers en respuestas normales
    if (origin && isOriginAllowed(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin)
      response.headers.set('Access-Control-Allow-Credentials', 'true')
    }

    response.headers.set('Vary', 'Origin')
  }

  // ═══ 3. Protección de rutas admin ════════════════════════
  // La verificación de sesión real se hace en los Route Handlers
  // y Server Components usando validateAdminSession().
  // El middleware solo agrega headers de seguridad.

  return response
}

/**
 * Matcher: ejecutar middleware en todas las rutas EXCEPTO:
 * - _next/static (archivos estáticos)
 * - _next/image (optimización de imágenes)
 * - favicon.ico
 * - Archivos de assets públicos
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|icons/|manifest\\.json|sw\\.js).*)',
  ],
}
