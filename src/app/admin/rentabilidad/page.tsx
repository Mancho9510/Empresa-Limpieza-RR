import { validateAdminSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import AdminRentabilidadClient from './RentabilidadClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Rentabilidad Financiera',
}

export default async function AdminRentabilidadPage() {
  const session = await validateAdminSession()
  if (!session) redirect('/admin/login')

  return <AdminRentabilidadClient />
}
