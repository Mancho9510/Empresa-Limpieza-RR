'use client'

import { useState } from 'react'
import { useCart } from '@/lib/store/cart-store'
import { useToast } from '@/components/ui/Toast'
import { validarCupon } from '@/lib/store/api-client'
import styles from './Cart.module.css'

interface CartProps {
  isOpen: boolean
  onClose: () => void
  onCheckout: () => void
}

export default function Cart({ isOpen, onClose, onCheckout }: CartProps) {
  const { items, coupon, totalItems, subtotal, discount, total, updateQty, removeItem, applyCoupon, removeCoupon, clearCart } = useCart()
  const { toast } = useToast()
  const [couponCode, setCouponCode] = useState('')
  const [applying, setApplying] = useState(false)

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return
    setApplying(true)
    try {
      const res = await validarCupon(couponCode.trim())
      if (res.ok && res.cupon) {
        applyCoupon(res.cupon)
        toast(`Cupón aplicado: ${res.cupon.label}`, 'success')
        setCouponCode('')
      } else {
        toast(res.error || 'Cupón no válido', 'error')
      }
    } catch {
      toast('Error al validar cupón', 'error')
    }
    setApplying(false)
  }

  const fmt = (n: number) => n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })

  if (!isOpen) return null

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <aside className={styles.sidebar} id="cart-sidebar">
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>🛒 Tu Carrito</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar carrito">✕</button>
        </div>

        {items.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>🧹</span>
            <p>Tu carrito está vacío</p>
            <button className="btn btn-primary" onClick={onClose}>
              Ver productos
            </button>
          </div>
        ) : (
          <>
            {/* Items */}
            <div className={styles.items}>
              {items.map((item) => (
                <div key={item.id} className={styles.item}>
                  <div className={styles.itemInfo}>
                    <span className={styles.itemEmoji}>{item.emoji || '📦'}</span>
                    <div>
                      <p className={styles.itemName}>{item.nombre}</p>
                      {item.tamano && (
                        <p className={styles.itemSize}>{item.tamano}</p>
                      )}
                      <p className={styles.itemPrice}>{fmt(item.precio)}</p>
                    </div>
                  </div>
                  <div className={styles.itemActions}>
                    <div className={styles.qtyControls}>
                      <button
                        className={styles.qtyBtn}
                        onClick={() => updateQty(item.id, item.qty - 1)}
                        aria-label="Quitar uno"
                      >
                        −
                      </button>
                      <span className={styles.qtyValue}>{item.qty}</span>
                      <button
                        className={styles.qtyBtn}
                        onClick={() => updateQty(item.id, item.qty + 1)}
                        aria-label="Agregar uno"
                      >
                        +
                      </button>
                    </div>
                    <button
                      className={styles.removeBtn}
                      onClick={() => removeItem(item.id)}
                      aria-label="Eliminar"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Coupon */}
            <div className={styles.couponSection}>
              {coupon ? (
                <div className={styles.couponApplied}>
                  <span>🏷️ {coupon.label}</span>
                  <button className={styles.removeCoupon} onClick={removeCoupon}>✕</button>
                </div>
              ) : (
                <div className={styles.couponInput}>
                  <input
                    type="text"
                    placeholder="Código de cupón"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                    id="coupon-input"
                  />
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleApplyCoupon}
                    disabled={applying}
                    id="apply-coupon"
                  >
                    {applying ? '...' : 'Aplicar'}
                  </button>
                </div>
              )}
            </div>

            {/* Totals */}
            <div className={styles.totals}>
              <div className={styles.totalRow}>
                <span>Subtotal ({totalItems} items)</span>
                <span>{fmt(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className={`${styles.totalRow} ${styles.discount}`}>
                  <span>Descuento</span>
                  <span>-{fmt(discount)}</span>
                </div>
              )}
              <div className={`${styles.totalRow} ${styles.totalFinal}`}>
                <span>Total</span>
                <span>{fmt(total)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className={styles.footerActions}>
              <button
                className="btn btn-primary btn-lg"
                style={{ width: '100%', textAlign: 'center' }}
                onClick={onCheckout}
                id="go-to-checkout"
              >
                🛞 Finalizar compra
              </button>
              <button className="btn btn-ghost btn-sm" onClick={clearCart} style={{ width: '100%' }}>
                Vaciar carrito
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  )
}
