'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useToast } from '@/components/ui/Toast'
import styles from './PedidosClient.module.css'

// Orden de los estados del envío para la barra de progreso
const ESTADOS_ENVIO = [
  { key: 'Recibido',     label: 'Recibido',    icon: '📥' },
  { key: 'En preparación', label: 'Preparando', icon: '📦' },
  { key: 'En camino',   label: 'En camino',    icon: '🛵' },
  { key: 'Entregado',   label: 'Entregado',    icon: '✅' },
]

const ESTADOS_CANCELADO = ['Cancelado', 'CANCELADO']

function getStepIndex(estado: string): number {
  const idx = ESTADOS_ENVIO.findIndex(e => e.key === estado)
  return idx
}

function getStatusColor(estado: string): string {
  if (ESTADOS_CANCELADO.includes(estado)) return 'var(--color-error)'
  switch (estado) {
    case 'Entregado': return 'var(--color-success)'
    case 'En camino': return 'var(--color-info)'
    case 'En preparación': return 'var(--color-warning)'
    default: return 'var(--text-tertiary)'
  }
}

function getPaymentLabel(pago: string): string {
  const map: Record<string, string> = {
    NEQUI: '💜 Nequi', DAVIPLATA: '❤️ Daviplata', BREB: '💙 Breb',
    TRANSFERENCIA: '🏦 Transferencia', CONTRA_ENTREGA: '🚪 Contra entrega',
    NEQUI_DAVIPLATA: '📱 Nequi / Daviplata',
  }
  return map[pago] || pago
}

// ── Formulario de reseña inline ──────────────────────────────
function ReviewForm({ pedidoId, onSuccess }: { pedidoId?: number; onSuccess?: () => void }) {
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
        toast('¡Gracias por tu reseña! ✨', 'success')
        onSuccess?.()
      } else {
        toast(data.error || 'Error al enviar', 'error')
      }
    } catch {
      toast('Error de conexión', 'error')
    }
    setLoading(false)
  }

  if (sent) {
    return (
      <div className={styles.reviewSent}>
        <span>🌟</span>
        <p>¡Gracias por tu calificación! La compartiremos con otros clientes.</p>
      </div>
    )
  }

  return (
    <form className={styles.reviewForm} onSubmit={handleSubmit}>
      <p className={styles.reviewTitle}>⭐ Deja tu reseña</p>
      
      {/* Estrellas */}
      <div className={styles.starPicker}>
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            className={`${styles.star} ${s <= estrellas ? styles.starActive : ''}`}
            onClick={() => setEstrellas(s)}
            aria-label={`${s} estrellas`}
          >★</button>
        ))}
        <span className={styles.starLabel}>{estrellas} / 5</span>
      </div>

      <textarea
        className={styles.reviewTextarea}
        placeholder="Cuéntanos tu experiencia con Limpieza RR..."
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        rows={3}
        maxLength={500}
        required
      />

      <input
        className={styles.reviewInput}
        type="tel"
        placeholder="Tu teléfono (opcional, para verificar)"
        value={telefono}
        onChange={(e) => setTelefono(e.target.value)}
        maxLength={15}
      />

      <button type="submit" className="btn btn-primary" disabled={loading} style={{ alignSelf: 'flex-end' }}>
        {loading ? '⏳ Enviando...' : '✅ Enviar reseña'}
      </button>
    </form>
  )
}

