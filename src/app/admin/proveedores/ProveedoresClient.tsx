'use client'

import { useState, useEffect } from 'react'
import { fetchProveedores, postProveedor, type ProveedorAPI } from '@/lib/store/api-client'
import { useToast } from '@/components/ui/Toast'
import styles from './proveedores.module.css'

export default function AdminProveedoresClient() {
  const [proveedores, setProveedores] = useState<ProveedorAPI[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<Partial<ProveedorAPI>>({})
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetchProveedores({ q: search })
      if (res.ok) setProveedores(res.data)
    } catch {
      toast('Error al cargar proveedores', 'error')
    }
    setLoading(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await postProveedor(form)
      if (res.ok) {
        toast('Proveedor guardado con éxito', 'success')
        setShowModal(false)
        loadData()
      } else {
        toast('Error al guardar', 'error')
      }
    } catch {
      toast('Error de red', 'error')
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>🏭 Proveedores</h1>
          <a href="/admin/dashboard" className={styles.backLink}>← Volver al Dashboard</a>
        </div>
        <div className={styles.actions}>
          <input 
            type="text" 
            placeholder="Buscar por nombre, contacto..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loadData()}
            className={styles.searchInput}
          />
          <button className="btn btn-secondary" onClick={loadData}>🔎 Buscar</button>
          <button className="btn btn-primary" onClick={() => { setForm({ estado: 'activo' }); setShowModal(true) }}>+ Nuevo Proveedor</button>
        </div>
      </header>

      {loading ? (
        <div className={styles.loading}><div className={styles.spinner} /></div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre Empresa / Marca</th>
                <th>Contacto</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {proveedores.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.nombre}</strong></td>
                  <td>{p.contacto || '-'}</td>
                  <td>
                    {p.telefono ? <a href={`https://wa.me/${p.telefono.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className={styles.phoneLink}>{p.telefono}</a> : '-'}
                  </td>
                  <td>{p.email || '-'}</td>
                  <td>
                    <span className={`${styles.badge} ${p.estado === 'activo' ? styles.badgeActive : styles.badgeInactive}`}>
                      {p.estado}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setForm(p); setShowModal(true) }}>Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {proveedores.length === 0 && <div className={styles.empty}>No se encontraron proveedores.</div>}
        </div>
      )}

      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{form.id ? 'Editar' : 'Nuevo'} Proveedor</h3>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleSave} className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Nombre Empresa / Marca *</label>
                <input required value={form.nombre || ''} onChange={e => setForm({...form, nombre: e.target.value})} className={styles.numInput} />
              </div>
              <div className={styles.formGroup}>
                <label>Contacto (Persona responsable)</label>
                <input value={form.contacto || ''} onChange={e => setForm({...form, contacto: e.target.value})} className={styles.numInput} />
              </div>
              <div className={styles.formGroup}>
                <label>Teléfono / WhatsApp</label>
                <input value={form.telefono || ''} onChange={e => setForm({...form, telefono: e.target.value})} className={styles.numInput} />
              </div>
              <div className={styles.formGroup}>
                <label>Email</label>
                <input type="email" value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} className={styles.numInput} />
              </div>
              <div className={styles.formGroup}>
                <label>Estado</label>
                <select value={form.estado || 'activo'} onChange={e => setForm({...form, estado: e.target.value})} className={styles.numInput}>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>
              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label>Notas Adicionales</label>
                <textarea rows={3} value={form.notas || ''} onChange={e => setForm({...form, notas: e.target.value})} className={styles.numInput} />
              </div>
              
              <div className={styles.modalFooter}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">💾 Guardar Proveedor</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
