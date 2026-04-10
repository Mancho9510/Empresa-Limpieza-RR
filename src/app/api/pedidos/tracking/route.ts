import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

/**
 * GET /api/pedidos/tracking?telefono=XYZ
 * Público: Permite al cliente buscar sus propios pedidos por teléfono.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { searchParams } = request.nextUrl
    
    // Solo permitimos buscar si envían al menos 7 dígitos válidos numéricos
    const telefonoRaw = searchParams.get('telefono')
    if (!telefonoRaw) return Response.json({ ok: false, error: 'Se requiere teléfono' }, { status: 400 })

    const telefono = telefonoRaw.replace(/[^0-9]/g, '')
    if (telefono.length < 5) return Response.json({ ok: false, error: 'Teléfono inválido' }, { status: 400 })

    // No queremos exponer información súper sensible como la dirección exacta o la geolocalización a cualquier persona que escriba un número, 
    // pero sí la cantidad de productos, total, y estado. Seleccionamos campos específicos.
    const { data, error } = await supabase
      .from('pedidos')
      .select('id, fecha, total, pago, estado_envio, productos_json')
      .eq('telefono', telefono)
      .eq('archivado', false)
      .order('fecha', { ascending: false })
      .limit(10)

    if (error) throw error

    return Response.json({ ok: true, data })
  } catch (err) {
    console.error('Error fetching tracking:', err)
    return Response.json({ ok: false, error: 'Error del servidor' }, { status: 500 })
  }
}
