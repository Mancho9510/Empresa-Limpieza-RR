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
      // Fallback: si no hay tabla admin_users, intentar con ADMIN_KEY hasheado
      const legacyKey = process.env.ADMIN_KEY
      if (legacyKey) {
        // Soporta ADMIN_KEY como hash bcrypt ($2a$...) o como texto plano (solo dev)
        let legacyValid = false
        if (legacyKey.startsWith('$2')) {
          legacyValid = await compare(password, legacyKey)
        } else if (process.env.NODE_ENV !== 'production') {
          // Solo en desarrollo se permite texto plano
          legacyValid = password === legacyKey
        }
        if (legacyValid) {
          await createAdminSession('legacy-admin', 'admin')
          return Response.json({ ok: true })
        }
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
