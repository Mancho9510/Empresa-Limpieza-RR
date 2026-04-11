'use client'

import { useState, useEffect } from 'react'
import { fetchProductos, postProductoAccion, type ProductoAPI } from '@/lib/store/api-client'
import { useToast } from '@/components/ui/Toast'
import styles from './inventario.module.css'

import ProductoModal from './ProductoModal'

export default function AdminInventarioClient({ role }: { role?: string }) {
  const [productos, setProductos] = useState<ProductoAPI[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [productoToEdit, setProductoToEdit] = useState<ProductoAPI | null>(null)
  const { toast } = useToast()

  const safeRole = role || 'admin'
  const isSuperAdmin = safeRole === 'superadmin'

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetchProductos()
      if (res.ok) setProductos(res.data)
    } catch {
      toast('Error al cargar inventario', 'error')
    }
    setLoading(false)
  }

  const handleUpdate = async (id: string, accion: string, campo: string, valor: string | number) => {
    try {
      const res = await postProductoAccion(accion, { id, [campo]: valor })
      if (res.ok) {
        toast('Actualizado exitosamente', 'success')
        setProductos(prev => prev.map(p => p.id === id ? { ...p, [campo]: valor } : p))
      } else {
        toast('Error al actualizar', 'error')
      }
    } catch {
      toast('Error de red', 'error')
    }
  }

  const handleSaveProducto = async (data: any) => {
    try {
      const isEditing = !!productoToEdit
      const payload = isEditing ? { ...data, id: productoToEdit.id } : data
      const accion = isEditing ? 'editar' : 'crear'

      const res = await postProductoAccion(accion, payload)
      if (res.ok && res.data) {
        toast(isEditing ? 'Producto actualizado' : 'Producto creado', 'success')
        if (isEditing) {
          setProductos(prev => prev.map(p => p.id === productoToEdit.id ? res.data as ProductoAPI : p))
        } else {
          setProductos(prev => [...prev, res.data as ProductoAPI])
        }
      } else {
        throw new Error('Error en respuesta')
      }
    } catch {
      toast('Error al guardar el producto', 'error')
      throw new Error()
    }
  }

  const handleDeleteProducto = async (id: string) => {
    try {
      const res = await postProductoAccion('eliminar', { id })
      if (res.ok) {
        toast('Producto eliminado', 'success')
        setProductos(prev => prev.filter(p => p.id !== id))
        setIsModalOpen(false)
      } else {
        toast('Error al eliminar', 'error')
      }
    } catch {
      toast('Error de red', 'error')
    }
  }

  const openNewModal = () => {
    setProductoToEdit(null)
    setIsModalOpen(true)
  }

  const openEditModal = (producto: ProductoAPI) => {
    setProductoToEdit(producto)
    setIsModalOpen(true)
  }

  const fmt = (n: number) => n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })

  const filtered = productos.filter(p => 
    p.nombre.toLowerCase().includes(search.toLowerCase()) || 
    (p.categoria && p.categoria.toLowerCase().includes(search.toLowerCase()))
  )

  const stats = {
    total: productos.length,
    agotados: productos.filter(p => p.stock === 0).length,
    bajos: productos.filter(p => p.stock !== null && p.stock > 0 && p.stock <= 5).length,
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>📦 Inventario y Catálogo</h1>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <a href="/admin/dashboard" className={styles.backLink}>← Volver al Dashboard</a>
            <span className={styles.badge} style={{ background: isSuperAdmin ? '#10b981' : '#3b82f6', color: '#fff' }}>
              Rol: {safeRole.toUpperCase()}
            </span>
          </div>
        </div>
        <div className={styles.actions}>
          <input 
            type="text" 
            placeholder="Buscar producto..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={styles.searchInput}
          />
          <button className="btn btn-primary" onClick={openNewModal}>
            + Agregar Producto
          </button>
        </div>
      </header>

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <h3>Total Productos</h3>
          <p>{stats.total}</p>
        </div>
        <div className={styles.statCard}>
          <h3>Agotados (Stock 0)</h3>
          <p className={styles.danger}>{stats.agotados}</p>
        </div>
        <div className={styles.statCard}>
          <h3>Stock Bajo (≤ 5)</h3>
          <p className={styles.warning}>{stats.bajos}</p>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}><div className={styles.spinner} /></div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Costo (COP)</th>
                <th>Precio (COP)</th>
                <th>Rentabilidad</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const gananciaPct = p.costo > 0 ? Math.round(((p.precio - p.costo) / p.precio) * 100) : 0
                return (
                  <tr key={p.id} className={p.stock === 0 ? styles.rowAgotado : ''}>
                    <td>
                      <div className={styles.prodInfo}>
                        {p.imagen ? (
                          <img src={p.imagen} alt={p.nombre} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                        ) : (
                          <span className={styles.emoji}>{p.emoji}</span>
                        )}
                        <div>
                          <strong>{p.nombre}</strong>
                          <div className={styles.tamano}>{p.tamano}</div>
                          <button 
                            onClick={() => openEditModal(p)}
                            style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.75rem', padding: 0, textDecoration: 'underline' }}
                          >
                            Editar / Foto
                          </button>
                        </div>
                      </div>
                    </td>
                    <td>{p.categoria}</td>
                    <td>
                      <input 
                        type="number" 
                        defaultValue={p.costo}
                        disabled={!isSuperAdmin}
                        onBlur={e => {
                          if (!isSuperAdmin) return
                          const v = Number(e.target.value)
                          if (v !== p.costo) handleUpdate(p.id, 'actualizar_costo', 'costo', v)
                        }}
                        className={styles.numInput}
                      />
                    </td>
                    <td>
                      <input 
                        type="number" 
                        defaultValue={p.precio}
                        disabled={!isSuperAdmin}
                        onBlur={e => {
                          if (!isSuperAdmin) return
                          const v = Number(e.target.value)
                          if (v !== p.precio) handleUpdate(p.id, 'actualizar_precio', 'precio', v)
                        }}
                        className={styles.numInput}
                      />
                    </td>
                    <td>
                      <span className={`${styles.badge} ${gananciaPct < 30 ? styles.badgeWarn : styles.badgeSuccess}`}>
                        {gananciaPct}%
                      </span>
                    </td>
                    <td>
                      <input 
                        type="number" 
                        defaultValue={p.stock ?? ''}
                        placeholder="∞"
                        onBlur={e => {
                          const val = e.target.value
                          const num = val === '' ? null : Number(val)
                          if (num !== p.stock) handleUpdate(p.id, 'actualizar_stock', 'stock', num as number)
                        }}
                        className={`${styles.numInput} ${p.stock === 0 ? styles.dangerText : ''}`}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div className={styles.empty}>No se encontraron productos.</div>}
        </div>
      )}

      <ProductoModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        producto={productoToEdit}
        onSave={handleSaveProducto}
        onDelete={handleDeleteProducto}
        role={safeRole}
      />
    </div>
  )
}
