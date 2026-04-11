'use client'

interface Cliente {
  nombre: string
  telefono: string
  totalPedidos: number
  totalGastado: number
  tipo: string
}

interface TopClientesTableProps {
  data: Cliente[]
  tasaRecurrencia: number
  lvtPromedio: number
}

const fmt = (n: number) =>
  n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })

const TIPO_BADGE: Record<string, string> = {
  VIP: 'badge-vip',
  Recurrente: 'badge-recurrente',
  Nuevo: 'badge-nuevo',
}

export default function TopClientesTable({ data, tasaRecurrencia, lvtPromedio }: TopClientesTableProps) {
  return (
    <div className="clientes-section">
      <div className="clientes-stats">
        <div className="clientes-stat">
          <span className="clientes-stat-val">{tasaRecurrencia}%</span>
          <span className="clientes-stat-label">Tasa de recurrencia</span>
        </div>
        <div className="clientes-stat">
          <span className="clientes-stat-val">{fmt(lvtPromedio)}</span>
          <span className="clientes-stat-label">LTV promedio</span>
        </div>
      </div>

      {data.length === 0 ? (
        <p className="chart-empty">Sin datos de clientes aún</p>
      ) : (
        <div className="clientes-table">
          {data.map((c, i) => (
            <div key={c.telefono} className="cliente-row">
              <span className="client-rank">{i + 1}</span>
              <div className="client-info">
                <div className="client-name-row">
                  <span className="client-name">{c.nombre}</span>
                  <span className={`badge ${TIPO_BADGE[c.tipo] ?? 'badge-nuevo'}`}>{c.tipo}</span>
                </div>
                <span className="client-sub">{c.totalPedidos} pedidos · {fmt(c.totalGastado)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
