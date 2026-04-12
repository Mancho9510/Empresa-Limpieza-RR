'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import confetti from 'canvas-confetti'
import styles from './success.module.css'
import { postResena } from '@/lib/store/api-client'
import { useToast } from '@/components/ui/Toast'

interface OrderItem {
  id: string
  nombre: string
  tamano?: string
  precio: number
  qty: number
  emoji?: string
}

interface OrderData {
  id: number
  nombre: string
  telefono: string
  correo?: string
  ciudad: string
  barrio: string
  direccion: string
  casa?: string
  pago: string
  zona_envio?: string
  items: OrderItem[]
  subtotal: number
  discount: number
  total: number
  coupon?: string | null
}

const METODOS: Record<string, string> = {
  NEQUI: 'Nequi 💜',
  TRANSFERENCIA: 'Transferencia Bancaria 🏦',
  BREB: 'Breb 💙',
  DAVIPLATA: 'Daviplata ❤️',
  CONTRA_ENTREGA: 'Contra Entrega 🚪',
}

const WhatsAppIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '1.2em', height: '1.2em', verticalAlign: 'middle', marginRight: '6px' }}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
  </svg>
)

export default function CheckoutSuccessPage() {
  const router = useRouter()
  const [order, setOrder] = useState<OrderData | null>(null)
  const [waLink, setWaLink] = useState('')

  // Reseñas state
  const [showReview, setShowReview] = useState(false)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [nextAction, setNextAction] = useState<(() => void) | null>(null)
  const { toast } = useToast()

  const fmt = (n: number) =>
    (n ?? 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })

  useEffect(() => {
    // Cargar datos del pedido desde sessionStorage
    try {
      const raw = sessionStorage.getItem('lrr_last_order')
      if (raw) {
        const data: OrderData = JSON.parse(raw)
        setOrder(data)

        const phone = process.env.NEXT_PUBLIC_WA_NUMBER || '573503443140'
        const orderId = `LRR-${String(data.id || '?').padStart(5, '0')}`
        const pago = METODOS[data.pago] || data.pago
        let msg = `¡Hola Limpieza RR! 👋 Acabo de confirmar mi pedido *${orderId}*\n\n`
        msg += `*Nombre:* ${data.nombre}\n`
        msg += `*Teléfono:* ${data.telefono}\n`
        msg += `*Dirección:* ${data.direccion}${data.casa ? ', ' + data.casa : ''}, ${data.barrio} (${data.ciudad})\n`
        if (data.zona_envio) msg += `*Zona:* ${data.zona_envio}\n`
        msg += `*Método de pago:* ${pago}\n\n`
        msg += `*Productos:*\n`
        data.items?.forEach(item => {
          msg += `• ${item.emoji || '📦'} ${item.nombre}${item.tamano ? ` ${item.tamano}` : ''} ×${item.qty} = ${fmt(item.precio * item.qty)}\n`
        })
        msg += `\n*Total:* ${fmt(data.total)} + envío\n`
        if (data.pago !== 'CONTRA_ENTREGA') {
          msg += `\n_Adjunto el comprobante de pago._`
        }
        setWaLink(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`)
      }
    } catch {}

    // Confetti 🎉
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.55 }, colors: ['#10b981', '#34d399', '#6ee7b7', '#ffffff', '#fbbf24'] })
    setTimeout(() => confetti({ particleCount: 60, spread: 60, origin: { y: 0.6, x: 0.2 }, colors: ['#10b981', '#fff'] }), 400)
    setTimeout(() => confetti({ particleCount: 60, spread: 60, origin: { y: 0.6, x: 0.8 }, colors: ['#34d399', '#fbbf24'] }), 700)
  }, [])

  const orderId = order ? `LRR-${String(order.id).padStart(5, '0')}` : '...'

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Header */}
        <div className={styles.icon}>🎉</div>
        <h1 className={styles.title}>¡Pedido Confirmado!</h1>
        <p className={styles.orderBadge}>{orderId}</p>
        <p className={styles.desc}>
          Tu orden fue registrada exitosamente.
          {order?.correo && <><br /><span className={styles.emailNote}>📧 Te enviamos un correo a <strong>{order.correo}</strong></span></>}
        </p>

        {/* Resumen del pedido */}
        {order && (
          <div className={styles.summary}>
            {/* Datos de entrega */}
            <div className={styles.summaryBlock}>
              <p className={styles.summaryLabel}>📍 Entrega</p>
              <p className={styles.summaryText}>{order.direccion}{order.casa ? ', ' + order.casa : ''}</p>
              <p className={styles.summaryText}>{order.barrio} — {order.ciudad}</p>
              {order.zona_envio && <p className={styles.summaryText}>{order.zona_envio}</p>}
            </div>

            {/* Método de pago */}
            <div className={styles.summaryBlock}>
              <p className={styles.summaryLabel}>💳 Pago</p>
              <p className={styles.summaryText}>{METODOS[order.pago] || order.pago}</p>
              {order.pago !== 'CONTRA_ENTREGA' && (
                <p className={styles.payNote}>Nequi / Daviplata / Breb: <strong>320 334 6819</strong></p>
              )}
            </div>

            {/* Productos */}
            <div className={styles.itemsList}>
              <p className={styles.summaryLabel}>🛍️ Productos</p>
              {order.items?.map((item, i) => (
                <div key={i} className={styles.item}>
                  <span>{item.emoji || '📦'} {item.nombre}{item.tamano ? ` (${item.tamano})` : ''} ×{item.qty}</span>
                  <span>{fmt(Number(item.precio) * Number(item.qty))}</span>
                </div>
              ))}
              {order.discount > 0 && (
                <div className={`${styles.item} ${styles.discount}`}>
                  <span>🏷️ Descuento {order.coupon ? `(${order.coupon})` : ''}</span>
                  <span>-{fmt(order.discount)}</span>
                </div>
              )}
              <div className={`${styles.item} ${styles.total}`}>
                <span>Total</span>
                <span>{fmt(order.total)}</span>
              </div>
              <p className={styles.shippingNote}>+ Costo de envío a convenir por WhatsApp</p>
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className={styles.actions}>
          {waLink && (
            <a 
              href={waLink} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn btn-primary btn-lg"
              onClick={() => setShowReview(true)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <WhatsAppIcon /> Confirmar por WhatsApp
            </a>
          )}
          <button 
            onClick={() => {
              setNextAction(() => () => router.push('/'))
              setShowReview(true)
            }} 
            className={`btn btn-ghost ${styles.backBtn}`}
          >
            ← Volver a la tienda
          </button>
        </div>
      </div>

      {/* Review Modal */}
      {showReview && (
        <div className="overlay" style={{ zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ background: 'var(--bg-secondary)', padding: 'var(--space-2xl)', borderRadius: 'var(--radius-lg)', maxWidth: '400px', width: '90%', textAlign: 'center', position: 'relative' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: 'var(--space-sm)' }}>
              ¿Cómo calificarías tu experiencia?
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>Nos ayuda a seguir mejorando.</p>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', fontSize: '2.5rem', marginBottom: 'var(--space-lg)' }}>
               {[1, 2, 3, 4, 5].map(star => (
                   <button 
                     key={star} 
                     onClick={() => setRating(star)} 
                     style={{ cursor: 'pointer', opacity: rating >= star ? 1 : 0.3, transition: '0.2s', background: 'transparent', border: 'none', filter: rating >= star ? 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.4))' : 'none' }}
                   >
                     ⭐
                   </button>
               ))}
            </div>

            <textarea 
                placeholder="Opcional: Cuéntanos qué te pareció..." 
                value={comment} 
                onChange={e => setComment(e.target.value)}
                style={{ width: '100%', minHeight: '100px', marginBottom: 'var(--space-lg)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', resize: 'vertical' }}
            />

            <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => {
                    setShowReview(false)
                    if (nextAction) nextAction()
                }}>
                    Saltar
                </button>
                <button className="btn btn-primary" style={{ flex: 2 }} onClick={async () => {
                    setIsSubmittingReview(true)
                    try {
                       await postResena({ telefono: order?.telefono, estrellas: rating, comentario: comment })
                       toast('¡Gracias por tu reseña!', 'success')
                    } catch (e) {
                       toast('Hubo un error al enviar.', 'error')
                    }
                    setShowReview(false)
                    if (nextAction) nextAction()
                }} disabled={isSubmittingReview}>
                    {isSubmittingReview ? 'Enviando...' : 'Enviar Reseña'}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
