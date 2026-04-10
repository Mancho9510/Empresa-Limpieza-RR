import { deleteAdminSession } from '@/lib/auth/session'

/**
 * POST /api/auth/logout
 * Elimina la sesión del admin.
 */
export async function POST() {
  try {
    await deleteAdminSession()
    return Response.json({ ok: true })
  } catch {
    return Response.json({ ok: false, error: 'Error al cerrar sesión' }, { status: 500 })
  }
}
