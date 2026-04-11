'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface HourData {
  hora: number
  pedidos: number
}

interface HourlyChartProps {
  data: HourData[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const h = parseInt(label)
  const ampm = h < 12 ? 'AM' : 'PM'
  const hr = h === 0 ? 12 : h > 12 ? h - 12 : h
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{`${hr}:00 ${ampm}`}</p>
      <p style={{ color: '#0D9488' }} className="chart-tooltip-row">
        Pedidos: <strong>{payload[0].value}</strong>
      </p>
    </div>
  )
}

export default function HourlyChart({ data }: HourlyChartProps) {
  const maxVal = Math.max(...data.map((d) => d.pedidos), 1)

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(45,212,191,0.1)" vertical={false} />
        <XAxis
          dataKey="hora"
          tick={{ fill: '#94A3B8', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => (v % 6 === 0 ? `${v}h` : '')}
        />
        <YAxis hide />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(13,148,136,0.05)' }} />
        <Bar dataKey="pedidos" radius={[3, 3, 0, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.pedidos === maxVal ? '#0D9488' : entry.pedidos > maxVal * 0.6 ? '#14B8A6' : 'rgba(13,148,136,0.35)'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
