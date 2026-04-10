import Link from 'next/link'
import Image from 'next/image'
import styles from './Footer.module.css'

export default function Footer() {
  const waNumber = process.env.NEXT_PUBLIC_WA_NUMBER || '573503443140'
  const year = new Date().getFullYear()

  return (
    <footer className={styles.footer} id="contacto">
      <div className={`container ${styles.inner}`}>
        <div className={styles.grid}>

          {/* Col 1 — Brand */}
          <div className={styles.brand}>
            <div className={styles.logo}>
              <Image
                src="/assets/icons/icon-192.png"
                alt="Limpieza RR"
                width={40}
                height={40}
                style={{ borderRadius: '50%', filter: 'drop-shadow(0 2px 8px rgba(16,185,129,0.3))' }}
              />
              <span className={styles.logoText}>Limpieza RR</span>
            </div>
            <p className={styles.tagline}>
              Productos de aseo premium para tu hogar y negocio.
              Calidad profesional, precios accesibles.
            </p>
            <a
              href={`https://wa.me/${waNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.9rem', marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              💬 Pedir por WhatsApp
            </a>
          </div>

          {/* Col 2 — Navegación */}
          <div className={styles.col}>
            <h3 className={styles.colTitle}>Navegación</h3>
            <Link href="/" className={styles.footerLink}>Inicio</Link>
            <Link href="/#productos" className={styles.footerLink}>Catálogo</Link>
            <Link href="/#beneficios" className={styles.footerLink}>¿Por qué Premium?</Link>
            <Link href="/#resenas" className={styles.footerLink}>Reseñas</Link>
            <Link href="/#contacto" className={styles.footerLink}>Contáctanos</Link>
          </div>

          {/* Col 3 — Mi Cuenta */}
          <div className={styles.col}>
            <h3 className={styles.colTitle}>Mi Cuenta</h3>
            <Link href="/pedidos" className={styles.footerLink}>Mis pedidos</Link>
            <Link href="/pedidos" className={styles.footerLink}>Rastrear pedido</Link>
            <Link href="/admin" className={styles.footerLink}>Panel de Admin</Link>
          </div>

          {/* Col 4 — Contacto */}
          <div className={styles.col}>
            <h3 className={styles.colTitle}>Contacto</h3>
            <a
              href={`https://wa.me/${waNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.footerLink} ${styles.waLink}`}
            >
              📱 +57 {waNumber.slice(2, 5)} {waNumber.slice(5, 8)} {waNumber.slice(8, 12)}
            </a>
            <span className={styles.footerLink}>🕐 Lun–Sáb · 8 am – 6 pm</span>
            <span className={styles.footerLink} style={{ marginTop: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              📍 Bogotá, Colombia
            </span>
            <span className={styles.footerLink}>🚚 Envíos a toda la ciudad</span>
            <span className={styles.footerLink}>🏙️ Solo pedidos en Bogotá</span>
          </div>

        </div>

        {/* Bottom */}
        <div className={styles.bottom}>
          <p>© {year} Limpieza RR. Todos los derechos reservados.</p>
          <p className={styles.tech}>Hecho con ❤️ en Bogotá 🇨🇴</p>
        </div>
      </div>
    </footer>
  )
}
