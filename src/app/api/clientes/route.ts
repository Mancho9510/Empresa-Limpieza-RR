import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/session'
import { NextRequest } from 'next/server'

/**
 * GET /api/clientes
 * Admin: listar clientes.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const supabase = createAdminClient()
    const { searchParams } = request.nextUrl

    let query = supabase
      .from('clientes')
      .select('*')
      .order('ultima_compra', { ascending: false })

    const tipo = searchParams.get('tipo')
    if (tipo) query = query.eq('tipo', tipo)

    const search = searchParams.get('q')
    if (search) {
      query = query.or(
        `nombre.ilike.%${search}%,telefono.ilike.%${search}%,barrio.ilike.%${search}%`
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
