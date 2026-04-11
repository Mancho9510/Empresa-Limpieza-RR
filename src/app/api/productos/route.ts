import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, requireSuperAdmin } from '@/lib/auth/session'
import { ProductoSchema, ActualizarStockSchema, ActualizarPrecioSchema, ActualizarCostoSchema } from '@/lib/validators/schemas'

import { redis } from '@/lib/redis'

const BUCKET = 'productos'

/**
 * Invalida la caché de productos en Redis.
 */
async function invalidarCache() {
  if (redis) {
    await redis.del('catalogo_productos')
  }
}

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

    const supabase = createAdminClient()

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
 * - accion: "crear" | "actualizar_stock" | "actualizar_precio" | "actualizar_costo" | "eliminar" | "editar"
 * - "actualizar_precio" y "actualizar_costo" requieren superadmin
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const accion = body.accion || 'crear'
    const supabase = createAdminClient()

    // Precio y costo solo para superadmin
    if (accion === 'actualizar_precio' || accion === 'actualizar_costo') {
      await requireSuperAdmin()
    } else {
      await requireAdmin()
    }

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

      case 'editar': {
        // Edición completa — si incluye precio/costo, requiere superadmin
        const { id, ...campos } = body
        if (!id) return Response.json({ ok: false, error: 'ID requerido' }, { status: 400 })
        if ((campos.precio !== undefined || campos.costo !== undefined)) {
          await requireSuperAdmin()
        }
        const { accion: _a, ...updateData } = campos
        const { data, error } = await supabase
          .from('productos')
          .update(updateData)
          .eq('id', id)
          .select()
          .single()
        if (error) throw error
        resultData = data
        break
      }

      case 'eliminar': {
        await requireSuperAdmin()
        const { id } = body
        if (!id) return Response.json({ ok: false, error: 'ID requerido' }, { status: 400 })
        const { error } = await supabase.from('productos').delete().eq('id', id)
        if (error) throw error
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
        } else {
          // Set directo
          const res = await supabase.from('productos').update({ stock: parsed.data.stock }).eq('id', parsed.data.id)
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

    await invalidarCache()
    return Response.json({ ok: true, ...(resultData ? { data: resultData } : {}) })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error del servidor'
    const status = message === 'No autorizado' ? 401 : 500
    return Response.json({ ok: false, error: message }, { status })
  }
}

/**
 * PUT /api/productos/imagen — Upload de imagen a Supabase Storage
 * Body: multipart/form-data con campo "file" y "productoId" (opcional)
 */
export async function PUT(request: NextRequest) {
  try {
    await requireAdmin()
    const supabase = createAdminClient()

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const slot = (formData.get('slot') as string) || '1' // '1', '2' o '3'

    if (!file) {
      return Response.json({ ok: false, error: 'No se recibió ningún archivo' }, { status: 400 })
    }

    // Validar tipo MIME
    if (!file.type.startsWith('image/')) {
      return Response.json({ ok: false, error: 'El archivo debe ser una imagen' }, { status: 400 })
    }

    // Validar tamaño (máx 5 MB)
    if (file.size > 5 * 1024 * 1024) {
      return Response.json({ ok: false, error: 'La imagen no puede superar 5 MB' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `producto_${Date.now()}_${slot}.${ext}`
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) throw uploadError

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName)

    return Response.json({ ok: true, url: urlData.publicUrl, fileName })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error del servidor'
    const status = message === 'No autorizado' ? 401 : 500
    console.error('Error upload imagen:', err)
    return Response.json({ ok: false, error: message }, { status })
  }
}
