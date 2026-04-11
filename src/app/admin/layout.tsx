import { validateAdminSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import styles from './admin.module.css'

import AdminNav from '@/components/admin/AdminNav'

/**
 * Admin Layout — Server Component.
 * Verifica la sesión del admin. Si no hay sesión, redirige a login.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  // No verificar sesión en la página de login
  // La verificación se hace condicionalmente en cada sub-page
  return (
    <div className={styles.adminContainer}>
      <AdminNav />
      {children}
    </div>
  )
}
