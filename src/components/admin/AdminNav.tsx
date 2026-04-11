'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './AdminNav.module.css'

export default function AdminNav() {
  const pathname = usePathname()
  
  if (pathname === '/admin/login') return null

  const navs = [
    { name: '📊 Dashboard', path: '/admin/dashboard' },
    { name: '📦 Pedidos', path: '/admin/pedidos' },
    { name: '👥 Clientes', path: '/admin/clientes' },
    { name: '💰 Rentabilidad', path: '/admin/rentabilidad' },
    { name: '🏢 Proveedores', path: '/admin/proveedores' },
    { name: '📋 Inventario', path: '/admin/inventario' },
  ]

  return (
    <nav className={styles.navbar}>
      <div className={styles.brand}>
        <img src="/icons/icon-512.png" alt="Limpieza RR" className={styles.logo} />
        <span>Admin RR</span>
      </div>
      <div className={styles.links}>
        {navs.map(n => (
          <Link 
            key={n.path}
            href={n.path}
            className={`${styles.link} ${pathname.startsWith(n.path) ? styles.active : ''}`}
          >
            {n.name}
          </Link>
        ))}
      </div>
      <div className={styles.actions}>
        <Link href="/" className={styles.storeLink}>Ir a la tienda →</Link>
      </div>
    </nav>
  )
}
