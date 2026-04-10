import { validateAdminSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import AdminInventarioClient from './InventarioClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Inventario y Catálogo',
}

export default async function AdminInventarioPage() {
  const session = await validateAdminSession()
  if (!session) redirect('/admin/login')

  return <AdminInventarioClient />
}
