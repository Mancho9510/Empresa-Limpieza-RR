import { createServerSupabaseClient } from '@/lib/supabase/server'
import { CalificacionSchema } from '@/lib/validators/schemas'
import { NextRequest } from 'next/server'
import { redis } from '@/lib/redis'
import { Ratelimit } from '@upstash/ratelimit'

// Rate limit: máx 3 reseñas por IP por hora (protección anti-spam)
const reviewLimit = redis ? new Ratelimit({
  redis: redis as any,
  limiter: Ratelimit.slidingWindow(3, '1 h'),
}) : null

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
    // Rate limit anti-spam: máx 3 reseñas/hora por IP
    if (reviewLimit) {
      const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1'
      const { success } = await reviewLimit.limit(`review_${ip}`)
      if (!success) {
        return Response.json(
          { ok: false, error: 'Has enviado demasiadas reseñas. Intenta más tarde.' },
          { status: 429 }
        )
      }
    }

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
