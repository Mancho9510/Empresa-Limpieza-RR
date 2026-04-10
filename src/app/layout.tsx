import type { Metadata } from 'next'
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from 'next/font/google'
import ClientShell from '@/components/ClientShell'
import './globals.css'

const display = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const body = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Limpieza RR — Productos de Limpieza Premium',
    template: '%s | Limpieza RR',
  },
  description:
    'Productos de limpieza premium para tu hogar. Desengrasantes, multiusos, ambientadores y más. Entregas en Bogotá. ⭐ +500 clientes satisfechos.',
  keywords: [
    'productos de limpieza',
    'limpieza premium',
    'desengrasante',
    'multiusos',
    'ambientador',
    'Colombia',
    'Bogotá',
    'envío domicilio',
    'productos aseo Bogotá',
  ],
  authors: [{ name: 'Limpieza RR' }],
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
    shortcut: '/icons/icon-192.png',
  },
  openGraph: {
    type: 'website',
    locale: 'es_CO',
    siteName: 'Limpieza RR',
    title: 'Limpieza RR — Productos de Limpieza Premium',
    description: 'Calidad, frescura y resultados garantizados. Entregas en toda Bogotá.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Limpieza RR — Premium',
    description: 'Productos de limpieza premium para tu hogar.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      {/* Anti-flash script for dark mode */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const t = localStorage.getItem('lrr-theme') ||
                  (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                document.documentElement.setAttribute('data-theme', t);
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body className={`${display.variable} ${body.variable}`}>
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  )
}
