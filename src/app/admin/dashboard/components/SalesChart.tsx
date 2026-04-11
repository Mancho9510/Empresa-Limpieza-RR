'use client'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

interface DayData {
  fecha: string
  total: number
  pedidos: number
}

interface SalesChartProps {
  data: DayData[]
}

const fmt = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `$${(n / 1_000).toFixed(0)}K`
    : `$${n}`

const fmtDate = (d: string) => {
  const [, m, day] = d.split('-')
  return `${parseInt(day)}/${parseInt(m)}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      {payload.map((entry: { name: string; value: number; color: string }, i: number) => (
        <p key={i} style={{ color: entry.color }} className="chart-tooltip-row">
          {entry.name === 'total' ? 'Ingresos' : 'Pedidos'}:{' '}
          <strong>{entry.name === 'total' ? entry.value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }) : entry.value}</strong>
        </p>
      ))}
    </div>
  )
}

export default function SalesChart({ data }: SalesChartProps) {
  const formatted = data.map((d) => ({ ...d, fecha: fmtDate(d.fecha) }))
  const maxTotal = Math.max(...data.map((d) => d.total), 1)

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={formatted} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0D9488" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradPedidos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#06D6A0" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#06D6A0" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(45,212,191,0.1)" />
        <XAxis
          dataKey="fecha"
          tick={{ fill: '#94A3B8', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          interval={Math.floor(data.length / 6)}
        />
        <YAxis
          yAxisId="left"
          tickFormatter={fmt}
          tick={{ fill: '#94A3B8', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          domain={[0, Math.ceil(maxTotal * 1.1)]}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fill: '#94A3B8', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => (value === 'total' ? 'Ingresos' : 'Pedidos')}
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: '#94A3B8' }}
        />
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="total"
          stroke="#0D9488"
          strokeWidth={2}
          fill="url(#gradTotal)"
          dot={false}
          activeDot={{ r: 4, fill: '#0D9488' }}
        />
        <Area
          yAxisId="right"
          type="monotone"
          dataKey="pedidos"
          stroke="#06D6A0"
          strokeWidth={1.5}
          fill="url(#gradPedidos)"
          dot={false}
          activeDot={{ r: 3, fill: '#06D6A0' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
