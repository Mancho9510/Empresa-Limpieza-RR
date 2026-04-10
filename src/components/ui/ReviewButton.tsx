'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import styles from './ReviewButton.module.css'

export default function ReviewButton() {
  const [open, setOpen] = useState(false)
  const [estrellas, setEstrellas] = useState(5)
  const [comentario, setComentario] = useState('')
  const [telefono, setTelefono] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/resenas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estrellas, comentario, telefono }),
      })
      const data = await res.json()
      if (data.ok) {
        setSent(true)
        toast('¡Gracias por tu reseña! 🌟', 'success')
        setTimeout(() => {
          setOpen(false)
          setSent(false)
          setComentario('')
          setTelefono('')
          setEstrellas(5)
        }, 2500)
      } else {
        toast(data.error || 'Error al enviar', 'error')
      }
    } catch {
      toast('Error de conexión', 'error')
    }
    setLoading(false)
  }

  return (
    <>
      {/* Overlay */}
      {open && <div className={styles.overlay} onClick={() => setOpen(false)} />}

      {/* Panel de reseña */}
      {open && (
        <div className={styles.panel} role="dialog" aria-label="Dejar reseña">
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>⭐ Deja tu reseña</h3>
            <button className={styles.closeBtn} onClick={() => setOpen(false)}>✕</button>
          </div>

          {sent ? (
            <div className={styles.sentState}>
              <span className={styles.sentIcon}>🌟</span>
              <h4>¡Muchas gracias!</h4>
              <p>Tu reseña ha sido enviada y la compartiremos con otros clientes.</p>
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit}>
              <p className={styles.formHint}>Cuéntanos cómo fue tu experiencia con Limpieza RR</p>

              {/* Estrellas */}
              <div className={styles.starRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`${styles.star} ${s <= estrellas ? styles.starOn : ''}`}
                    onClick={() => setEstrellas(s)}
                    onMouseEnter={() => setEstrellas(s)}
                    aria-label={`${s} estrella${s > 1 ? 's' : ''}`}
                  >
                    ★
                  </button>
                ))}
                <span className={styles.starCount}>{estrellas}/5</span>
              </div>

              <textarea
                className={styles.textarea}
                placeholder="Ej: Excelentes productos, llegaron rápido y la calidad es increíble..."
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                rows={4}
                required
                maxLength={500}
              />
              <span className={styles.charCount}>{comentario.length}/500</span>

              <input
                className={styles.input}
                type="tel"
                placeholder="Tu teléfono (opcional, para verificar la compra)"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                maxLength={15}
              />

              <button
                type="submit"
                className={`btn btn-primary ${styles.submitBtn}`}
                disabled={loading || !comentario.trim()}
              >
                {loading ? '⏳ Enviando...' : '✅ Publicar reseña'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* FAB flotante */}
      <button
        className={styles.fab}
        onClick={() => setOpen(!open)}
        aria-label="Dejar una reseña"
        id="review-fab"
        title="Dejar una reseña"
      >
        <span className={styles.fabIcon}>⭐</span>
        <span className={styles.fabLabel}>Reseña</span>
      </button>
    </>
  )
}
