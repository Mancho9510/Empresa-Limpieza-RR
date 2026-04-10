import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

/**
 * GET /api/historial?telefono=XXX
 * Público: obtener historial de pedidos por teléfono.
 */
export async function GET(request: NextRequest) {
  try {
    const telefono = request.nextUrl.searchParams.get('telefono')

    if (!telefono || !/^[0-9]{7,15}$/.test(telefono)) {
      return Response.json({ ok: false, error: 'Teléfono inválido' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('pedidos')
      .select('id, fecha, productos, total, estado_pago, estado_envio')
      .eq('telefono', telefono)
      .eq('archivado', false)
      .order('fecha', { ascending: false })
      .limit(20)

    if (error) throw error

    return Response.json({ ok: true, data: data || [] })
  } catch (err) {
    console.error('Error historial:', err)
    return Response.json({ ok: false, error: 'Error del servidor' }, { status: 500 })
  }
}
