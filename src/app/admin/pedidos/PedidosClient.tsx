'use client'

import { useState, useEffect } from 'react'
import { fetchPedidos, postAccionPedido, type PedidoAPI } from '@/lib/store/api-client'
import { useToast } from '@/components/ui/Toast'
import styles from './pedidos.module.css'

export default function AdminPedidosClient() {
  const [pedidos, setPedidos] = useState<PedidoAPI[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [archivados, setArchivados] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [archivados])

  const loadData = async () => {
    setLoading(true)
    try {
      const qs = { archivado: String(archivados), q: search }
      const res = await fetchPedidos(qs)
      if (res.ok) setPedidos(res.data)
    } catch {
      toast('Error al cargar pedidos', 'error')
    }
    setLoading(false)
  }

  const handleEstado = async (id: number, campo: 'estado_pago' | 'estado_envio', valor: string) => {
    try {
      const res = await postAccionPedido('actualizar_estado', { id, campo, valor })
      if (res.ok) {
        toast(`Estado actualizado: ${valor}`, 'success')
        setPedidos(prev => prev.map(p => p.id === id ? { ...p, [campo]: valor } : p))
      } else {
        toast('Error al actualizar', 'error')
      }
    } catch {
      toast('Error de red', 'error')
    }
  }

  const handleAction = async (id: number, accion: string) => {
    if (!confirm('¿Estás seguro de realizar esta acción?')) return
    try {
      const res = await postAccionPedido(accion, { id })
      if (res.ok) {
        toast('Acción completada', 'success')
        loadData()
      } else {
        toast('Error en la acción', 'error')
      }
    } catch {
      toast('Error de red', 'error')
    }
  }

  const fmt = (n: number) => n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })
  const dFmt = (d: string) => new Date(d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>📋 Gestión de Pedidos</h1>
          <a href="/admin/dashboard" className={styles.backLink}>← Volver al Dashboard</a>
        </div>
        <div className={styles.actions}>
          <input 
            type="text" 
            placeholder="Buscar por nombre, tel..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loadData()}
            className={styles.searchInput}
          />
          <button className="btn btn-secondary" onClick={loadData}>🔎 Buscar</button>
          <button 
            className={`btn ${archivados ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setArchivados(!archivados)}
          >
            {archivados ? 'Ver Activos' : 'Ver Archivados'}
          </button>
        </div>
      </header>

      {loading ? (
        <div className={styles.loading}><div className={styles.spinner} /></div>
      ) : (
        <div className={styles.grid}>
          {pedidos.length === 0 && <p className={styles.empty}>No se encontraron pedidos</p>}
          {pedidos.map(p => (
            <div key={p.id} className={`card ${styles.card}`}>
              <div className={styles.cardHeader}>
                <div>
                  <h3>#{p.id} - {p.nombre}</h3>
                  <p className={styles.date}>{dFmt(p.fecha)}</p>
                </div>
                <div className={styles.badges}>
                  <select 
                    value={p.estado_pago}
                    onChange={(e) => handleEstado(p.id, 'estado_pago', e.target.value)}
                    className={`${styles.selPago} ${p.estado_pago === 'PAGADO' ? styles.green : p.estado_pago === 'CANCELADO' ? styles.red : ''}`}
                  >
                    <option value="PENDIENTE">PENDIENTE</option>
                    <option value="PAGADO">PAGADO</option>
                    <option value="CANCELADO">CANCELADO</option>
                  </select>

                  <select 
                    value={p.estado_envio}
                    onChange={(e) => handleEstado(p.id, 'estado_envio', e.target.value)}
                    className={`${styles.selEnvio} ${p.estado_envio === 'Entregado' ? styles.green : ''}`}
                  >
                    <option value="Pendiente">Pendiente Envío</option>
                    <option value="Enviado">Enviado</option>
                    <option value="Entregado">Entregado</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.infoCol}>
                  <p><strong>Tel:</strong> <a href={`https://wa.me/${p.telefono}`} target="_blank" rel="noreferrer">{p.telefono}</a></p>
                  <p><strong>Dir:</strong> {p.direccion}, {p.barrio} ({p.ciudad})</p>
                  <p><strong>Pago:</strong> {p.pago}</p>
                </div>
                <div className={styles.itemsCol}>
                  <strong>Productos:</strong>
                  <ul className={styles.prodList}>
                    {p.productos_json ? p.productos_json.map((i: any) => (
                      <li key={i.id}>{i.qty}x {i.nombre} <i>({fmt(i.precio)})</i></li>
                    )) : <li>{p.productos}</li>}
                  </ul>
                  <div className={styles.totalRow}>
                    Total: <span>{fmt(p.total)}</span>
                  </div>
                </div>
              </div>

              <div className={styles.cardActions}>
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={async () => {
                    const { generarFacturaPDF } = await import('@/lib/utils/pdfGenerator')
                    const blob = await generarFacturaPDF(p)
                    
                    const fd = new FormData()
                    fd.append('file', blob)
                    fd.append('pedidoId', String(p.id))
                    
                    // Abrir en nueva pestaña inmediatamente
                    const url = URL.createObjectURL(blob)
                    window.open(url, '_blank')

                    // Subir a la nube para persistencia en background
                    fetch('/api/facturas', { method: 'POST', body: fd }).catch(() => {})
                  }}
                >
                  📄 Generar Factura
                </button>
                {!archivados ? (
                  <button className="btn btn-ghost btn-sm" onClick={() => handleAction(p.id, 'archivar_pedido')}>📥 Archivar</button>
                ) : (
                  <button className="btn btn-primary btn-sm" onClick={() => handleAction(p.id, 'recuperar_pedido')}>📤 Restaurar</button>
                )}
                {p.estado_pago !== 'CANCELADO' && (
                  <button className="btn btn-ghost btn-sm" style={{color: 'var(--color-error)'}} onClick={() => handleAction(p.id, 'cancelar_pedido')}>❌ Cancelar Pedido</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
