import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/session'

/**
 * GET /api/dashboard
 * Admin: obtener métricas completas del dashboard analítico.
 */
export async function GET() {
  try {
    await requireAdmin()
    const supabase = createAdminClient()

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString()

    // ── Catálogo de Productos y Costos ──────────────────────────────
    const { data: productosCat } = await supabase.from('productos').select('id, costo')
    const costoMap = new Map()
    if (productosCat) {
       for (const pc of productosCat) { costoMap.set(String(pc.id), pc.costo || 0) }
    }

    // ── Todos los pedidos no archivados ─────────────────────────────
    const { data: pedidos } = await supabase
      .from('pedidos')
      .select('*')
      .eq('archivado', false)
      .order('fecha', { ascending: true })

    const allPedidos = pedidos || []

    // ── Pedidos hoy ─────────────────────────────────────────────────
    const pedidosHoy = allPedidos.filter((p) => p.fecha >= todayStart)
    const totalHoy = pedidosHoy.reduce((s, p) => s + (Number(p.total) || 0), 0)

    // ── Pedidos este mes ─────────────────────────────────────────────
    const pedidosMes = allPedidos.filter((p) => p.fecha >= monthStart)
    const totalMes = pedidosMes.reduce((s, p) => s + (Number(p.total) || 0), 0)
    const descuentosMes = pedidosMes.reduce((s, p) => s + (Number(p.descuento) || 0), 0)
    const costoEnvioMes = pedidosMes.reduce((s, p) => s + (Number(p.costo_envio) || 0), 0)
    
    let costoOperativoMes = 0;
    for (const p of pedidosMes) {
      if (p.productos_json && Array.isArray(p.productos_json)) {
         for (const item of p.productos_json as Array<{ id?: string, qty?: number, costo?: number }>) {
            let costo = item.costo || 0;
            if (costo === 0 && item.id) {
               costo = costoMap.get(String(item.id)) || 0;
            }
            costoOperativoMes += (costo * (item.qty || 1));
         }
      }
    }

    // ── Pedidos mes anterior ─────────────────────────────────────────
    const pedidosMesAnterior = allPedidos.filter(
      (p) => p.fecha >= lastMonthStart && p.fecha <= lastMonthEnd
    )
    const totalMesAnterior = pedidosMesAnterior.reduce((s, p) => s + (Number(p.total) || 0), 0)
    const crecimientoMes =
      totalMesAnterior > 0
        ? Math.round(((totalMes - totalMesAnterior) / totalMesAnterior) * 100)
        : totalMes > 0 ? 100 : 0

    // ── Totales generales ────────────────────────────────────────────
    const totalGeneral = allPedidos.reduce((s, p) => s + (Number(p.total) || 0), 0)
    const pendientes = allPedidos.filter((p) => p.estado_pago === 'PENDIENTE').length
    const totalPendienteValor = allPedidos
      .filter((p) => p.estado_pago === 'PENDIENTE')
      .reduce((s, p) => s + (Number(p.total) || 0), 0)
    const ticketPromedio = allPedidos.length > 0 ? Math.round(totalGeneral / allPedidos.length) : 0
    const ingresosNetos = totalMes - descuentosMes - costoEnvioMes
    const gananciaNetaMes = ingresosNetos - costoOperativoMes

    // ── Tasa de cancelación ──────────────────────────────────────────
    const cancelados = allPedidos.filter((p) => p.estado_envio === 'Cancelado').length
    const tasaCancelacion =
      allPedidos.length > 0 ? Math.round((cancelados / allPedidos.length) * 100) : 0

    // ── Pedidos con/sin cupón ────────────────────────────────────────
    const pedidosConCupon = allPedidos.filter((p) => p.cupon && p.cupon.trim() !== '').length
    const pedidosSinCupon = allPedidos.length - pedidosConCupon

    // ── Estados de pedidos ───────────────────────────────────────────
    const estados = {
      Recibido: allPedidos.filter((p) => p.estado_envio === 'Recibido').length,
      'En preparación': allPedidos.filter((p) => p.estado_envio === 'En preparación').length,
      'En camino': allPedidos.filter((p) => p.estado_envio === 'En camino').length,
      Entregado: allPedidos.filter((p) => p.estado_envio === 'Entregado').length,
      Cancelado: allPedidos.filter((p) => p.estado_envio === 'Cancelado').length,
    }

    // ── Ventas por día (últimos 30 días) ─────────────────────────────
    const ventasPorDia: Record<string, { fecha: string; total: number; pedidos: number }> = {}
    const pedidos30 = allPedidos.filter((p) => p.fecha >= thirtyDaysAgo)
    for (const p of pedidos30) {
      const day = p.fecha.substring(0, 10)
      if (!ventasPorDia[day]) ventasPorDia[day] = { fecha: day, total: 0, pedidos: 0 }
      ventasPorDia[day].total += Number(p.total) || 0
      ventasPorDia[day].pedidos += 1
    }
    // Rellenar días sin ventas
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const key = d.toISOString().substring(0, 10)
      if (!ventasPorDia[key]) ventasPorDia[key] = { fecha: key, total: 0, pedidos: 0 }
    }
    const ventasPorDiaArr = Object.values(ventasPorDia).sort((a, b) =>
      a.fecha.localeCompare(b.fecha)
    )

    // ── Ventas por hora del día ──────────────────────────────────────
    const ventasPorHora: number[] = Array(24).fill(0)
    for (const p of allPedidos) {
      const hr = new Date(p.fecha).getHours()
      ventasPorHora[hr] += 1
    }
    const ventasPorHoraArr = ventasPorHora.map((pedidosHr, hora) => ({ hora, pedidos: pedidosHr }))

    // ── Top productos (cantidad y valor) ─────────────────────────────
    const productMap: Record<string, { nombre: string; qty: number; total: number; categoria: string }> = {}
    for (const p of allPedidos) {
      if (p.productos_json && Array.isArray(p.productos_json)) {
        for (const item of p.productos_json as Array<{
          nombre?: string
          qty?: number
          precio?: number
          categoria?: string
        }>) {
          const key = item.nombre || 'Desconocido'
          if (!productMap[key])
            productMap[key] = { nombre: key, qty: 0, total: 0, categoria: item.categoria || '' }
          productMap[key].qty += item.qty || 1
          productMap[key].total += (item.qty || 1) * (item.precio || 0)
        }
      }
    }
    const topProductos = Object.values(productMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10)
    const topProductosPorIngresos = [...Object.values(productMap)]
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)

    // ── Ventas por categoría ─────────────────────────────────────────
    const catMap: Record<string, { categoria: string; total: number; qty: number }> = {}
    for (const p of Object.values(productMap)) {
      const cat = p.categoria || 'Sin categoría'
      if (!catMap[cat]) catMap[cat] = { categoria: cat, total: 0, qty: 0 }
      catMap[cat].total += p.total
      catMap[cat].qty += p.qty
    }
    const ventasPorCategoria = Object.values(catMap).sort((a, b) => b.total - a.total)

    // ── Clientes ─────────────────────────────────────────────────────
    const { data: clientes } = await supabase
      .from('clientes')
      .select('*')
      .order('total_gastado', { ascending: false })

    const allClientes = clientes || []
    const totalClientes = allClientes.length
    const vipClientes = allClientes.filter((c) => c.tipo === 'VIP').length
    const recurrentesClientes = allClientes.filter((c) => c.tipo === 'Recurrente').length
    const nuevosClientes = allClientes.filter((c) => c.tipo === 'Nuevo').length
    const lvtPromedio =
      totalClientes > 0
        ? Math.round(allClientes.reduce((s, c) => s + (Number(c.total_gastado) || 0), 0) / totalClientes)
        : 0
    const tasaRecurrencia =
      totalClientes > 0
        ? Math.round(((vipClientes + recurrentesClientes) / totalClientes) * 100)
        : 0
    const topClientes = allClientes.slice(0, 5).map((c) => ({
      nombre: c.nombre,
      telefono: c.telefono,
      totalPedidos: c.total_pedidos || 0,
      totalGastado: Number(c.total_gastado) || 0,
      tipo: c.tipo,
    }))

    // ── Nuevos clientes por mes (últimos 6 meses) ─────────────────────
    const clientesPorMes: Record<string, number> = {}
    for (const c of allClientes) {
      if (c.primera_compra >= sixMonthsAgo) {
        const mes = c.primera_compra.substring(0, 7)
        clientesPorMes[mes] = (clientesPorMes[mes] || 0) + 1
      }
    }
    const mesesLabels = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      return d.toISOString().substring(0, 7)
    })
    const clientesNuevosPorMes = mesesLabels.map((mes) => ({
      mes,
      nuevos: clientesPorMes[mes] || 0,
    }))

    // ── Reseñas y calificaciones ────────────────────────────────────
    const { data: resenas } = await supabase
      .from('calificaciones')
      .select('estrellas, comentario, created_at, telefono')
      .order('created_at', { ascending: false })

    const allResenas = resenas || []
    const totalResenas = allResenas.length
    const avgRating =
      totalResenas > 0
        ? (allResenas.reduce((s, r) => s + r.estrellas, 0) / totalResenas).toFixed(1)
        : '0'
    const distribucionEstrellas = [1, 2, 3, 4, 5].map((star) => ({
      estrellas: star,
      count: allResenas.filter((r) => r.estrellas === star).length,
    }))
    const resenasRecientes = allResenas.slice(0, 5).map((r) => ({
      estrellas: r.estrellas,
      comentario: r.comentario,
      fecha: r.created_at,
      telefono: r.telefono,
    }))

    // ── Stock bajo ───────────────────────────────────────────────────
    const { data: productosStockBajo } = await supabase
      .from('productos')
      .select('id, nombre, stock, categoria')
      .lte('stock', 5)
      .not('stock', 'is', null)
      .order('stock', { ascending: true })
      .limit(10)

    return Response.json({
      ok: true,
      data: {
        // Métricas base
        hoy: { pedidos: pedidosHoy.length, total: totalHoy },
        mes: {
          pedidos: pedidosMes.length,
          total: totalMes,
          ingresosNetos,
          gananciaNetaMes,
          descuentos: descuentosMes,
          costoEnvio: costoEnvioMes,
        },
        mesAnterior: { pedidos: pedidosMesAnterior.length, total: totalMesAnterior },
        crecimientoMes,
        general: {
          totalPedidos: allPedidos.length,
          totalGeneral,
          pendientes,
          totalPendienteValor,
          ticketPromedio,
          tasaCancelacion,
          pedidosConCupon,
          pedidosSinCupon,
        },
        estados,
        // Gráficos temporales
        ventasPorDia: ventasPorDiaArr,
        ventasPorHora: ventasPorHoraArr,
        // Productos
        topProductos,
        topProductosPorIngresos,
        ventasPorCategoria,
        stockBajo: productosStockBajo || [],
        // Clientes
        clientes: {
          total: totalClientes,
          vip: vipClientes,
          recurrentes: recurrentesClientes,
          nuevos: nuevosClientes,
          lvtPromedio,
          tasaRecurrencia,
          top: topClientes,
          porMes: clientesNuevosPorMes,
        },
        // Satisfacción
        rating: {
          total: totalResenas,
          avg: parseFloat(avgRating),
          distribucion: distribucionEstrellas,
          recientes: resenasRecientes,
        },
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error del servidor'
    const status = message === 'No autorizado' ? 401 : 500
    return Response.json({ ok: false, error: message }, { status })
  }
}
