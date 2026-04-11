'use client'

interface KpiCardProps {
  icon: string
  label: string
  value: string
  sub?: string
  trend?: number      // porcentaje de cambio (puede ser negativo)
  trendLabel?: string
  accent?: 'teal' | 'green' | 'amber' | 'red' | 'purple' | 'blue'
}

const ACCENT_MAP: Record<string, string> = {
  teal:   'kpi-teal',
  green:  'kpi-green',
  amber:  'kpi-amber',
  red:    'kpi-red',
  purple: 'kpi-purple',
  blue:   'kpi-blue',
}

export default function KpiCard({ icon, label, value, sub, trend, trendLabel, accent = 'teal' }: KpiCardProps) {
  const hasTrend = trend !== undefined
  const positive = (trend ?? 0) >= 0

  return (
    <div className={`kpi-card ${ACCENT_MAP[accent]}`}>
      <div className="kpi-top">
        <span className="kpi-icon">{icon}</span>
        {hasTrend && (
          <span className={`kpi-trend ${positive ? 'trend-up' : 'trend-down'}`}>
            {positive ? '▲' : '▼'} {Math.abs(trend!)}%
          </span>
        )}
      </div>
      <p className="kpi-value">{value}</p>
      <p className="kpi-label">{label}</p>
      {(sub || trendLabel) && (
        <p className="kpi-sub">{trendLabel ?? sub}</p>
      )}
    </div>
  )
}
