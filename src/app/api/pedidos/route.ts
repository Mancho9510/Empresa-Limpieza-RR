import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/session'
import { PedidoSchema, ActualizarEstadoSchema } from '@/lib/validators/schemas'
import { NextRequest } from 'next/server'

/**
 * GET /api/pedidos
 * Admin: lista todos los pedidos (con filtros).
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const supabase = createAdminClient()
    const { searchParams } = request.nextUrl

    const archivado = searchParams.get('archivado') === 'true'

    let query = supabase
      .from('pedidos')
      .select('*')
      .eq('archivado', archivado)
      .order('fecha', { ascending: false })

    // Filtro por estado_pago
    const estadoPago = searchParams.get('estado_pago')
    if (estadoPago) query = query.eq('estado_pago', estadoPago)

    // Filtro por estado_envio
    const estadoEnvio = searchParams.get('estado_envio')
    if (estadoEnvio) query = query.eq('estado_envio', estadoEnvio)

    // Filtro por fecha
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')
    if (desde) query = query.gte('fecha', desde)
    if (hasta) query = query.lte('fecha', hasta + 'T23:59:59')

    // Búsqueda por texto
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

/**
 * POST /api/pedidos
 * Público: crear nuevo pedido desde la tienda.
 * Admin: acciones especiales (actualizar_estado, archivar, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const accion = body.accion

    // ─── Acciones admin ─────────────────────────────────────
    if (accion) {
      await requireAdmin()
      const supabase = createAdminClient()

      switch (accion) {
        case 'actualizar_estado': {
          const parsed = ActualizarEstadoSchema.safeParse(body)
          if (!parsed.success) {
            return Response.json({ ok: false, error: 'Datos inválidos' }, { status: 400 })
          }
          const { error } = await supabase
            .from('pedidos')
            .update({ [parsed.data.campo]: parsed.data.valor })
            .eq('id', parsed.data.id)
          if (error) throw error
          return Response.json({ ok: true })
        }

        case 'archivar_pedido': {
          const { error } = await supabase
            .from('pedidos')
            .update({ archivado: true })
            .eq('id', body.id)
          if (error) throw error
          return Response.json({ ok: true })
        }

        case 'recuperar_pedido': {
          const { error } = await supabase
            .from('pedidos')
            .update({ archivado: false })
            .eq('id', body.id)
          if (error) throw error
          return Response.json({ ok: true })
        }

        case 'cancelar_pedido': {
          const { error } = await supabase
            .from('pedidos')
            .update({ estado_pago: 'CANCELADO', estado_envio: 'Cancelado' })
            .eq('id', body.id)
          if (error) throw error
          return Response.json({ ok: true })
        }

        default:
          return Response.json({ ok: false, error: 'Acción no reconocida' }, { status: 400 })
      }
    }

    // ─── Nuevo pedido (público) ──────────────────────────────
    const parsed = PedidoSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json(
        { ok: false, error: 'Datos del pedido inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const adminSupa = createAdminClient()
    
    // Fetch costs to freeze them in history
    let enrichedProducts = parsed.data.productos_json
    if (enrichedProducts && enrichedProducts.length > 0) {
      try {
        const ids = enrichedProducts.map(p => p.id).filter(id => id && !id.startsWith('DUMMY'))
        if (ids.length > 0) {
          const { data: dbProds } = await adminSupa.from('productos').select('id, costo').in('id', ids)
          const costMap = new Map(dbProds?.map(p => [p.id, p.costo || 0]))
          
          enrichedProducts = enrichedProducts.map(p => ({
            ...p,
            costo: costMap.get(p.id) || 0 // Freeze cost
          }))
        }
      } catch (err) {
        console.error("Error fetching product costs at checkout:", err)
      }
    }

    const orderData = {
      ...parsed.data,
      productos_json: enrichedProducts,
      fecha: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('pedidos')
      .insert(orderData)
      .select('id')
      .single()

    if (error) throw error

    // ─── Upsert cliente ─────────────────────────────────────
    try {
      const adminSupa = createAdminClient()
      const { data: existingClient } = await adminSupa
        .from('clientes')
        .select('id, total_pedidos, total_gastado')
        .eq('telefono', parsed.data.telefono)
        .single()

      if (existingClient) {
        await adminSupa
          .from('clientes')
          .update({
            nombre: parsed.data.nombre,
            ciudad: parsed.data.ciudad,
            barrio: parsed.data.barrio,
            direccion: parsed.data.direccion,
            ultima_compra: new Date().toISOString(),
            total_pedidos: existingClient.total_pedidos + 1,
            total_gastado: existingClient.total_gastado + parsed.data.total,
            tipo: classifyClient(existingClient.total_pedidos + 1, existingClient.total_gastado + parsed.data.total),
          })
          .eq('id', existingClient.id)
      } else {
        await adminSupa.from('clientes').insert({
          nombre: parsed.data.nombre,
          telefono: parsed.data.telefono,
          ciudad: parsed.data.ciudad,
          barrio: parsed.data.barrio,
          direccion: parsed.data.direccion,
          primera_compra: new Date().toISOString(),
          ultima_compra: new Date().toISOString(),
          total_pedidos: 1,
          total_gastado: parsed.data.total,
          tipo: 'Nuevo',
        })
      }
    } catch (clientErr) {
      // No fallar el pedido si el upsert de cliente falla
      console.error('Error upserting client:', clientErr)
    }

    // ─── Actualizar stock ───────────────────────────────────
    try {
      if (parsed.data.productos_json && parsed.data.productos_json.length > 0) {
        const adminSupa = createAdminClient()
        for (const item of parsed.data.productos_json) {
          try {
            await adminSupa.rpc('decrement_stock', {
              product_id: item.id,
              qty: item.qty,
            })
          } catch {
            // Si no existe la función RPC, intentar update manual
            await adminSupa
              .from('productos')
              .update({ stock: 0 }) // fallback manual
              .eq('id', item.id)
              .gte('stock', item.qty)
          }
        }
      }
    } catch {
      console.error('Error updating stock')
    }

    return Response.json({ ok: true, id: data?.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error del servidor'
    const status = message === 'No autorizado' ? 401 : 500
    return Response.json({ ok: false, error: message }, { status })
  }
}

function classifyClient(totalPedidos: number, totalGastado: number): string {
  if (totalPedidos >= 10 || totalGastado >= 500000) return 'VIP'
  if (totalPedidos >= 2 || totalGastado >= 150000) return 'Recurrente'
  return 'Nuevo'
}
