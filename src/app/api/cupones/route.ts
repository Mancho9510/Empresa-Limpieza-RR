import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/session'
import { ValidarCuponSchema } from '@/lib/validators/schemas'
import { NextRequest } from 'next/server'

/**
 * GET /api/cupones?code=XXX
 * Público: validar un cupón por código.
 * Admin (sin code): listar todos los cupones.
 */
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code')

    // ─── Público: validar cupón ─────────────────────────────
    if (code) {
      const parsed = ValidarCuponSchema.safeParse({ code })
      if (!parsed.success) {
        return Response.json({ ok: false, error: 'Código inválido' }, { status: 400 })
      }

      const supabase = await createServerSupabaseClient()

      const { data, error } = await supabase
        .from('cupones')
        .select('codigo, tipo, valor, usos_maximos, usos_actuales, vencimiento')
        .eq('codigo', parsed.data.code.toUpperCase())
        .eq('activo', true)
        .single()

      if (error || !data) {
        return Response.json({ ok: false, error: 'Cupón no encontrado o inactivo' })
      }

      // Verificar usos
      if (data.usos_maximos && data.usos_actuales >= data.usos_maximos) {
        return Response.json({ ok: false, error: 'Cupón agotado' })
      }

      // Verificar vencimiento
      if (data.vencimiento && new Date(data.vencimiento) < new Date()) {
        return Response.json({ ok: false, error: 'Cupón vencido' })
      }

      return Response.json({
        ok: true,
        cupon: {
          code: data.codigo,
          type: data.tipo === 'PORCENTAJE' ? 'pct' : 'fixed',
          value: data.valor,
          label: data.tipo === 'PORCENTAJE' ? `${data.valor}% desc.` : `$${data.valor} desc.`,
        },
      })
    }

    // ─── Admin: listar todos ────────────────────────────────
    await requireAdmin()
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('cupones')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return Response.json({ ok: true, data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error del servidor'
    const status = message === 'No autorizado' ? 401 : 500
    return Response.json({ ok: false, error: message }, { status })
  }
}
