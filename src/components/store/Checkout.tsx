'use client'

import { useState } from 'react'
import { useCart } from '@/lib/store/cart-store'
import { useToast } from '@/components/ui/Toast'
import styles from './Checkout.module.css'

interface CheckoutProps {
  isOpen: boolean
  onClose: () => void
}

const ZONAS_BOGOTA = [
  '— Selecciona tu zona —',
  'Zona 1 — Centro (Candelaria, Santa Fe)',
  'Zona 2 — Norte (Usaquén, Chapinero)',
  'Zona 3 — Sur (Kennedy, Bosa, Ciudad Bolívar)',
  'Zona 4 — Occidente (Engativá, Fontibón)',
  'Zona 5 — Noroccidente (Suba, Barrios Unidos)',
]

const METODOS_PAGO = [
  { value: 'TRANSFERENCIA', label: 'Transferencia Bancaria', icon: '🏦' },
  { value: 'NEQUI',         label: 'Nequi',                 icon: '💜' },
  { value: 'BREB',          label: 'Breb',                  icon: '💙' },
  { value: 'DAVIPLATA',     label: 'Daviplata',             icon: '❤️' },
  { value: 'CONTRA_ENTREGA', label: 'Contra entrega',       icon: '🚪' },
]

export default function Checkout({ isOpen, onClose }: CheckoutProps) {
  const { items, total, subtotal, discount, coupon, clearCart } = useCart()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    correo: '',
    ciudad: 'Bogotá',
    departamento: 'Cundinamarca',
    barrio: '',
    direccion: '',
    casa: '',
    conjunto: '',
    nota: '',
    pago: 'NEQUI',
    zona_envio: '',
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const fmt = (n: number) => n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (items.length === 0) {
      toast('Tu carrito está vacío', 'warning')
      return
    }

    setLoading(true)
    try {
      let notasFinales = formData.nota
      try {
        const utmStr = localStorage.getItem('lrr-utm-tracking')
        if (utmStr) {
          const utm = JSON.parse(utmStr)
          notasFinales += `\n[Tracker: source=${utm.source}, medium=${utm.medium}, campaign=${utm.campaign}]`
        }
      } catch (e) {
        // Ignorar si hay error de JSON parse en ls
      }

      const payload = {
        nombre: formData.nombre,
        telefono: formData.telefono.replace(/\D/g, ''),
        ciudad: formData.ciudad,
        departamento: formData.departamento,
        barrio: formData.barrio,
        direccion: formData.direccion,
        casa: formData.casa,
        conjunto: formData.conjunto,
        nota: notasFinales,
        correo: formData.correo.trim(),
        cupon: coupon?.code || '',
        descuento: discount,
        pago: formData.pago,
        zona_envio: formData.zona_envio,
        costo_envio: 0,
        subtotal,
        total,
        productos_json: items.map(item => ({
          id: String(item.id),
          nombre: item.nombre,
          precio: Number(item.precio),
          qty: Number(item.qty),
          tamano: item.tamano || '',
          emoji: item.emoji || '',
        })),
      }

      const res = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (data.ok) {
        // Guardar datos del pedido para la página de éxito
        try {
          sessionStorage.setItem('lrr_last_order', JSON.stringify({
            id: data.id,
            nombre: formData.nombre,
            telefono: formData.telefono,
            correo: formData.correo,
            ciudad: formData.ciudad,
            barrio: formData.barrio,
            direccion: formData.direccion,
            casa: formData.casa,
            pago: formData.pago,
            zona_envio: formData.zona_envio,
            items,
            subtotal,
            discount,
            total,
            coupon: coupon?.code || null,
          }))
        } catch {}

        clearCart()
        onClose()
        window.location.href = '/checkout/success'
      } else {
        toast(data.error || 'Error al procesar el pedido', 'error')
      }
    } catch (err) {
      toast('Error al enviar el pedido', 'error')
      console.error(err)
    }
    setLoading(false)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div className={styles.overlay} onClick={onClose} />

      {/* Panel flotante */}
      <div className={styles.panel} role="dialog" aria-modal="true" aria-label="Finalizar compra">
        {/* Header */}
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>🛍️ Finalizar Compra</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <div className={styles.panelBody}>
          <form onSubmit={handleSubmit} id="checkout-form">

            {/* ─── Datos de entrega ─── */}
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>📦 Datos de entrega</legend>

              <div className={styles.row}>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="co-nombre">Nombre completo *</label>
                  <input
                    id="co-nombre"
                    className={styles.input}
                    name="nombre"
                    required
                    placeholder="Tu nombre completo"
                    value={formData.nombre}
                    onChange={handleChange}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="co-telefono">Teléfono / WhatsApp *</label>
                  <input
                    id="co-telefono"
                    className={styles.input}
                    name="telefono"
                    type="tel"
                    required
                    placeholder="Ej: 3001234567"
                    value={formData.telefono}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="co-correo">
                  Correo electrónico <span style={{fontWeight:400, opacity:0.7}}>(opcional — para confirmación)</span>
                </label>
                <input
                  id="co-correo"
                  className={styles.input}
                  name="correo"
                  type="email"
                  placeholder="Ej: tucorreo@gmail.com"
                  value={formData.correo}
                  onChange={handleChange}
                  autoComplete="email"
                />
              </div>

              <div className={styles.row}>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="co-ciudad">Ciudad *</label>
                  <input
                    id="co-ciudad"
                    className={styles.input}
                    name="ciudad"
                    required
                    placeholder="Ej: Bogotá"
                    value={formData.ciudad}
                    onChange={handleChange}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="co-departamento">Departamento *</label>
                  <input
                    id="co-departamento"
                    className={styles.input}
                    name="departamento"
                    required
                    placeholder="Ej: Cundinamarca"
                    value={formData.departamento}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className={styles.row}>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="co-barrio">Barrio *</label>
                  <input
                    id="co-barrio"
                    className={styles.input}
                    name="barrio"
                    required
                    placeholder="Ej: El Campín"
                    value={formData.barrio}
                    onChange={handleChange}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="co-direccion">Dirección *</label>
                  <input
                    id="co-direccion"
                    className={styles.input}
                    name="direccion"
                    required
                    placeholder="Ej: Calle 45 #12-34"
                    value={formData.direccion}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className={styles.row}>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="co-casa">Casa / Apartamento</label>
                  <input
                    id="co-casa"
                    className={styles.input}
                    name="casa"
                    placeholder="Ej: Apto 301"
                    value={formData.casa}
                    onChange={handleChange}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="co-conjunto">Nombre del conjunto</label>
                  <input
                    id="co-conjunto"
                    className={styles.input}
                    name="conjunto"
                    placeholder="Si aplica"
                    value={formData.conjunto}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="co-nota">Nota adicional</label>
                <textarea
                  id="co-nota"
                  className={`${styles.input} ${styles.textarea}`}
                  name="nota"
                  placeholder="Indicaciones (opcional)"
                  value={formData.nota}
                  onChange={handleChange}
                  rows={2}
                />
              </div>
            </fieldset>

            {/* ─── Zona de envío ─── */}
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>🗺️ Zona de envío — Bogotá *</legend>
              <select
                id="co-zona"
                className={styles.input}
                name="zona_envio"
                value={formData.zona_envio}
                onChange={handleChange}
                required
              >
                {ZONAS_BOGOTA.map((z) => (
                  <option key={z} value={z === ZONAS_BOGOTA[0] ? '' : z}>
                    {z}
                  </option>
                ))}
              </select>
              <p className={styles.hint}>El costo de envío se coordinará por WhatsApp.</p>
            </fieldset>

            {/* ─── Medio de pago ─── */}
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>💳 Medio de pago *</legend>
              <div className={styles.paymentGrid}>
                {METODOS_PAGO.map((m) => (
                  <label
                    key={m.value}
                    className={`${styles.paymentOption} ${formData.pago === m.value ? styles.paymentActive : ''}`}
                    htmlFor={`pago-${m.value}`}
                  >
                    <input
                      id={`pago-${m.value}`}
                      type="radio"
                      name="pago"
                      value={m.value}
                      checked={formData.pago === m.value}
                      onChange={handleChange}
                      style={{ display: 'none' }}
                    />
                    <span className={styles.payIcon}>{m.icon}</span>
                    <span className={styles.payLabel}>{m.label}</span>
                  </label>
                ))}
              </div>
              {formData.pago !== 'CONTRA_ENTREGA' && (
                <div className={styles.payInfo}>
                  <p>Transfiere <strong>{fmt(total)}</strong> a:</p>
                  <p className={styles.payAccount}>Nequi / Daviplata / Breb: <strong>320 334 6819</strong></p>
                  <p style={{ fontSize: '0.8rem', marginTop: '4px', opacity: 0.8 }}>Se solicitará el comprobante por WhatsApp.</p>
                </div>
              )}
              {formData.pago === 'CONTRA_ENTREGA' && (
                <div className={styles.payInfo}>
                  <p>Pagarás en efectivo cuando el mensajero entregue tu pedido. 💵</p>
                </div>
              )}
            </fieldset>

          </form>
        </div>

        {/* ─── Resumen + Confirmar ─── */}
        <div className={styles.panelFooter}>
          <div className={styles.summary}>
            <p className={styles.summaryTitle}>📦 Resumen</p>
            <div className={styles.summaryItems}>
              {items.map((item) => (
                <div key={item.id} className={styles.summaryItem}>
                  <span>{item.emoji || '📦'} {item.nombre}{item.tamano ? ` ${item.tamano}` : ''} ×{item.qty}</span>
                  <span>{fmt(item.precio * item.qty)}</span>
                </div>
              ))}
            </div>
            {discount > 0 && (
              <div className={styles.summaryRow}>
                <span>Descuento</span>
                <span style={{ color: 'var(--color-success)' }}>-{fmt(discount)}</span>
              </div>
            )}
            <div className={styles.summaryRow}>
              <span>🚚 Envío</span>
              <span className={styles.shippingNote}>A convenir</span>
            </div>
            <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
              <span>Total a pagar</span>
              <span>{fmt(total)} + envío</span>
            </div>
          </div>

          <button
            type="submit"
            form="checkout-form"
            className={`btn btn-primary ${styles.submitBtn}`}
            disabled={loading || items.length === 0}
          >
            {loading ? '⏳ Procesando...' : `✅ Confirmar pedido · ${fmt(total)}`}
          </button>
        </div>
      </div>
    </>
  )
}
