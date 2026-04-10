import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/session'
import { ModificarPedidoSchema } from '@/lib/validators/schemas'
import { type NextRequest } from 'next/server'

/**
 * GET /api/pedidos/[id]
 * Admin: obtener detalle de un pedido.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('pedidos')
      .select('*')
      .eq('id', parseInt(id))
      .single()

    if (error) throw error

    return Response.json({ ok: true, data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error del servidor'
    const status = message === 'No autorizado' ? 401 : 500
    return Response.json({ ok: false, error: message }, { status })
  }
}

/**
 * PATCH /api/pedidos/[id]
 * Admin: modificar un pedido.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await request.json()

    const parsed = ModificarPedidoSchema.safeParse({ ...body, id: parseInt(id) })
    if (!parsed.success) {
      return Response.json({ ok: false, error: 'Datos inválidos' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { id: pedidoId, ...updateData } = parsed.data

    const { error } = await supabase
      .from('pedidos')
      .update(updateData)
      .eq('id', pedidoId)

    if (error) throw error

    return Response.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error del servidor'
    const status = message === 'No autorizado' ? 401 : 500
    return Response.json({ ok: false, error: message }, { status })
  }
}
