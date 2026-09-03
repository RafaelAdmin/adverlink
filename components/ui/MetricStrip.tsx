type MetricItem = {
  label: string
  value: string | number
  accent?: boolean
}

type MetricStripProps = {
  items: MetricItem[]
  className?: string
}

export default function MetricStrip({ items, className = '' }: MetricStripProps) {
  return (
    <div className={`ui-metric-strip ${className}`.trim()}>
      {items.map((item) => (
        <div key={item.label} className="ui-metric-strip__item">
          <div className={`ui-metric-strip__value ${item.accent ? 'text-price-accent' : ''}`}>{item.value}</div>
          <div className="ui-metric-strip__label">{item.label}</div>
        </div>
      ))}
    </div>
  )
}
