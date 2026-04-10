import { validateAdminSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default async function DashboardPage() {
  const session = await validateAdminSession()
  if (!session) redirect('/admin/login')

  return <DashboardClient />
}
