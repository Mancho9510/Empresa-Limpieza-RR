import { createServerSupabaseClient } from '@/lib/supabase/server'
import Hero from '@/components/store/Hero'
import Benefits from '@/components/store/Benefits'
import ProductGrid from '@/components/store/ProductGrid'
import Reviews from '@/components/store/Reviews'
import Contact from '@/components/store/Contact'

/**
 * Página principal de la tienda — Server Component.
 * El carrusel de "destacados" ahora vive en Hero (columna derecha).
 * El Checkout es un modal global gestionado por ClientShell.
 */
export default async function HomePage() {
  let productos = []
  let resenas = []

  try {
    const supabase = await createServerSupabaseClient()

    const { data: dataP } = await supabase
      .from('productos')
      .select('*')
      .order('destacado', { ascending: false })
      .order('nombre', { ascending: true })
    productos = dataP || []

    const { data: dataR } = await supabase
      .from('calificaciones')
      .select('*')
      .eq('aprobado', true)
      .gte('estrellas', 4)
      .order('created_at', { ascending: false })
      .limit(12)
    resenas = dataR || []

  } catch (err) {
    console.error('Error fetching home data:', err)
  }

  return (
    <>
      {/* Hero con carrusel de productos (columna derecha) */}
      <Hero productos={productos} />

      {/* Beneficios */}
      <Benefits />

      {/* Catálogo completo */}
      <ProductGrid productos={productos} />

      {/* Reseñas (con fallback estático) */}
      <Reviews resenas={resenas} />

      {/* Contacto */}
      <Contact />
    </>
  )
}
