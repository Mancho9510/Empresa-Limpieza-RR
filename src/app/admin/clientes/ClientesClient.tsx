'use client'

import { useState, useEffect } from 'react'
import { fetchClientes, type ClienteAPI } from '@/lib/store/api-client'
import { useToast } from '@/components/ui/Toast'
import styles from './clientes.module.css'

export default function AdminClientesClient() {
  const [clientes, setClientes] = useState<ClienteAPI[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tipo, setTipo] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [tipo])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetchClientes({ q: search, tipo })
      if (res.ok) setClientes(res.data)
    } catch {
      toast('Error al cargar clientes', 'error')
    }
    setLoading(false)
  }

  const dFmt = (d: string) => d ? new Date(d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'
  const fmt = (n: number) => n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })

  const stats = {
    total: clientes.length,
    vip: clientes.filter(c => c.total_pedidos > 5 || c.total_gastado > 500000).length
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>👥 Directorio de Clientes</h1>
          <a href="/admin/dashboard" className={styles.backLink}>← Volver al Dashboard</a>
        </div>
        <div className={styles.actions}>
          <select value={tipo} onChange={e => setTipo(e.target.value)} className={styles.select}>
            <option value="">Todos los Tipos</option>
            <option value="Nuevo">Nuevo</option>
            <option value="Frecuente">Frecuente</option>
            <option value="VIP">VIP</option>
            <option value="Inactivo">Inactivo</option>
          </select>
          <input 
            type="text" 
            placeholder="Buscar por nombre, teléfono..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loadData()}
            className={styles.searchInput}
          />
          <button className="btn btn-primary" onClick={loadData}>🔎 Buscar</button>
        </div>
      </header>

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <h3>Total Buscados</h3>
          <p>{stats.total}</p>
        </div>
        <div className={styles.statCard}>
          <h3>Clientes MVP / VIP</h3>
          <p className={styles.success}>{stats.vip}</p>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}><div className={styles.spinner} /></div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Ubicación</th>
                <th>Última Compra</th>
                <th>Pedidos</th>
                <th>Total Gastado</th>
                <th>Tipo</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map(c => {
                const isVip = c.total_pedidos > 5 || c.total_gastado >= 500000
                return (
                  <tr key={c.id}>
                    <td><strong>{c.nombre || 'Sin nombre'}</strong></td>
                    <td>
                       <a href={`https://wa.me/${c.telefono}`} target="_blank" rel="noreferrer" className={styles.phoneLink}>
                         {c.telefono}
                       </a>
                    </td>
                    <td>{c.barrio} ({c.ciudad})</td>
                    <td>{dFmt(c.ultima_compra)}</td>
                    <td>{c.total_pedidos}</td>
                    <td>{fmt(c.total_gastado)}</td>
                    <td>
                      <span className={`${styles.badge} ${isVip ? styles.badgeVip : styles.badgeNormal}`}>
                        {isVip ? 'VIP' : c.tipo}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {clientes.length === 0 && <div className={styles.empty}>No se encontraron clientes.</div>}
        </div>
      )}
    </div>
  )
}
