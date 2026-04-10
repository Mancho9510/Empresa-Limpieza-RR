import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createAdminSession } from '@/lib/auth/session'
import { LoginSchema } from '@/lib/validators/schemas'
import { compare } from 'bcryptjs'

/**
 * POST /api/auth/login
 * Autentica al admin y crea una sesión JWT.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = LoginSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { ok: false, error: 'Datos inválidos' },
        { status: 400 }
      )
    }

    const { password } = parsed.data
    const supabase = createAdminClient()

    // Buscar admin user
    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('id, password_hash, role')
      .limit(1)
      .single()

    if (error || !admin) {
      // Fallback: comparar con la clave legacy (durante migración)
      const legacyKey = process.env.ADMIN_KEY
      if (legacyKey && password === legacyKey) {
        await createAdminSession('legacy-admin', 'admin')
        return Response.json({ ok: true })
      }

      return Response.json(
        { ok: false, error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    // Verificar password con bcrypt
    const isValid = await compare(password, admin.password_hash)
    if (!isValid) {
      return Response.json(
        { ok: false, error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    // Crear sesión
    await createAdminSession(admin.id, admin.role)

    return Response.json({ ok: true })
  } catch (err) {
    console.error('Login error:', err)
    return Response.json(
      { ok: false, error: 'Error del servidor' },
      { status: 500 }
    )
  }
}
