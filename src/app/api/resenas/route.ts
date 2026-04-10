import { createServerSupabaseClient } from '@/lib/supabase/server'
import { CalificacionSchema } from '@/lib/validators/schemas'
import { NextRequest } from 'next/server'

/**
 * GET /api/resenas
 * Público: obtener las últimas reseñas.
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('calificaciones')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error

    // Calcular promedio
    const total = data?.length || 0
    const sum = data?.reduce((acc, r) => acc + r.estrellas, 0) || 0
    const avg = total > 0 ? (sum / total).toFixed(1) : '0'

    return Response.json({
      ok: true,
      data: data || [],
      stats: {
        total,
        avg: parseFloat(avg),
      },
    })
  } catch (err) {
    console.error('Error resenas:', err)
    return Response.json({ ok: false, error: 'Error del servidor' }, { status: 500 })
  }
}

/**
 * POST /api/resenas
 * Público: enviar una calificación.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = CalificacionSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json({ ok: false, error: 'Datos inválidos' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()

    const { error } = await supabase
      .from('calificaciones')
      .insert(parsed.data)

    if (error) throw error

    return Response.json({ ok: true })
  } catch (err) {
    console.error('Error posting resena:', err)
    return Response.json({ ok: false, error: 'Error del servidor' }, { status: 500 })
  }
}
