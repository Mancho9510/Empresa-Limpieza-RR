import { validateAdminSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'

/**
 * /admin — redirects to dashboard if logged in, or login if not.
 */
export default async function AdminPage() {
  const session = await validateAdminSession()
  if (session) {
    redirect('/admin/dashboard')
  } else {
    redirect('/admin/login')
  }
}
