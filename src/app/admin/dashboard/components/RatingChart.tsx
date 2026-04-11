'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface StarData {
  estrellas: number
  count: number
}

interface RatingChartProps {
  data: StarData[]
  avg: number
  total: number
}

const STAR_COLORS: Record<number, string> = {
  1: '#EF4444',
  2: '#F97316',
  3: '#F59E0B',
  4: '#14B8A6',
  5: '#0D9488',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as StarData
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{'⭐'.repeat(d.estrellas)}</p>
      <p style={{ color: STAR_COLORS[d.estrellas] }} className="chart-tooltip-row">
        Reseñas: <strong>{d.count}</strong>
      </p>
    </div>
  )
}

export default function RatingChart({ data, avg, total }: RatingChartProps) {
  return (
    <div className="rating-chart-wrapper">
      <div className="rating-summary">
        <span className="rating-big">{avg}</span>
        <div>
          <div className="rating-stars">
            {[1, 2, 3, 4, 5].map((s) => (
              <span key={s} className={s <= Math.round(avg) ? 'star-filled' : 'star-empty'}>★</span>
            ))}
          </div>
          <span className="rating-total">{total} reseñas</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={130}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, left: 5, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="estrellas"
            tick={{ fill: '#94A3B8', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}★`}
            width={28}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(13,148,136,0.05)' }} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}>
            {data.map((entry) => (
              <Cell key={entry.estrellas} fill={STAR_COLORS[entry.estrellas]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
