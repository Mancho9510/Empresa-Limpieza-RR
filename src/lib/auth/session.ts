import 'server-only'
import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import { cookies } from 'next/headers'

/**
 * Admin Session Management — Limpieza RR
 * JWT-based stateless sessions stored in HttpOnly cookies.
 */

const SESSION_SECRET = process.env.SESSION_SECRET
const COOKIE_NAME = 'lrr_admin_session'
const SESSION_DURATION_DAYS = 7

if (!SESSION_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('SESSION_SECRET environment variable is required in production')
}

const encodedKey = new TextEncoder().encode(SESSION_SECRET || 'dev-secret-change-me-in-production')

export interface AdminSessionPayload extends JWTPayload {
  userId: string
  role: string
}

/**
 * Encripta un payload en un JWT firmado
 */
export async function encrypt(payload: AdminSessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_DAYS}d`)
    .sign(encodedKey)
}

/**
 * Desencripta y valida un JWT
 */
export async function decrypt(token: string): Promise<AdminSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ['HS256'],
    })
    return payload as AdminSessionPayload
  } catch {
    return null
  }
}

/**
 * Crea una sesión de admin y la guarda en una cookie HttpOnly
 */
export async function createAdminSession(userId: string, role = 'admin'): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000)
  const session = await encrypt({ userId, role })
  const cookieStore = await cookies()

  cookieStore.set(COOKIE_NAME, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'strict',
    path: '/',
  })
}

/**
 * Valida la sesión actual del admin.
 * Retorna el payload desencriptado o null.
 */
export async function validateAdminSession(): Promise<AdminSessionPayload | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(COOKIE_NAME)?.value

  if (!sessionCookie) return null

  return await decrypt(sessionCookie)
}

/**
 * Elimina la sesión del admin.
 */
export async function deleteAdminSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

/**
 * Verifica que hay una sesión activa (admin o superadmin).
 * Usar en Route Handlers que cualquier admin puede acceder.
 */
export async function requireAdmin(): Promise<AdminSessionPayload> {
  const session = await validateAdminSession()
  if (!session || !['admin', 'superadmin'].includes(session.role)) {
    throw new Error('No autorizado')
  }
  return session
}

/**
 * Verifica que la sesión es de superadmin.
 * Usar para operaciones sensibles: precios, costos, eliminar productos.
 */
export async function requireSuperAdmin(): Promise<AdminSessionPayload> {
  const session = await validateAdminSession()
  if (!session || session.role !== 'superadmin') {
    throw new Error('No autorizado')
  }
  return session
}
