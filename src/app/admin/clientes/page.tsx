import { validateAdminSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import AdminClientesClient from './ClientesClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Directorio de Clientes',
}

export default async function AdminClientesPage() {
  const session = await validateAdminSession()
  if (!session) redirect('/admin/login')

  return <AdminClientesClient />
}
