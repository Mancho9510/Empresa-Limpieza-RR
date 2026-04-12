import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Proteger panel administrativo a nivel Edge
  if (request.nextUrl.pathname.startsWith('/admin') && !request.nextUrl.pathname.endsWith('/login')) {
    const sessionCookie = request.cookies.get('lrr_admin_session')?.value
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  // Configurado para capturar peticiones a rutas /admin
  // Se excluyen llamadas al API y assets
  matcher: ['/admin/:path*'],
}
