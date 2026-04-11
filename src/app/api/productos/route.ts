import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/session'
import { ProductoSchema, ActualizarStockSchema, ActualizarPrecioSchema, ActualizarCostoSchema } from '@/lib/validators/schemas'
import { NextRequest } from 'next/server'

import { redis } from '@/lib/redis'

/**
 * GET /api/productos
 * Lista todos los productos (público). Usa Caché en Redis.
 */
export async function GET() {
  try {
    const cacheKey = 'catalogo_productos'
    const cached = redis ? await redis.get(cacheKey) : null
    if (cached) {
      return Response.json({ ok: true, data: cached, cached: true })
    }

    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('categoria', { ascending: true })
      .order('nombre', { ascending: true })

    if (error) throw error

    // Caché por 5 minutos
    if (redis) {
      await redis.set(cacheKey, JSON.stringify(data), { ex: 300 })
    }

    return Response.json({ ok: true, data })
  } catch (err) {
    console.error('Error fetching productos:', err)
    return Response.json(
      { ok: false, error: 'Error al obtener productos' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/productos
 * Operaciones admin sobre productos:
 * - accion: "crear" | "actualizar_stock" | "actualizar_precio" | "actualizar_costo"
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()
    const accion = body.accion || 'crear'
    const supabase = createAdminClient()

    let resultData = null

    switch (accion) {
      case 'crear': {
        const parsed = ProductoSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json({ ok: false, error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })
        }
        const { data, error } = await supabase
          .from('productos')
          .insert(parsed.data)
          .select()
          .single()
        if (error) throw error
        resultData = data
        break
      }

      case 'actualizar_stock': {
        const parsed = ActualizarStockSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json({ ok: false, error: 'Datos inválidos' }, { status: 400 })
        }
        const qty = parsed.data.qty || 1
        let error
        if (parsed.data.operacion === 'restar') {
          const res = await supabase.rpc('decrement_stock', { product_id: parsed.data.id, qty })
          error = res.error
        } else if (parsed.data.operacion === 'sumar') {
          const res = await supabase.rpc('increment_stock', { product_id: parsed.data.id, qty })
          error = res.error
        }
        if (error) throw error
        break
      }

      case 'actualizar_precio': {
        const parsed = ActualizarPrecioSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json({ ok: false, error: 'Datos de precio inválidos', details: parsed.error.flatten() }, { status: 400 })
        }
        const { error } = await supabase
          .from('productos')
          .update({ precio: parsed.data.precio })
          .eq('id', parsed.data.id)
        if (error) throw error
        break
      }

      case 'actualizar_costo': {
        const parsed = ActualizarCostoSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json({ ok: false, error: 'Datos de costo inválidos', details: parsed.error.flatten() }, { status: 400 })
        }
        const { error } = await supabase
          .from('productos')
          .update({ costo: parsed.data.costo })
          .eq('id', parsed.data.id)
        if (error) throw error
        break
      }

      default:
        return Response.json({ ok: false, error: 'Acción no válida' }, { status: 400 })
    }

    // Invalidar caché tras cualquier cambio exitoso
    if (redis) {
      await redis.del('catalogo_productos')
    }

    return Response.json({ ok: true, ...(resultData ? { data: resultData } : {}) })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error del servidor'
    const status = message === 'No autorizado' ? 401 : 500
    return Response.json({ ok: false, error: message }, { status })
  }
}
