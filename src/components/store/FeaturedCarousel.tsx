'use client'

import { useState, useRef, useEffect } from 'react'
import { useCart } from '@/lib/store/cart-store'
import { useToast } from '@/components/ui/Toast'
import type { ProductoAPI } from '@/lib/store/api-client'
import styles from './FeaturedCarousel.module.css'

interface FeaturedCarouselProps {
  productos: ProductoAPI[]
}

export default function FeaturedCarousel({ productos }: FeaturedCarouselProps) {
  const featured = productos.filter((p) => p.destacado)
  const { items, addItem, updateQty } = useCart()
  const { toast } = useToast()
  const [current, setCurrent] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)
  const [isPaused, setIsPaused] = useState(false)

  const fmt = (n: number) =>
    n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })

  const getQty = (id: string) => items.find((i) => i.id === id)?.qty || 0

  const handleAdd = (p: ProductoAPI) => {
    addItem({ id: p.id, nombre: p.nombre, tamano: p.tamano, precio: p.precio, emoji: p.emoji, imagen: p.imagen })
    toast(`${p.emoji || '📦'} ${p.nombre} agregado al carrito`, 'success')
  }

  const prev = () => setCurrent((c) => (c === 0 ? featured.length - 1 : c - 1))
  const next = () => setCurrent((c) => (c === featured.length - 1 ? 0 : c + 1))

  // Auto-advance — se pausa si isPaused o solo hay 1 slide
  useEffect(() => {
    if (isPaused || featured.length <= 1) return
    const timer = setInterval(() => {
      setCurrent((c) => (c === featured.length - 1 ? 0 : c + 1))
    }, 4000)
    return () => clearInterval(timer)
  }, [isPaused, featured.length])

  // No renderizar si no hay productos destacados (DESPUES de todos los hooks)
  if (featured.length === 0) return null

  return (
    <section className={styles.section} id="destacados">
      <div className="container">
        <h2 className="section-title" style={{ textAlign: 'center' }}>⭐ Productos Destacados</h2>
        <p className="section-subtitle" style={{ textAlign: 'center', marginBottom: 'var(--space-3xl)' }}>
          Lo mejor de nuestra colección premium
        </p>

        <div
          className={styles.carouselWrap}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Prev button */}
          {featured.length > 1 && (
            <button className={`${styles.navBtn} ${styles.navBtnPrev}`} onClick={prev} aria-label="Anterior">
              ‹
            </button>
          )}

          {/* Track */}
          <div className={styles.track} ref={trackRef}>
            {featured.map((p, i) => {
              const qty = getQty(p.id)
              const isActive = i === current
              return (
                <div
                  key={p.id}
                  className={`${styles.slide} ${isActive ? styles.slideActive : ''}`}
                  aria-hidden={!isActive}
                >
                  <div className={styles.card}>
                    {/* Image */}
                    <div className={styles.imageWrap}>
                      {p.imagen ? (
                        <img src={p.imagen} alt={p.nombre} className={styles.image} />
                      ) : (
                        <span className={styles.emoji}>{p.emoji || '📦'}</span>
                      )}
                      <span className={styles.featuredBadge}>⭐ Destacado</span>
                    </div>

                    {/* Info */}
                    <div className={styles.info}>
                      {p.categoria && <span className={styles.cat}>{p.categoria}</span>}
                      <h3 className={styles.name}>{p.nombre}</h3>
                      {p.tamano && <span className={styles.size}>{p.tamano}</span>}
                      {p.descripcion && (
                        <p className={styles.desc}>{p.descripcion.slice(0, 120)}{p.descripcion.length > 120 ? '...' : ''}</p>
                      )}
                      <div className={styles.footer}>
                        <span className={styles.price}>{fmt(p.precio)}</span>
                        <div onClick={(e) => e.stopPropagation()}>
                          {qty > 0 ? (
                            <div className={styles.qtyControls}>
                              <button className="btn btn-icon btn-sm" onClick={() => updateQty(p.id, qty - 1)}>−</button>
                              <span className={styles.qtyValue}>{qty}</span>
                              <button className="btn btn-icon btn-sm" onClick={() => updateQty(p.id, qty + 1)}>+</button>
                            </div>
                          ) : (
                            <button
                              className="btn btn-primary"
                              onClick={() => handleAdd(p)}
                              id={`featured-add-${p.id}`}
                            >
                              🛒 Agregar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Next button */}
          {featured.length > 1 && (
            <button className={`${styles.navBtn} ${styles.navBtnNext}`} onClick={next} aria-label="Siguiente">
              ›
            </button>
          )}
        </div>

        {/* Dots */}
        {featured.length > 1 && (
          <div className={styles.dots}>
            {featured.map((_, i) => (
              <button
                key={i}
                className={`${styles.dot} ${i === current ? styles.dotActive : ''}`}
                onClick={() => setCurrent(i)}
                aria-label={`Ir a slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
