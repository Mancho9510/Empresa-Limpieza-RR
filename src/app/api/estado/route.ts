import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

/**
 * GET /api/estado?telefono=XXX
 * Público: obtener el estado del último pedido por teléfono.
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
      .select('id, fecha, nombre, productos, total, estado_pago, estado_envio')
      .eq('telefono', telefono)
      .eq('archivado', false)
      .order('fecha', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return Response.json({ ok: true, data: null, msg: 'No se encontraron pedidos' })
      }
      throw error
    }

    return Response.json({ ok: true, data })
  } catch (err) {
    console.error('Error estado:', err)
    return Response.json({ ok: false, error: 'Error del servidor' }, { status: 500 })
  }
}
