'use client'

import styles from './Reviews.module.css'
import type { CalificacionAPI } from '@/lib/store/api-client'

// Reseñas estáticas de fallback si la BD está vacía
const FALLBACK_RESENAS: CalificacionAPI[] = [
  { id: 1, telefono: '300', estrellas: 5, comentario: 'Excelentes productos, el eliminador de olores es increíble. Mi casa siempre huele rico 🌸', created_at: '' },
  { id: 2, telefono: '312', estrellas: 5, comentario: 'El desengrasante es lo mejor que he probado, limpia todo en segundos. ¡Muy recomendado!', created_at: '' },
  { id: 3, telefono: '320', estrellas: 5, comentario: 'Pedí por primera vez y quedé encantada. Llegó rápido y los productos son de muy buena calidad ✨', created_at: '' },
  { id: 4, telefono: '314', estrellas: 5, comentario: 'El multiusos funciona genial en la cocina y el baño. Definitivamente volvería a comprar.', created_at: '' },
  { id: 5, telefono: '321', estrellas: 5, comentario: 'Las fragancias son espectaculares. Mi favorito es el de lavanda, deja el ambiente fresco todo el día 💜', created_at: '' },
  { id: 6, telefono: '318', estrellas: 5, comentario: 'Atención excelente, precios justos y entrega puntual. ¡100% recomendado para el hogar!', created_at: '' },
]

export default function Reviews({ resenas }: { resenas: CalificacionAPI[] }) {
  // Usar reseñas de DB o fallback; siempre mostrar la sección
  const displayResenas = resenas && resenas.length > 0 ? resenas : FALLBACK_RESENAS

  return (
    <section className={styles.section} id="resenas">
      <div className="container">
        <h2 className="section-title" style={{ textAlign: 'center' }}>Lo que dicen nuestros clientes</h2>
        <p className="section-subtitle" style={{ textAlign: 'center', marginBottom: 'var(--space-3xl)' }}>
          Cientos de hogares brillan con Limpieza RR ✨
        </p>

        <div className={styles.scrollContainer}>
          <div className={styles.track}>
            {[...displayResenas, ...displayResenas].map((r, i) => (
              <div key={i} className={styles.card}>
                <div className={styles.stars}>
                  {'⭐'.repeat(r.estrellas || 5)}
                </div>
                <p className={styles.comment}>"{r.comentario}"</p>
                <div className={styles.footer}>
                  <div className={styles.avatar}>
                    {r.telefono?.substring(0, 3) || '👤'}
                  </div>
                  <div className={styles.info}>
                    <strong>Cliente Verificado</strong>
                    <span>{r.telefono ? `Termina en ${r.telefono.slice(-4)}` : 'Bogotá, CO'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
