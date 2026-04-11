import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createAdminSession } from '@/lib/auth/session'
import { LoginSchema } from '@/lib/validators/schemas'
import { compare } from 'bcryptjs'

/**
 * POST /api/auth/login
 * Autentica al admin con correo + contraseña y crea sesión JWT.
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

    const { email, password } = parsed.data
    const supabase = createAdminClient()

    // Buscar admin por correo
    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('id, email, password_hash, role')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (error || !admin) {
      // Delay para evitar timing attacks (no revelar si el correo existe)
      await new Promise(r => setTimeout(r, 400))
      return Response.json(
        { ok: false, error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    // Verificar contraseña con bcrypt
    const isValid = await compare(password, admin.password_hash)
    if (!isValid) {
      return Response.json(
        { ok: false, error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    // Crear sesión JWT
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
