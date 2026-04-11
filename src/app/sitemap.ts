import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

export const revalidate = 3600 // Revalida cada hora para eficiencia

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://limpiezarr.vercel.app'
  
  // Cliente anonimo rápido (sin cookies, ideal para Edge/SSG generation)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  // Obtenemos solo ID y fechas de productos para armar el sitemap
  const { data: productos } = await supabase
    .from('productos')
    .select('id, created_at')
    .order('created_at', { ascending: false })
  
  const productEntries: MetadataRoute.Sitemap = (productos || []).map((p) => ({
    url: `${baseUrl}/#producto-${p.id}`,
    lastModified: new Date(p.created_at || Date.now()),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))
  
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    ...productEntries,
  ]
}
