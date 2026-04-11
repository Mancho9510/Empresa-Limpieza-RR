'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import confetti from 'canvas-confetti'
import styles from './success.module.css'

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

export default function CheckoutSuccessPage() {
  const router = useRouter()
  const [order, setOrder] = useState<OrderData | null>(null)
  const [waLink, setWaLink] = useState('')

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
            <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg">
              💬 Confirmar por WhatsApp
            </a>
          )}
          <button onClick={() => router.push('/')} className={`btn btn-ghost ${styles.backBtn}`}>
            ← Volver a la tienda
          </button>
        </div>
      </div>
    </div>
  )
}
