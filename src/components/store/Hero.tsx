'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCart } from '@/lib/store/cart-store'
import { useToast } from '@/components/ui/Toast'
import type { ProductoAPI } from '@/lib/store/api-client'
import styles from './Hero.module.css'

interface HeroProps {
  productos?: ProductoAPI[]
}

export default function Hero({ productos = [] }: HeroProps) {
  // Mostrar en el carrusel: primero productos con imagen, luego los demás
  // Total máximo: 8 productos para el carrusel
  const withImage = productos.filter((p) => p.imagen)
  const withEmoji = productos.filter((p) => !p.imagen && p.emoji)
  const carouselProducts = [...withImage, ...withEmoji].slice(0, 8)
  const { items, addItem, updateQty } = useCart()
  const { toast } = useToast()
  const [current, setCurrent] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  const getQty = (id: string) => items.find((i) => i.id === id)?.qty || 0

  const handleAdd = (p: ProductoAPI) => {
    addItem({ id: p.id, nombre: p.nombre, tamano: p.tamano, precio: p.precio, emoji: p.emoji, imagen: p.imagen })
    toast(`${p.emoji || '📦'} ${p.nombre} agregado al carrito`, 'success')
  }

  const fmt = (n: number) =>
    n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })

  const next = useCallback(() => {
    setCurrent((c) => (c === carouselProducts.length - 1 ? 0 : c + 1))
  }, [carouselProducts.length])

  const prev = useCallback(() => {
    setCurrent((c) => (c === 0 ? carouselProducts.length - 1 : c - 1))
  }, [carouselProducts.length])

  useEffect(() => {
    if (isPaused || carouselProducts.length <= 1) return
    const timer = setInterval(next, 3500)
    return () => clearInterval(timer)
  }, [isPaused, carouselProducts.length, next])

  return (
    <section className={styles.hero} id="hero">
      <div className={`container ${styles.inner}`}>
        {/* ── Columna izquierda: Texto ── */}
        <div className={styles.content}>
          <div className={styles.badgeWrap}>
            <span className={styles.badge}>✨ Productos Premium</span>
          </div>
          <h1 className={styles.title}>
            Limpieza que{' '}
            <span className="gradient-text">transforma</span>{' '}
            tu hogar
          </h1>
          <p className={styles.subtitle}>
            Descubre nuestra línea premium de productos de limpieza.
            Fórmulas potentes, aromas irresistibles, resultados garantizados.
          </p>
          <div className={styles.ctas}>
            <a href="#productos" className="btn btn-primary btn-lg">
              🛒 Ver Productos
            </a>
            <a
              href={`https://wa.me/${process.env.NEXT_PUBLIC_WA_NUMBER || ''}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-lg"
            >
              💬 WhatsApp
            </a>
          </div>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statNum}>500+</span>
              <span className={styles.statLabel}>Clientes</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statNum}>4.9</span>
              <span className={styles.statLabel}>⭐ Rating</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statNum}>🏠</span>
              <span className={styles.statLabel}>Solo Bogotá</span>
            </div>
          </div>
        </div>

        {/* ── Columna derecha: Carrusel de productos ── */}
        <div className={styles.visual}>
          <div className={styles.glowOrb} />

          {carouselProducts.length > 0 ? (
            <div
              className={styles.heroCarousel}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              {/* Slides */}
              <div className={styles.heroSlides}>
                {carouselProducts.map((p, i) => {
                  const qty = getQty(p.id)
                  const isActive = i === current
                  return (
                    <div
                      key={p.id}
                      className={`${styles.heroSlide} ${isActive ? styles.heroSlideActive : ''}`}
                      aria-hidden={!isActive}
                    >
                      <div className={styles.heroCard}>
                        {p.destacado && (
                          <span className={styles.heroBadge}>⭐ Destacado</span>
                        )}
                        <div className={styles.heroImgWrap}>
                          {p.imagen ? (
                            <img src={p.imagen} alt={p.nombre} className={styles.heroImg} />
                          ) : (
                            <span style={{ fontSize: '5rem', lineHeight: 1 }}>{p.emoji || '📦'}</span>
                          )}
                        </div>
                        <div className={styles.heroCardInfo}>
                          <p className={styles.heroCardName}>{p.nombre}</p>
                          {p.tamano && <span className={styles.heroCardSize}>{p.tamano}</span>}
                          <div className={styles.heroCardFooter}>
                            <span className={styles.heroCardPrice}>{fmt(p.precio)}</span>
                            {qty > 0 ? (
                              <div className={styles.heroQtyControls} onClick={(e) => e.stopPropagation()}>
                                <button className="btn btn-icon btn-sm" onClick={() => updateQty(p.id, qty - 1)}>−</button>
                                <span className={styles.heroQtyVal}>{qty}</span>
                                <button className="btn btn-icon btn-sm" onClick={() => updateQty(p.id, qty + 1)}>+</button>
                              </div>
                            ) : (
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => handleAdd(p)}
                                id={`hero-add-${p.id}`}
                              >
                                + Agregar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Controles */}
              {carouselProducts.length > 1 && (
                <>
                  <button className={`${styles.heroNav} ${styles.heroNavPrev}`} onClick={prev} aria-label="Anterior">‹</button>
                  <button className={`${styles.heroNav} ${styles.heroNavNext}`} onClick={next} aria-label="Siguiente">›</button>
                </>
              )}

              {/* Dots */}
              {carouselProducts.length > 1 && (
                <div className={styles.heroDots}>
                  {carouselProducts.map((_, i) => (
                    <button
                      key={i}
                      className={`${styles.heroDot} ${i === current ? styles.heroDotActive : ''}`}
                      onClick={() => setCurrent(i)}
                      aria-label={`Ir a slide ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Fallback: emojis flotantes si no hay imágenes
            <div className={styles.emojiGrid}>
              <span className={styles.emojiFloat} style={{ animationDelay: '0s' }}>🧹</span>
              <span className={styles.emojiFloat} style={{ animationDelay: '0.5s' }}>🧴</span>
              <span className={styles.emojiFloat} style={{ animationDelay: '1s' }}>✨</span>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
