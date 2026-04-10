import 'server-only'

/**
 * Security Headers — Limpieza RR
 * Genera los headers de seguridad para toda la aplicación.
 */

const isDev = process.env.NODE_ENV === 'development'

/**
 * Genera Content-Security-Policy header value.
 * Permite: self, Google Fonts, Google Analytics, Supabase, Google Drive images
 */
export function buildCSP(): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

  const directives = [
    `default-src 'self'`,
    `script-src 'self' https://www.googletagmanager.com https://www.google-analytics.com${isDev ? " 'unsafe-eval' 'unsafe-inline'" : " 'unsafe-inline'"}`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `img-src 'self' blob: data: https://drive.google.com https://lh3.googleusercontent.com https://*.googleusercontent.com ${supabaseUrl}`,
    `font-src 'self' https://fonts.gstatic.com`,
    `connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com ${supabaseUrl} ${supabaseUrl.replace('https://', 'wss://')}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ]

  return directives.join('; ')
}

/**
 * Todos los security headers recomendados.
 */
export function getSecurityHeaders(): Array<{ key: string; value: string }> {
  return [
    {
      key: 'Content-Security-Policy',
      value: buildCSP(),
    },
    {
      key: 'X-Content-Type-Options',
      value: 'nosniff',
    },
    {
      key: 'X-Frame-Options',
      value: 'DENY',
    },
    {
      key: 'X-XSS-Protection',
      value: '1; mode=block',
    },
    {
      key: 'Referrer-Policy',
      value: 'strict-origin-when-cross-origin',
    },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(), payment=(self)',
    },
    ...(isDev
      ? []
      : [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ]),
  ]
}
