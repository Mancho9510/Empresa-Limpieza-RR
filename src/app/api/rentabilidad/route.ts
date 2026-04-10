import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/session'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const supabase = createAdminClient()
    const { searchParams } = request.nextUrl
    
    let query = supabase.from('pedidos').select('id, fecha, productos_json, nombre, total')

    // Fechas
    const month = searchParams.get('mes') // YYYY-MM
    if (month) {
      const start = new Date(`${month}-01T00:00:00.000Z`)
      const end = new Date(start)
      end.setMonth(start.getMonth() + 1)
      query = query.gte('fecha', start.toISOString()).lt('fecha', end.toISOString())
    }

    const { data: pedidos, error } = await query

    if (error) throw error

    // Parse items to get profitability
    let totalIngresos = 0
    let totalCostos = 0
    
    // Using a map to aggregate by product string specifically
    const prodMap = new Map()

    for (const ped of (pedidos || [])) {
      if (!Array.isArray(ped.productos_json)) continue;
      
      for (const item of ped.productos_json) {
        const qty = item.qty || 1
        const precio = item.precio || 0
        const costo = item.costo || 0
        
        const ingresoBruto = precio * qty
        const costoOp = costo * qty

        totalIngresos += ingresoBruto
        totalCostos += costoOp

        const key = `${item.id}||${item.nombre}||${item.tamano || ''}`
        if (!prodMap.has(key)) {
          prodMap.set(key, {
            id: item.id,
            nombre: item.nombre,
            tamano: item.tamano || '',
            qty: 0,
            ingresoBruto: 0,
            costoOp: 0
          })
        }
        
        const stat = prodMap.get(key)
        stat.qty += qty
        stat.ingresoBruto += ingresoBruto
        stat.costoOp += costoOp
      }
    }

    const productosVendidos = Array.from(prodMap.values()).map(p => ({
      ...p,
      gananciaNeta: p.ingresoBruto - p.costoOp,
      margen: p.ingresoBruto > 0 ? ((p.ingresoBruto - p.costoOp) / p.ingresoBruto) * 100 : 0
    })).sort((a, b) => b.gananciaNeta - a.gananciaNeta)

    return Response.json({
      ok: true,
      data: {
        totalPedidos: pedidos?.length || 0,
        totalIngresos,
        totalCostos,
        gananciaNeta: totalIngresos - totalCostos,
        margenGeneral: totalIngresos > 0 ? ((totalIngresos - totalCostos) / totalIngresos) * 100 : 0,
        productosVendidos
      }
    })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error del servidor'
    const status = message === 'No autorizado' ? 401 : 500
    return Response.json({ ok: false, error: message }, { status })
  }
}
