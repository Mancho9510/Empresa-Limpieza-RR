import { validateAdminSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import AdminPedidosClient from './PedidosClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Gestor de Pedidos',
}

export default async function AdminPedidosPage() {
  const session = await validateAdminSession()
  if (!session) redirect('/admin/login')

  return <AdminPedidosClient />
}
