'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { fetchDashboard, postLogout } from '@/lib/store/api-client'
import KpiCard from './components/KpiCard'
import TopProductsTable from './components/TopProductsTable'
import TopClientesTable from './components/TopClientesTable'
import styles from './dashboard.module.css'

// Gráficos se cargan solo en el cliente (Recharts no funciona en SSR)
const SalesChart = dynamic(() => import('./components/SalesChart'), { ssr: false })
const HourlyChart = dynamic(() => import('./components/HourlyChart'), { ssr: false })
const CategoryChart = dynamic(() => import('./components/CategoryChart'), { ssr: false })
const RatingChart = dynamic(() => import('./components/RatingChart'), { ssr: false })

// ── Tipos extendidos ─────────────────────────────────────────────
interface DashboardData {
  hoy: { pedidos: number; total: number }
  mes: { pedidos: number; total: number; ingresosNetos: number; gananciaNetaMes: number; descuentos: number; costoEnvio: number }
  mesAnterior: { pedidos: number; total: number }
  crecimientoMes: number
  general: {
    totalPedidos: number
    totalGeneral: number
    pendientes: number
    totalPendienteValor: number
    ticketPromedio: number
    tasaCancelacion: number
    pedidosConCupon: number
    pedidosSinCupon: number
  }
  estados: Record<string, number>
  ventasPorDia: Array<{ fecha: string; total: number; pedidos: number }>
  ventasPorHora: Array<{ hora: number; pedidos: number }>
  topProductos: Array<{ nombre: string; qty: number; total: number; categoria: string }>
  topProductosPorIngresos: Array<{ nombre: string; qty: number; total: number; categoria: string }>
  ventasPorCategoria: Array<{ categoria: string; total: number; qty: number }>
  stockBajo: Array<{ id: string; nombre: string; stock: number; categoria: string }>
  clientes: {
    total: number
    vip: number
    recurrentes: number
    nuevos: number
    lvtPromedio: number
    tasaRecurrencia: number
    top: Array<{ nombre: string; telefono: string; totalPedidos: number; totalGastado: number; tipo: string }>
    porMes: Array<{ mes: string; nuevos: number }>
  }
  rating: {
    total: number
    avg: number
    distribucion: Array<{ estrellas: number; count: number }>
    recientes: Array<{ estrellas: number; comentario: string; fecha: string; telefono: string }>
  }
}

const fmt = (n: number) =>
  n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })

const ESTADO_COLOR: Record<string, string> = {
  Recibido: '#3B82F6',
  'En preparación': '#F59E0B',
  'En camino': '#8B5CF6',
  Entregado: '#0D9488',
  Cancelado: '#EF4444',
}

type ProductTab = 'qty' | 'ingresos'

