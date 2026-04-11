'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface CatData {
  categoria: string
  total: number
  qty: number
}

interface CategoryChartProps {
  data: CatData[]
}

const COLORS = ['#0D9488', '#14B8A6', '#06D6A0', '#2DD4BF', '#5EEAD4', '#F59E0B', '#FBBF24', '#34D399']

const fmt = (n: number) =>
  n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as CatData
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{d.categoria}</p>
      <p style={{ color: '#14B8A6' }} className="chart-tooltip-row">
        Ingresos: <strong>{fmt(d.total)}</strong>
      </p>
      <p style={{ color: '#06D6A0' }} className="chart-tooltip-row">
        Unidades: <strong>{d.qty}</strong>
      </p>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export default function CategoryChart({ data }: CategoryChartProps) {
  if (!data.length) {
    return (
      <div className="chart-empty">Sin datos de categorías aún</div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={95}
          dataKey="total"
          nameKey="categoria"
          labelLine={false}
          label={renderCustomLabel}
          animationDuration={600}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span style={{ fontSize: 11, color: '#94A3B8' }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