// ── Componente principal ──────────────────────────────────────
export default function PedidosClient() {
  const [telefono, setTelefono] = useState('')
  const [pedidos, setPedidos] = useState<any[]>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [expandedReview, setExpandedReview] = useState<number | null>(null)
  const { toast } = useToast()

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!telefono || telefono.length < 5) return

    setLoading(true)
    try {
      const res = await fetch(`/api/pedidos/tracking?telefono=${telefono.replace(/[^0-9]/g, '')}`)
      const data = await res.json()

      if (data.ok) {
        setPedidos(data.data || [])
        setSearched(true)
        if ((data.data || []).length === 0) {
          toast('No encontramos pedidos con este número', 'warning')
        }
      } else {
        toast(data.error || 'No pudimos consultar tus pedidos', 'error')
      }
    } catch {
      toast('Error de conexión', 'error')
    }
    setLoading(false)
  }

  return (
    <div className={styles.page}>
      <div className={`container ${styles.wrap}`}>

        {/* ── Header ── */}
        <div className={styles.header}>
          <Link href="/" className={styles.back}>← Volver a la tienda</Link>
          <h1 className={styles.title}>📦 Rastrear mi pedido</h1>
          <p className={styles.subtitle}>
            Ingresa el número de WhatsApp con el que hiciste tu pedido para ver su estado en tiempo real.
          </p>
        </div>

        {/* ── Buscador ── */}
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <input
            type="tel"
            placeholder="Ej: 3001234567"
            className={styles.searchInput}
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            required
            id="telefono-rastreo"
          />
          <button type="submit" className="btn btn-primary" disabled={loading} id="btn-rastrear">
            {loading ? '⏳ Buscando...' : '🔍 Rastrear'}
          </button>
        </form>

        {/* ── Sin resultados ── */}
        {searched && pedidos.length === 0 && (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>🕵️</span>
            <h3>No encontramos pedidos</h3>
            <p>Verifica que el número sea el mismo con el que hiciste tu pedido.</p>
            <Link href="/#productos" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Hacer un pedido
            </Link>
          </div>
        )}

        {/* ── Lista de pedidos ── */}
        <div className={styles.pedidosList}>
          {pedidos.map((p) => {
            const stepIdx = getStepIndex(p.estado_envio)
            const isCancelled = ESTADOS_CANCELADO.includes(p.estado_envio)
            const isDelivered = p.estado_envio === 'Entregado'
            const statusColor = getStatusColor(p.estado_envio)

            return (
              <div key={p.id} className={styles.pedidoCard}>
                {/* ── Cabecera del pedido ── */}
                <div className={styles.pedidoHeader}>
                  <div>
                    <span className={styles.pedidoId}>Pedido #{p.id}</span>
                    <span className={styles.pedidoDate}>
                      {new Date(p.fecha).toLocaleDateString('es-CO', {
                        weekday: 'long', day: 'numeric', month: 'long',
                      })}
                    </span>
                  </div>
                  <div className={styles.pedidoRight}>
                    <span className={styles.pedidoTotal}>
                      ${p.total?.toLocaleString('es-CO')}
                    </span>
                    <span className={styles.pedidoPago}>{getPaymentLabel(p.pago)}</span>
                  </div>
                </div>

                {/* ── Estado actual ── */}
                <div className={styles.estadoActual} style={{ color: statusColor }}>
                  <span className={styles.estadoDot} style={{ background: statusColor }} />
                  <strong>{isCancelled ? '❌ CANCELADO' : p.estado_envio.toUpperCase()}</strong>
                </div>

                {/* ── Barra de progreso (si no es cancelado) ── */}
                {!isCancelled && (
                  <div className={styles.progressWrap}>
                    {ESTADOS_ENVIO.map((step, idx) => {
                      const done = idx <= stepIdx
                      const active = idx === stepIdx
                      return (
                        <div key={step.key} className={styles.progressStep}>
                          <div className={`${styles.progressCircle} ${done ? styles.progressDone : ''} ${active ? styles.progressActive : ''}`}>
                            {done ? step.icon : <span className={styles.progressNum}>{idx + 1}</span>}
                          </div>
                          <span className={`${styles.progressLabel} ${done ? styles.progressLabelDone : ''}`}>
                            {step.label}
                          </span>
                          {idx < ESTADOS_ENVIO.length - 1 && (
                            <div className={`${styles.progressLine} ${idx < stepIdx ? styles.progressLineDone : ''}`} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* ── Artículos ── */}
                <div className={styles.articulos}>
                  <strong className={styles.articulosTitle}>📦 Artículos:</strong>
                  <ul className={styles.articulosList}>
                    {p.productos_json?.map((item: any, i: number) => (
                      <li key={i} className={styles.articuloItem}>
                        <span>{item.emoji || '📦'}</span>
                        <span>{item.nombre}{item.tamano ? ` (${item.tamano})` : ''}</span>
                        <span className={styles.articuloQty}>×{item.qty || item.cantidad || 1}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* ── Reseña (si entregado) ── */}
                {isDelivered && (
                  <div className={styles.reviewSection}>
                    {expandedReview === p.id ? (
                      <ReviewForm
                        pedidoId={p.id}
                        onSuccess={() => setExpandedReview(null)}
                      />
                    ) : (
                      <button
                        className={`btn btn-secondary btn-sm ${styles.reviewBtn}`}
                        onClick={() => setExpandedReview(p.id)}
                      >
                        ⭐ Dejar una reseña
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Sección de reseña sin pedido ── */}
        <div className={styles.generalReview}>
          <h2 className={styles.generalTitle}>💬 ¿Ya compraste con nosotros?</h2>
          <p className={styles.generalSubtitle}>Comparte tu experiencia y ayuda a otros clientes</p>
          <ReviewForm />
        </div>

      </div>
    </div>
  )
}
