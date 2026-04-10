import { createBrowserClient } from '@supabase/ssr'

/**
 * Cliente Supabase para el BROWSER (Client Components).
 * Usa la anon key — las RLS policies controlan el acceso.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
