import * as React from 'react'

interface MiniLineChartProps {
  points: { label: string; value: number }[]
  color?: string
}

export function MiniLineChart({ points, color = 'hsl(var(--primary))' }: MiniLineChartProps) {
  const width = 600
  const height = 160
  const padding = 24
  const max = Math.max(1, ...points.map((p) => p.value))

  const coords = points.map((p, i) => {
    const x = points.length === 1 ? width / 2 : padding + (i / (points.length - 1)) * (width - padding * 2)
    const y = height - padding - (p.value / max) * (height - padding * 2)
    return { x, y, ...p }
  })

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ')
  const areaPath = `${linePath} L ${coords[coords.length - 1]?.x ?? 0} ${height - padding} L ${coords[0]?.x ?? 0} ${height - padding} Z`

  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null)

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full touch-none"
      onMouseLeave={() => setHoverIdx(null)}
    >
      {[0.25, 0.5, 0.75].map((f) => (
        <line
          key={f}
          x1={padding}
          x2={width - padding}
          y1={padding + f * (height - padding * 2)}
          y2={padding + f * (height - padding * 2)}
          stroke="hsl(var(--border))"
          strokeDasharray="4 4"
        />
      ))}
      <path d={areaPath} fill={color} fillOpacity={0.08} stroke="none" />
      <path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {coords.map((c, i) => (
        <g key={i}>
          <circle
            cx={c.x}
            cy={c.y}
            r={hoverIdx === i ? 6 : 4}
            fill="hsl(var(--card))"
            stroke={color}
            strokeWidth={2.5}
            onMouseEnter={() => setHoverIdx(i)}
          />
          <rect
            x={c.x - (width / points.length) / 2}
            y={0}
            width={width / points.length}
            height={height}
            fill="transparent"
            onMouseEnter={() => setHoverIdx(i)}
          />
        </g>
      ))}
      {hoverIdx != null && coords[hoverIdx] && (
        <g>
          <line
            x1={coords[hoverIdx].x}
            x2={coords[hoverIdx].x}
            y1={padding}
            y2={height - padding}
            stroke={color}
            strokeOpacity={0.25}
          />
        </g>
      )}
      {coords.map((c, i) => (
        <text key={i} x={c.x} y={height - 4} textAnchor="middle" className="fill-muted-foreground text-[10px]">
          {c.label}
        </text>
      ))}
      {hoverIdx != null && coords[hoverIdx] && (
        <foreignObject
          x={Math.min(Math.max(coords[hoverIdx].x - 45, 0), width - 90)}
          y={Math.max(coords[hoverIdx].y - 40, 0)}
          width={90}
          height={30}
        >
          <div className="rounded-md bg-foreground px-2 py-1 text-center text-[11px] font-semibold text-background shadow-lg">
            {coords[hoverIdx].value}
          </div>
        </foreignObject>
      )}
    </svg>
  )
}
