import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/session'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.formData()
    const file = body.get('file') as Blob
    const pedidoId = body.get('pedidoId') as string

    if (!file || !pedidoId) {
      return Response.json({ ok: false, error: 'Faltan datos' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // 1. Asegurar que el bucket "facturas" exista (no fallar si ya existe)
    try {
       await supabase.storage.createBucket('facturas', { public: true })
    } catch (e) {
       // Ignorar si ya existe
    }

    // 2. Subir PDF
    const filename = `LRR_${pedidoId}_${Date.now()}.pdf`
    const { data, error } = await supabase.storage
      .from('facturas')
      .upload(filename, file, {
        contentType: 'application/pdf',
        upsert: true
      })

    if (error) throw error

    // 3. Obtener URL publica
    const { data: publicUrlData } = supabase.storage.from('facturas').getPublicUrl(data.path)
    
    return Response.json({ ok: true, url: publicUrlData.publicUrl })
  } catch (err) {
    console.error('Error guardando factura:', err)
    return Response.json({ ok: false, error: 'Error del servidor' }, { status: 500 })
  }
}
