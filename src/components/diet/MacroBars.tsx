import type { Adjustment, DayStatus, DayTotals, Status } from '../../diet/day.ts'
import type { MacroTargets } from '../../diet/profiles.ts'
import { formatNumber } from '../../lib/format.ts'

const COLORS: Record<Status, { bar: string; text: string }> = {
  brak: { bar: 'bg-amber-400', text: 'text-amber-800' },
  ok: { bar: 'bg-emerald-600', text: 'text-emerald-800' },
  nadmiar: { bar: 'bg-red-500', text: 'text-red-700' },
}

function Bar({ value, target, status }: { value: number; target: number; status: Status }) {
  const share = target > 0 ? Math.min(1, value / target) : 0
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-stone-100">
      <div className={`h-full rounded-full ${COLORS[status].bar}`} style={{ width: `${share * 100}%` }} />
    </div>
  )
}

interface Props {
  targets: MacroTargets
  eaten: DayTotals
  status: DayStatus
  adjustment: Adjustment | null
  plannedKcal: number | null
}

/** Today against today's goal: calories first, then the three macros with what each status means. */
export function MacroBars({ targets, eaten, status, adjustment, plannedKcal }: Props) {
  const rows = [
    { key: 'protein' as const, label: 'Białko', value: eaten.protein, target: targets.protein.target },
    { key: 'carbs' as const, label: 'Węglowodany', value: eaten.carbs, target: targets.carbs.max ?? targets.carbs.target },
    { key: 'fat' as const, label: 'Tłuszcz', value: eaten.fat, target: targets.fat.target },
  ]
  return (
    <section aria-label="Bilans dnia" className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-2xl font-bold tabular-nums">
          {formatNumber(eaten.kcal, 0)} <span className="text-base font-normal text-stone-500">/ {formatNumber(targets.kcal, 0)} kcal</span>
        </p>
        <p className={`text-sm font-medium ${COLORS[status.kcal.status].text}`}>{status.kcal.note}</p>
      </div>
      <Bar value={eaten.kcal} target={targets.kcal} status={status.kcal.status} />
      {adjustment && adjustment.delta !== 0 && (
        <p className="text-xs text-stone-600">
          Cel na dziś {adjustment.delta > 0 ? 'podniesiony' : 'obniżony'} o {formatNumber(Math.abs(adjustment.delta), 0)} kcal. {adjustment.explanation}
        </p>
      )}
      {plannedKcal !== null && <p className="text-xs text-stone-500">Plan na dziś: {formatNumber(plannedKcal, 0)} kcal.</p>}
      <div className="grid gap-3 sm:grid-cols-3">
        {rows.map((row) => (
          <div key={row.key} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">{row.label}</span>
              <span className="tabular-nums text-stone-600">
                {formatNumber(row.value, 0)} / {formatNumber(row.target, 0)} g
              </span>
            </div>
            <Bar value={row.value} target={row.target} status={status[row.key].status} />
            <span className={`text-xs ${COLORS[status[row.key].status].text}`}>{status[row.key].note}</span>
          </div>
        ))}
      </div>
      {eaten.unknownMacros > 0 && (
        <p className="text-xs text-stone-500">
          {eaten.unknownMacros} {eaten.unknownMacros === 1 ? 'wpis ma' : 'wpisy mają'} tylko kalorie – sumy makroskładników są zaniżone.
        </p>
      )}
    </section>
  )
}
