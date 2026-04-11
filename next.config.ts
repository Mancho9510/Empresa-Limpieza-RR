import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const isDev = process.env.NODE_ENV === 'development'

// ═══ Content Security Policy ════════════════════════════════
// Defined explicitly so Sentry Replay (blob: workers) and
// Vercel Speed Insights are not blocked by the browser.
const CSP = [
  // Default: only same-origin
  `default-src 'self'`,

  // Scripts: self + GA/GTM + Vercel Speed Insights
  // 'unsafe-inline' needed for the anti-flash <script> in layout.tsx
  // 'unsafe-eval' needed by Next.js HMR in development only
  `script-src 'self' https://www.googletagmanager.com https://www.google-analytics.com https://va.vercel-scripts.com${isDev ? " 'unsafe-eval'" : ''} 'unsafe-inline'`,

  // Styles
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,

  // Fonts
  `font-src 'self' https://fonts.gstatic.com`,

  // Images: data & blob for canvas/jsPDF; Drive + Supabase for product photos
  `img-src 'self' data: blob: https://drive.google.com https://lh3.googleusercontent.com https://*.googleusercontent.com https://*.supabase.co https://www.google-analytics.com`,

  // Fetch/XHR: Supabase, Sentry, Google Analytics, Vercel Speed Insights
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://o4511199542640640.ingest.us.sentry.io https://www.google-analytics.com https://analytics.google.com https://va.vercel-scripts.com`,

  // Workers: blob: is REQUIRED by Sentry Replay
  // (it instantiates its recording worker from a blob URL)
  `worker-src 'self' blob:`,

  // Block all frames
  `frame-src 'none'`,

  // Media
  `media-src 'self'`,

  // Block embedded objects (Flash, etc.)
  `object-src 'none'`,

  // Restrict form submissions to same origin
  `form-action 'self'`,

  // Restrict base tag
  `base-uri 'self'`,
].join('; ')

const nextConfig: NextConfig = {
  // ═══ Images: Google Drive + Supabase Storage ═══════════════
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'drive.google.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },

  // ═══ Security Headers ═════════════════════════════════════
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: CSP,
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
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
        ],
      },
      // Cache headers para manifest y SW
      {
        source: '/manifest.json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ]
  },

  // ═══ Redirects: legacy URLs ════════════════════════════════
  async redirects() {
    return [
      {
        source: '/admin.html',
        destination: '/admin',
        permanent: true,
      },
      {
        source: '/index.html',
        destination: '/',
        permanent: true,
      },
    ]
  },

  // ═══ Experimental: SRI para scripts estáticos ══════════════
  experimental: {
    sri: {
      algorithm: 'sha256',
    },
  },
}

export default withSentryConfig(nextConfig, {
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options
  org: 'limpieza-rr',
  project: 'javascript-nextjs',

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // Upload a larger set of source maps for prettier stack traces
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  tunnelRoute: '/monitoring',

  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
})
