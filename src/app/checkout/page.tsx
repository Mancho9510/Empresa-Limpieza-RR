'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/lib/store/cart-store'
import { useToast } from '@/components/ui/Toast'
import { postPedido } from '@/lib/store/api-client'
import styles from './checkout.module.css'

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart()
  const { toast } = useToast()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    nombre: '',
    telefono: '',
    ciudad: 'Bogotá',
    barrio: '',
    direccion: '',
    metodo_pago: 'Contraentrega',
  })

  // Evitar render si el carrito está vacío (aunque se debería redireccionar)
  if (items.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <h2>Tu carrito está vacío</h2>
        <button className="btn btn-primary" onClick={() => router.push('/')}>Volver a la tienda</button>
      </div>
    )
  }

  const fmt = (n: number) => n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const orderData = {
        nombre: form.nombre,
        telefono: form.telefono,
        ciudad: form.ciudad,
        barrio: form.barrio,
        direccion: form.direccion,
        metodo_pago: form.metodo_pago,
        total: total,
        estado_pago: 'PENDIENTE',
        estado_envio: 'Pendiente',
        productos_json: items.map(i => ({ id: i.id, nombre: i.nombre, qty: i.qty, precio: i.precio, subtotal: i.precio * i.qty }))
      }

      const res = await postPedido(orderData)
      if (res.ok) {
        toast('🎉 ¡Pedido realizado con éxito!', 'success')
        clearCart()
        router.push('/checkout/success')
      } else {
        toast('Error al crear el pedido: ' + res.error, 'error')
      }
    } catch (err) {
      toast('Error de conexión', 'error')
    }
    setLoading(false)
  }

  return (
    <div className={styles.page}>
      <div className="container">
        <h1 className="section-title">Finalizar Compra</h1>
        
        <div className={styles.grid}>
          {/* Form */}
          <div className={styles.formSection}>
            <div className={`card ${styles.card}`}>
              <h2 className={styles.cardTitle}>Datos de Envío</h2>
              
              <form id="checkout-form" onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.fieldGroup}>
                  <div className={styles.field}>
                    <label>Nombre Completo *</label>
                    <input 
                      type="text" 
                      required 
                      value={form.nombre} 
                      onChange={e => setForm({...form, nombre: e.target.value})}
                      placeholder="Ej. Juan Pérez"
                    />
                  </div>
                  <div className={styles.field}>
                    <label>Teléfono (WhatsApp) *</label>
                    <input 
                      type="tel" 
                      required 
                      value={form.telefono} 
                      onChange={e => setForm({...form, telefono: e.target.value})}
                      placeholder="Ej. 3001234567"
                    />
                  </div>
                </div>

                <div className={styles.fieldGroup}>
                  <div className={styles.field}>
                    <label>Ciudad *</label>
                    <select required value={form.ciudad} onChange={e => setForm({...form, ciudad: e.target.value})}>
                      <option value="Bogotá">Bogotá</option>
                      <option value="Medellín">Medellín</option>
                      <option value="Cali">Cali</option>
                      <option value="Otra">Otra</option>
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label>Barrio / Localidad *</label>
                    <input 
                      type="text" 
                      required 
                      value={form.barrio} 
                      onChange={e => setForm({...form, barrio: e.target.value})}
                      placeholder="Ej. Chapinero"
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label>Dirección de Entrega *</label>
                  <input 
                    type="text" 
                    required 
                    value={form.direccion} 
                    onChange={e => setForm({...form, direccion: e.target.value})}
                    placeholder="Ej. Calle 123 #45-67 Apto 801"
                  />
                </div>

                <div className={styles.field}>
                  <label>Método de Pago *</label>
                  <select required value={form.metodo_pago} onChange={e => setForm({...form, metodo_pago: e.target.value})}>
                    <option value="Contraentrega">Efectivo (Contraentrega)</option>
                    <option value="Transferencia">Transferencia Bancaria (Nequi/Daviplata)</option>
                  </select>
                </div>
              </form>
            </div>
          </div>

          {/* Summary */}
          <div className={styles.summarySection}>
            <div className={`card ${styles.card}`}>
              <h2 className={styles.cardTitle}>Resumen del Pedido</h2>
              
              <div className={styles.summaryItems}>
                {items.map(item => (
                  <div key={item.id} className={styles.summaryItem}>
                    <div className={styles.sumName}>
                      {item.qty}x {item.nombre}
                    </div>
                    <div className={styles.sumPrice}>
                      {fmt(item.precio * item.qty)}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className={styles.divider} />
              
              <div className={styles.summaryTotal}>
                <span>Total a Pagar</span>
                <strong>{fmt(total)}</strong>
              </div>

              <p className={styles.disclaimer}>
                * El costo de envío se calculará después de confirmar el pedido vía WhatsApp.
              </p>

              <button 
                type="submit" 
                form="checkout-form"
                className={`btn btn-primary btn-lg ${styles.submitBtn}`}
                disabled={loading}
              >
                {loading ? 'Procesando...' : 'Confirmar Pedido'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
