'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTheme } from '@/components/ui/ThemeProvider'
import { useCart } from '@/lib/store/cart-store'
import styles from './Nav.module.css'

export default function Nav({ onCartOpen }: { onCartOpen: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const { totalItems } = useCart()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const waNumber = process.env.NEXT_PUBLIC_WA_NUMBER || ''

  return (
    <nav className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`} id="main-nav">
      <div className={`container ${styles.inner}`}>
        {/* Logo */}
        <Link href="/" className={styles.logo} id="nav-logo">
          <Image
            src="/assets/icons/icon-192.png"
            alt="Limpieza RR"
            width={36}
            height={36}
            className={styles.logoImg}
            priority
          />
          <span className={styles.logoText}>Limpieza RR</span>
          <span className={styles.logoBadge}>Premium</span>
        </Link>

        {/* Desktop Links */}
        <div className={`${styles.links} ${menuOpen ? styles.linksOpen : ''}`}>
          <Link href="/" className={styles.link} onClick={() => setMenuOpen(false)}>
            Inicio
          </Link>
          <Link href="/#productos" className={styles.link} onClick={() => setMenuOpen(false)}>
            Productos
          </Link>
          <Link href="/#beneficios" className={styles.link} onClick={() => setMenuOpen(false)}>
            Beneficios
          </Link>
          <Link href="/#resenas" className={styles.link} onClick={() => setMenuOpen(false)}>
            Reseñas
          </Link>
          <Link href="/#contacto" className={styles.link} onClick={() => setMenuOpen(false)}>
            Contacto
          </Link>
          <Link href="/pedidos" className={styles.link} onClick={() => setMenuOpen(false)}>
            Mis Pedidos
          </Link>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          {/* Theme toggle */}
          <button
            className={styles.iconBtn}
            onClick={toggleTheme}
            aria-label="Cambiar tema"
            id="theme-toggle"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          {/* WhatsApp */}
          {waNumber && (
            <a
              href={`https://wa.me/${waNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.iconBtn} ${styles.waBtn}`}
              aria-label="WhatsApp"
              id="nav-whatsapp"
            >
              💬
            </a>
          )}

          {/* Cart */}
          <button
            className={styles.cartBtn}
            onClick={onCartOpen}
            aria-label="Ver carrito"
            id="nav-cart"
          >
            🛒
            {totalItems > 0 && (
              <span className={styles.cartBadge}>{totalItems}</span>
            )}
          </button>

          {/* Hamburger */}
          <button
            className={`${styles.hamburger} ${menuOpen ? styles.hamburgerOpen : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Abrir menú"
            id="nav-hamburger"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {menuOpen && (
        <div className={styles.mobileOverlay} onClick={() => setMenuOpen(false)} />
      )}
    </nav>
  )
}
