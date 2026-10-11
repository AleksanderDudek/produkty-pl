import { daysBetween, shortDay } from '../../diet/model.ts'
import { formatNumber } from '../../lib/format.ts'

export interface ChartPoint {
  date: string
  plan: number
  /** Where the weight is heading from the last weighing (null before it). */
  projection: number | null
}

interface Props {
  start: string
  today: string
  points: ChartPoint[]
  measured: { date: string; kg: number }[]
  target: number
}

const W = 640
const H = 260
const PAD = { left: 40, right: 12, top: 12, bottom: 28 }

/** Weight over time: the plan, the measurements, where they are heading, and the goal. Plain SVG, no chart library. */
export function WeightChart({ start, today, points, measured, target }: Props) {
  if (points.length < 2) return null
  const end = points[points.length - 1].date
  const span = Math.max(1, daysBetween(start, end))
  const values = [target, ...points.map((p) => p.plan), ...points.flatMap((p) => (p.projection === null ? [] : [p.projection])), ...measured.map((m) => m.kg)]
  const lo = Math.floor(Math.min(...values) - 1)
  const hi = Math.ceil(Math.max(...values) + 1)
  const x = (date: string) => PAD.left + (daysBetween(start, date) / span) * (W - PAD.left - PAD.right)
  const y = (kg: number) => PAD.top + ((hi - kg) / (hi - lo)) * (H - PAD.top - PAD.bottom)
  const path = (pts: { date: string; kg: number }[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.kg).toFixed(1)}`).join(' ')

  const step = hi - lo > 20 ? 5 : hi - lo > 8 ? 2 : 1
  const ticks: number[] = []
  for (let kg = Math.ceil(lo / step) * step; kg <= hi; kg += step) ticks.push(kg)
  const visibleMeasured = measured.filter((m) => m.date >= start && m.date <= end)
  const projection = points.filter((p) => p.projection !== null).map((p) => ({ date: p.date, kg: p.projection! }))

  return (
    <figure className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Wykres wagi: plan, pomiary, prognoza i cel">
        {ticks.map((kg) => (
          <g key={kg}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(kg)} y2={y(kg)} className="stroke-stone-100" />
            <text x={PAD.left - 6} y={y(kg) + 4} textAnchor="end" className="fill-stone-400 text-[11px]">
              {kg}
            </text>
          </g>
        ))}
        <line x1={PAD.left} x2={W - PAD.right} y1={y(target)} y2={y(target)} className="stroke-amber-500" strokeDasharray="2 4" strokeWidth={1.5} />
        {today >= start && today <= end && <line x1={x(today)} x2={x(today)} y1={PAD.top} y2={H - PAD.bottom} className="stroke-stone-300" strokeDasharray="3 3" />}
        <path d={path(points.map((p) => ({ date: p.date, kg: p.plan })))} fill="none" className="stroke-stone-400" strokeDasharray="6 4" strokeWidth={1.5} />
        {projection.length > 1 && <path d={path(projection)} fill="none" className="stroke-sky-600" strokeDasharray="4 3" strokeWidth={2} />}
        {visibleMeasured.length > 1 && <path d={path(visibleMeasured)} fill="none" className="stroke-emerald-600" strokeWidth={2} />}
        {visibleMeasured.map((m) => (
          <circle key={m.date} cx={x(m.date)} cy={y(m.kg)} r={3} className="fill-emerald-600">
            <title>
              {shortDay(m.date)}: {formatNumber(m.kg, 1)} kg
            </title>
          </circle>
        ))}
        <text x={PAD.left} y={H - 8} className="fill-stone-500 text-[11px]">
          {shortDay(start)}
        </text>
        <text x={W - PAD.right} y={H - 8} textAnchor="end" className="fill-stone-500 text-[11px]">
          {shortDay(end)}
        </text>
      </svg>
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-emerald-600" aria-hidden /> pomiary
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 border-t-2 border-dashed border-stone-400" aria-hidden /> plan
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 border-t-2 border-dashed border-sky-600" aria-hidden /> prognoza od ostatniego ważenia
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 border-t-2 border-dotted border-amber-500" aria-hidden /> cel {formatNumber(target, 1)} kg
        </span>
      </figcaption>
    </figure>
  )
}