export default function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [productTab, setProductTab] = useState<ProductTab>('qty')
  const router = useRouter()

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetchDashboard()
      if (res.ok) setData(res.data as DashboardData)
    } catch {
      console.error('Error loading dashboard')
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    await postLogout()
    router.push('/admin/login')
  }

  const totalEstados = data ? Object.values(data.estados).reduce((a, b) => a + b, 0) : 0

  return (
    <div className={styles.page}>
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logoMark}>🧹</div>
          <div>
            <h1 className={styles.title}>Dashboard</h1>
            <span className={styles.subtitle}>Limpieza RR · Panel Analítico</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnSecondary} onClick={loadData} id="btn-refresh-dashboard">
            <span>↺</span> Actualizar
          </button>
          <nav className={styles.nav}>
            <a href="/admin/pedidos" className={styles.navLink}>Pedidos</a>
            <a href="/admin/inventario" className={styles.navLink}>Inventario</a>
            <a href="/admin/clientes" className={styles.navLink}>Clientes</a>
            <a href="/admin/proveedores" className={styles.navLink}>Proveedores</a>
            <a href="/admin/rentabilidad" className={styles.navLink}>Rentabilidad</a>
          </nav>
          <button className={styles.btnLogout} onClick={handleLogout} id="btn-logout-dashboard">
            Salir →
          </button>
        </div>
      </header>

      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Cargando métricas...</p>
        </div>
      ) : !data ? (
        <div className={styles.loadingState}>
          <p>No se pudieron cargar los datos</p>
          <button className={styles.btnPrimary} onClick={loadData}>Reintentar</button>
        </div>
      ) : (
        <main className={styles.content}>

          {/* ── Sección 1: KPI Cards ─────────────────────────────── */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>📊 Resumen General</h2>
            <div className={styles.kpiGrid}>
              <KpiCard
                icon="💰"
                label="Ventas Hoy"
                value={fmt(data.hoy.total)}
                sub={`${data.hoy.pedidos} pedidos hoy`}
                accent="teal"
              />
              <KpiCard
                icon="📈"
                label="Ventas del Mes"
                value={fmt(data.mes.total)}
                sub={`${data.mes.pedidos} pedidos este mes`}
                trend={data.crecimientoMes}
                trendLabel="vs mes anterior"
                accent="green"
              />
              <KpiCard
                icon="🎫"
                label="Ticket Promedio"
                value={fmt(data.general.ticketPromedio)}
                sub={`${data.general.totalPedidos} pedidos totales`}
                accent="blue"
              />
              <KpiCard
                icon="💵"
                label="Ganancia Real (Mes)"
                value={fmt(data.mes.gananciaNetaMes)}
                sub={`Ingresos Brutos: ${fmt(data.mes.total)}`}
                accent="green"
              />
              <KpiCard
                icon="⏳"
                label="Cobros Pendientes"
                value={fmt(data.general.totalPendienteValor)}
                sub={`${data.general.pendientes} pedidos por cobrar`}
                accent="amber"
              />
              <KpiCard
                icon="❌"
                label="Tasa de Cancelación"
                value={`${data.general.tasaCancelacion}%`}
                sub={data.general.tasaCancelacion <= 5 ? '✅ Saludable (< 5%)' : '⚠️ Revisar causas'}
                accent={data.general.tasaCancelacion > 5 ? 'red' : 'teal'}
              />
            </div>
          </section>

          {/* ── Sección 2: Gráfico de ventas ────────────────────── */}
          <section className={styles.section}>
            <div className={styles.cardFull}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>📅 Ventas — Últimos 30 días</h2>
                  <p className={styles.cardSub}>Ingresos diarios e histórico de pedidos</p>
                </div>
                <div className={styles.mesStats}>
                  <div className={styles.mesStat}>
                    <span className={styles.mesStatVal}>{fmt(data.mesAnterior.total)}</span>
                    <span className={styles.mesStatLabel}>Mes anterior</span>
                  </div>
                  <div className={`${styles.mesStat} ${styles.mesStatHighlight}`}>
                    <span className={styles.mesStatVal}>{fmt(data.mes.total)}</span>
                    <span className={styles.mesStatLabel}>Este mes</span>
                  </div>
                </div>
              </div>
              <SalesChart data={data.ventasPorDia} />
            </div>
          </section>

          {/* ── Sección 3: Dos columnas — Hora + Categoría ──────── */}
          <section className={styles.twoColSection}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>🕐 Pedidos por Hora</h2>
                  <p className={styles.cardSub}>¿A qué hora llegan más pedidos?</p>
                </div>
              </div>
              <HourlyChart data={data.ventasPorHora} />
              {/* Hora pico */}
              {(() => {
                const pico = data.ventasPorHora.reduce((a, b) => (a.pedidos > b.pedidos ? a : b), data.ventasPorHora[0])
                if (!pico || pico.pedidos === 0) return null
                const hr = pico.hora
                const ampm = hr < 12 ? 'AM' : 'PM'
                const h12 = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr
                return (
                  <p className={styles.picoCopy}>⚡ Hora pico: <strong>{h12}:00 {ampm}</strong> con {pico.pedidos} pedidos</p>
                )
              })()}
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>🗂️ Ventas por Categoría</h2>
                  <p className={styles.cardSub}>Distribución de ingresos por línea de producto</p>
                </div>
              </div>
              <CategoryChart data={data.ventasPorCategoria} />
            </div>
          </section>

          {/* ── Sección 4: Estado de pedidos ────────────────────── */}
          <section className={styles.section}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>🚚 Estado de Pedidos</h2>
                  <p className={styles.cardSub}>{data.general.totalPedidos} pedidos activos · {data.general.pedidosConCupon} usaron cupón</p>
                </div>
                <div className={styles.cuponBadge}>
                  <span>🎫 Cupones: {data.general.pedidosConCupon > 0 ? Math.round((data.general.pedidosConCupon / data.general.totalPedidos) * 100) : 0}%</span>
                </div>
              </div>
              <div className={styles.estadoGrid}>
                {Object.entries(data.estados).map(([estado, count]) => {
                  const pct = totalEstados > 0 ? Math.round((count / totalEstados) * 100) : 0
                  return (
                    <div key={estado} className={styles.estadoItem}>
                      <div className={styles.estadoHeader}>
                        <span className={styles.estadoName}>{estado}</span>
                        <span className={styles.estadoCount}>{count}</span>
                      </div>
                      <div className={styles.estadoTrack}>
                        <div
                          className={styles.estadoFill}
                          style={{
                            width: `${pct}%`,
                            backgroundColor: ESTADO_COLOR[estado] ?? '#0D9488',
                          }}
                        />
                      </div>
                      <span className={styles.estadoPct}>{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          {/* ── Sección 5: Top Productos ─────────────────────────── */}
          <section className={styles.section}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>📦 Top Productos</h2>
                  <p className={styles.cardSub}>Los más vendidos de todo el historial</p>
                </div>
                <div className={styles.tabGroup}>
                  <button
                    className={`${styles.tabBtn} ${productTab === 'qty' ? styles.tabActive : ''}`}
                    onClick={() => setProductTab('qty')}
                    id="tab-products-qty"
                  >
                    Por unidades
                  </button>
                  <button
                    className={`${styles.tabBtn} ${productTab === 'ingresos' ? styles.tabActive : ''}`}
                    onClick={() => setProductTab('ingresos')}
                    id="tab-products-revenue"
                  >
                    Por ingresos
                  </button>
                </div>
              </div>
              <TopProductsTable
                data={productTab === 'qty' ? data.topProductos : data.topProductosPorIngresos}
                byRevenue={productTab === 'ingresos'}
              />
            </div>
          </section>

          {/* ── Sección 6: Clientes + Stock Bajo ─────────────────── */}
          <section className={styles.twoColSection}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>👥 Clientes</h2>
                  <p className={styles.cardSub}>
                    {data.clientes.total} clientes · {data.clientes.vip} VIP · {data.clientes.recurrentes} recurrentes
                  </p>
                </div>
              </div>
              <div className={styles.clienteSegmentos}>
                <div className={styles.segmento} style={{ '--seg-color': '#F59E0B' } as React.CSSProperties}>
                  <span className={styles.segIcon}>👑</span>
                  <strong>{data.clientes.vip}</strong>
                  <span>VIP</span>
                </div>
                <div className={styles.segmento} style={{ '--seg-color': '#0D9488' } as React.CSSProperties}>
                  <span className={styles.segIcon}>🔄</span>
                  <strong>{data.clientes.recurrentes}</strong>
                  <span>Recurrentes</span>
                </div>
                <div className={styles.segmento} style={{ '--seg-color': '#3B82F6' } as React.CSSProperties}>
                  <span className={styles.segIcon}>✨</span>
                  <strong>{data.clientes.nuevos}</strong>
                  <span>Nuevos</span>
                </div>
              </div>
              <TopClientesTable
                data={data.clientes.top}
                tasaRecurrencia={data.clientes.tasaRecurrencia}
                lvtPromedio={data.clientes.lvtPromedio}
              />
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>⚠️ Stock Bajo</h2>
                  <p className={styles.cardSub}>Productos con 5 o menos unidades</p>
                </div>
                <span className={styles.alertBadge}>{data.stockBajo.length}</span>
              </div>
              {data.stockBajo.length === 0 ? (
                <div className={styles.stockOk}>
                  <span>✅</span>
                  <p>Todo el inventario está bien surtido</p>
                </div>
              ) : (
                <div className={styles.stockList}>
                  {data.stockBajo.map((p) => (
                    <div key={p.id} className={styles.stockRow}>
                      <div>
                        <p className={styles.stockName}>{p.nombre}</p>
                        <p className={styles.stockCat}>{p.categoria}</p>
                      </div>
                      <span className={`${styles.stockBadge} ${p.stock === 0 ? styles.stockEmpty : p.stock <= 2 ? styles.stockCritical : styles.stockLow}`}>
                        {p.stock === 0 ? '🚨 Agotado' : `${p.stock} uds`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* ── Sección 7: Calificaciones ────────────────────────── */}
          <section className={styles.twoColSection}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>⭐ Calificaciones</h2>
                  <p className={styles.cardSub}>Distribución de reseñas de clientes</p>
                </div>
              </div>
              <RatingChart
                data={data.rating.distribucion}
                avg={data.rating.avg}
                total={data.rating.total}
              />
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>💬 Últimas Reseñas</h2>
                  <p className={styles.cardSub}>Comentarios recientes de clientes</p>
                </div>
              </div>
              {data.rating.recientes.length === 0 ? (
                <p className="chart-empty">Sin reseñas aún</p>
              ) : (
                <div className={styles.resenasList}>
                  {data.rating.recientes.map((r, i) => (
                    <div key={i} className={styles.resenaRow}>
                      <div className={styles.resenaStars}>
                        {'★'.repeat(r.estrellas)}{'☆'.repeat(5 - r.estrellas)}
                      </div>
                      <p className={styles.resenaText}>{r.comentario || 'Sin comentario'}</p>
                      <p className={styles.resenaFecha}>
                        {new Date(r.fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

        </main>
      )}
    </div>
  )
}
