import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/session'

/**
 * GET /api/dashboard
 * Admin: obtener métricas del dashboard.
 */
export async function GET() {
  try {
    await requireAdmin()
    const supabase = createAdminClient()

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    // Pedidos no archivados
    const { data: pedidos } = await supabase
      .from('pedidos')
      .select('*')
      .eq('archivado', false)

    const allPedidos = pedidos || []

    // Pedidos hoy
    const pedidosHoy = allPedidos.filter((p) => p.fecha >= todayStart)
    const totalHoy = pedidosHoy.reduce((s, p) => s + (Number(p.total) || 0), 0)

    // Pedidos este mes
    const pedidosMes = allPedidos.filter((p) => p.fecha >= monthStart)
    const totalMes = pedidosMes.reduce((s, p) => s + (Number(p.total) || 0), 0)

    // Totales generales
    const totalGeneral = allPedidos.reduce((s, p) => s + (Number(p.total) || 0), 0)
    const pendientes = allPedidos.filter((p) => p.estado_pago === 'PENDIENTE').length
    const ticketPromedio = allPedidos.length > 0 ? Math.round(totalGeneral / allPedidos.length) : 0

    // Estados
    const estados = {
      Recibido: allPedidos.filter((p) => p.estado_envio === 'Recibido').length,
      'En preparación': allPedidos.filter((p) => p.estado_envio === 'En preparación').length,
      'En camino': allPedidos.filter((p) => p.estado_envio === 'En camino').length,
      Entregado: allPedidos.filter((p) => p.estado_envio === 'Entregado').length,
      Cancelado: allPedidos.filter((p) => p.estado_envio === 'Cancelado').length,
    }

    // Clientes
    const { count: totalClientes } = await supabase
      .from('clientes')
      .select('*', { count: 'exact', head: true })

    const { count: vipClientes } = await supabase
      .from('clientes')
      .select('*', { count: 'exact', head: true })
      .eq('tipo', 'VIP')

    // Reseñas
    const { data: resenas } = await supabase
      .from('calificaciones')
      .select('estrellas')

    const totalResenas = resenas?.length || 0
    const avgRating = totalResenas > 0
      ? (resenas!.reduce((s, r) => s + r.estrellas, 0) / totalResenas).toFixed(1)
      : '0'

    // Top productos (por cantidad vendida)
    const productCount: Record<string, { nombre: string; qty: number }> = {}
    for (const p of allPedidos) {
      if (p.productos_json && Array.isArray(p.productos_json)) {
        for (const item of p.productos_json as Array<{ nombre?: string; qty?: number }>) {
          const key = item.nombre || 'Desconocido'
          if (!productCount[key]) productCount[key] = { nombre: key, qty: 0 }
          productCount[key].qty += item.qty || 1
        }
      }
    }
    const topProductos = Object.values(productCount)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10)

    return Response.json({
      ok: true,
      data: {
        hoy: { pedidos: pedidosHoy.length, total: totalHoy },
        mes: { pedidos: pedidosMes.length, total: totalMes },
        general: {
          totalPedidos: allPedidos.length,
          totalGeneral,
          pendientes,
          ticketPromedio,
        },
        estados,
        clientes: { total: totalClientes || 0, vip: vipClientes || 0 },
        rating: { total: totalResenas, avg: parseFloat(avgRating) },
        topProductos,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error del servidor'
    const status = message === 'No autorizado' ? 401 : 500
    return Response.json({ ok: false, error: message }, { status })
  }
}
