import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/session'
import { ProveedorSchema } from '@/lib/validators/schemas'
import { NextRequest } from 'next/server'

/**
 * GET /api/proveedores
 * Admin: listar proveedores.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const supabase = createAdminClient()
    const { searchParams } = request.nextUrl

    let query = supabase
      .from('proveedores')
      .select('*')
      .order('nombre', { ascending: true })

    const estado = searchParams.get('estado')
    if (estado) query = query.eq('estado', estado)

    const search = searchParams.get('q')
    if (search) {
      query = query.or(
        `nombre.ilike.%${search}%,contacto.ilike.%${search}%`
      )
    }

    const { data, error } = await query

    if (error) throw error

    return Response.json({ ok: true, data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error del servidor'
    const status = message === 'No autorizado' ? 401 : 500
    return Response.json({ ok: false, error: message }, { status })
  }
}

/**
 * POST /api/proveedores
 * Admin: crear/actualizar proveedor.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()

    const parsed = ProveedorSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ ok: false, error: 'Datos inválidos' }, { status: 400 })
    }

    const supabase = createAdminClient()

    if (body.id) {
      // Actualizar
      const { error } = await supabase
        .from('proveedores')
        .update(parsed.data)
        .eq('id', body.id)
      if (error) throw error
    } else {
      // Crear
      const { error } = await supabase
        .from('proveedores')
        .insert(parsed.data)
      if (error) throw error
    }

    return Response.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error del servidor'
    const status = message === 'No autorizado' ? 401 : 500
    return Response.json({ ok: false, error: message }, { status })
  }
}
