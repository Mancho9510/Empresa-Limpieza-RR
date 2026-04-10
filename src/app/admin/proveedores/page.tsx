import { validateAdminSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import AdminProveedoresClient from './ProveedoresClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Directorio de Proveedores',
}

export default async function AdminProveedoresPage() {
  const session = await validateAdminSession()
  if (!session) redirect('/admin/login')

  return <AdminProveedoresClient />
}
