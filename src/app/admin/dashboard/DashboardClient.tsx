'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { fetchDashboard, postLogout, type DashboardAPI } from '@/lib/store/api-client'
import styles from './dashboard.module.css'

export default function DashboardClient() {
  const [data, setData] = useState<DashboardAPI | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetchDashboard()
      if (res.ok) setData(res.data)
    } catch {
      console.error('Error loading dashboard')
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    await postLogout()
    router.push('/admin/login')
  }

  const fmt = (n: number) => n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>📊 Dashboard</h1>
          <span className={styles.subtitle}>Panel de Administración — Limpieza RR</span>
        </div>
        <div className={styles.headerActions}>
          <button className="btn btn-ghost btn-sm" onClick={loadData}>🔄 Actualizar</button>
          <nav className={styles.nav}>
            <a href="/admin/pedidos" className={styles.navLink}>📋 Pedidos</a>
            <a href="/admin/inventario" className={styles.navLink}>📦 Inventario</a>
            <a href="/admin/clientes" className={styles.navLink}>👥 Clientes</a>
            <a href="/admin/proveedores" className={styles.navLink}>🏭 Proveedores</a>
            <a href="/admin/rentabilidad" className={styles.navLink}>💰 Rentabilidad</a>
          </nav>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>🚪 Salir</button>
        </div>
      </header>

      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Cargando datos...</p>
        </div>
      ) : data ? (
        <div className={styles.content}>
          {/* KPI Cards */}
          <div className={styles.kpiGrid}>
            <div className={`${styles.kpiCard} ${styles.kpiGreen}`}>
              <span className={styles.kpiIcon}>📈</span>
              <div>
                <p className={styles.kpiLabel}>Ventas Hoy</p>
                <p className={styles.kpiValue}>{fmt(data.hoy.total)}</p>
                <p className={styles.kpiSub}>{data.hoy.pedidos} pedidos</p>
              </div>
            </div>
            <div className={`${styles.kpiCard} ${styles.kpiBlue}`}>
              <span className={styles.kpiIcon}>📊</span>
              <div>
                <p className={styles.kpiLabel}>Ventas del Mes</p>
                <p className={styles.kpiValue}>{fmt(data.mes.total)}</p>
                <p className={styles.kpiSub}>{data.mes.pedidos} pedidos</p>
              </div>
            </div>
            <div className={`${styles.kpiCard} ${styles.kpiAmber}`}>
              <span className={styles.kpiIcon}>⏳</span>
              <div>
                <p className={styles.kpiLabel}>Pendientes</p>
                <p className={styles.kpiValue}>{data.general.pendientes}</p>
                <p className={styles.kpiSub}>por cobrar</p>
              </div>
            </div>
            <div className={`${styles.kpiCard} ${styles.kpiPurple}`}>
              <span className={styles.kpiIcon}>🎫</span>
              <div>
                <p className={styles.kpiLabel}>Ticket Promedio</p>
                <p className={styles.kpiValue}>{fmt(data.general.ticketPromedio)}</p>
                <p className={styles.kpiSub}>{data.general.totalPedidos} pedidos totales</p>
              </div>
            </div>
          </div>

          {/* Status + Top Products */}
          <div className={styles.twoCol}>
            <div className={`card ${styles.statusCard}`}>
              <h3 className={styles.cardTitle}>Estado de Pedidos</h3>
              <div className={styles.statusList}>
                {Object.entries(data.estados).map(([estado, count]) => (
                  <div key={estado} className={styles.statusRow}>
                    <span className={styles.statusLabel}>{estado}</span>
                    <div className={styles.statusBar}>
                      <div
                        className={styles.statusFill}
                        style={{ width: `${Math.max(5, (count / Math.max(1, data.general.totalPedidos)) * 100)}%` }}
                      />
                    </div>
                    <span className={styles.statusCount}>{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={`card ${styles.topCard}`}>
              <h3 className={styles.cardTitle}>Top Productos</h3>
              <div className={styles.topList}>
                {data.topProductos.map((p, i) => (
                  <div key={p.nombre} className={styles.topRow}>
                    <span className={styles.topRank}>{i + 1}</span>
                    <span className={styles.topName}>{p.nombre}</span>
                    <span className={styles.topQty}>{p.qty} uds</span>
                  </div>
                ))}
                {data.topProductos.length === 0 && (
                  <p className={styles.empty}>Sin datos aún</p>
                )}
              </div>
            </div>
          </div>

          {/* Bottom stats */}
          <div className={styles.bottomStats}>
            <div className={`card ${styles.miniCard}`}>
              <span>👥</span>
              <div>
                <strong>{data.clientes.total}</strong>
                <span>Clientes ({data.clientes.vip} VIP)</span>
              </div>
            </div>
            <div className={`card ${styles.miniCard}`}>
              <span>⭐</span>
              <div>
                <strong>{data.rating.avg}</strong>
                <span>{data.rating.total} reseñas</span>
              </div>
            </div>
            <div className={`card ${styles.miniCard}`}>
              <span>💰</span>
              <div>
                <strong>{fmt(data.general.totalGeneral)}</strong>
                <span>Ventas totales</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.loading}>
          <p>No se pudieron cargar los datos</p>
          <button className="btn btn-primary" onClick={loadData}>Reintentar</button>
        </div>
      )}
    </div>
  )
}
