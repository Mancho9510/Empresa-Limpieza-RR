'use client'

interface Product {
  nombre: string
  qty: number
  total: number
  categoria: string
}

interface TopProductsTableProps {
  data: Product[]
  byRevenue?: boolean
}

const MEDALS = ['🥇', '🥈', '🥉']
const fmt = (n: number) =>
  n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })

export default function TopProductsTable({ data, byRevenue = false }: TopProductsTableProps) {
  if (!data.length) return <p className="chart-empty">Sin datos de productos aún</p>

  const maxVal = Math.max(...data.map((d) => (byRevenue ? d.total : d.qty)), 1)

  return (
    <div className="top-table">
      {data.map((p, i) => {
        const val = byRevenue ? p.total : p.qty
        const pct = Math.round((val / maxVal) * 100)
        return (
          <div key={p.nombre} className="top-row">
            <span className="top-rank">{MEDALS[i] ?? `${i + 1}`}</span>
            <div className="top-info">
              <div className="top-name-row">
                <span className="top-name">{p.nombre}</span>
                {p.categoria && <span className="top-cat">{p.categoria}</span>}
              </div>
              <div className="top-bar-wrapper">
                <div className="top-bar-track">
                  <div className="top-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="top-val">
                  {byRevenue ? fmt(p.total) : `${val} uds`}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
