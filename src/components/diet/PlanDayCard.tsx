import { Check, Repeat, SkipForward, Undo2 } from 'lucide-react'
import { db, type Entry } from '../../diet/db.ts'
import { planFood } from '../../diet/foods.ts'
import { plannedKcal, type Plan, type PlannedDay, type PlannedItem } from '../../diet/plan.ts'
import { logPlanItem, updateChoices } from '../../diet/store.ts'
import { formatNumber } from '../../lib/format.ts'
import { MacroLine } from './SuggestionList.tsx'

interface Props {
  plan: Plan
  planned: PlannedDay
  date: string
  entries: Entry[]
  onSwap: (item: PlannedItem) => void
}

const button = 'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold'

/** The entry that ticked this line off, if one did (the same line of the same variant). */
const eatenEntry = (entries: Entry[], item: PlannedItem) => entries.find((e) => e.planIndex === item.index && e.key === `plan:${item.text}`)

/**
 * Today's plan as the workbook has it, made to bend: another variant, a line
 * swapped for something of about the same calories, a line skipped. Ticking a
 * line logs it as eaten; what was eaten counts whether it was planned or not.
 */
export function PlanDayCard({ plan, planned, date, entries, onSwap }: Props) {
  const variants = plan.templates[planned.template] ?? []
  const left = planned.items.filter((i) => !i.skipped && !eatenEntry(entries, i))
  const leftKcal = left.reduce((sum, i) => sum + i.kcal, 0)

  return (
    <section aria-labelledby="plan-day-title" className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="plan-day-title" className="text-base font-semibold">
          Plan na ten dzień <span className="font-normal text-stone-500">· dzień {planned.template}</span>
        </h2>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-stone-600">Wariant</span>
          <select
            value={planned.variant}
            // Another variant has other lines: its swaps and skips would point at the wrong ones.
            onChange={(e) => void updateChoices(date, () => ({ variant: Number(e.target.value) }))}
            className="h-8 rounded-lg border border-stone-300 bg-white px-2 text-sm"
          >
            {variants.map((v) => (
              <option key={v.index} value={v.index}>
                {v.index} · {formatNumber(v.totals.kcal, 0)} kcal · B {formatNumber(v.totals.protein ?? 0, 0)} g
              </option>
            ))}
          </select>
        </label>
      </div>

      <ul className="flex flex-col divide-y divide-stone-100">
        {planned.items.map((item) => {
          const entry = eatenEntry(entries, item)
          return (
            <li key={item.index} className="flex flex-wrap items-start justify-between gap-2 py-2">
              <div className={`min-w-48 flex-1 ${item.skipped ? 'text-stone-400 line-through' : ''}`}>
                <p className="text-sm font-medium">
                  {entry && <Check className="mr-1 inline size-4 text-emerald-600" aria-label="zjedzone" />}
                  {item.text}
                </p>
                <p className="text-xs text-stone-500">
                  <MacroLine food={planFood(item)} />
                  {item.replaced && <> · zamiast: {item.replaced.text}</>}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-1">
                {entry ? (
                  <button type="button" onClick={() => entry.id && void db.entries.delete(entry.id)} className={`${button} text-stone-600 hover:bg-stone-100`}>
                    <Undo2 className="size-3.5" aria-hidden /> Cofnij
                  </button>
                ) : item.skipped ? (
                  <button
                    type="button"
                    onClick={() => void updateChoices(date, (c) => ({ ...c, skipped: (c.skipped ?? []).filter((i) => i !== item.index) }))}
                    className={`${button} text-stone-600 hover:bg-stone-100`}
                  >
                    <Undo2 className="size-3.5" aria-hidden /> Przywróć
                  </button>
                ) : (
                  <>
                    <button type="button" onClick={() => void logPlanItem(date, item.index, item)} className={`${button} bg-emerald-600 text-white hover:bg-emerald-700`}>
                      <Check className="size-3.5" aria-hidden /> Zjadłem
                    </button>
                    <button type="button" onClick={() => onSwap(item)} className={`${button} border border-stone-300 text-stone-700 hover:bg-stone-50`}>
                      <Repeat className="size-3.5" aria-hidden /> Zamień
                    </button>
                    {item.replaced ? (
                      <button
                        type="button"
                        onClick={() =>
                          void updateChoices(date, (c) => {
                            const swaps = { ...c.swaps }
                            delete swaps[item.index]
                            return { ...c, swaps }
                          })
                        }
                        className={`${button} text-stone-600 hover:bg-stone-100`}
                      >
                        <Undo2 className="size-3.5" aria-hidden /> Oryginał
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void updateChoices(date, (c) => ({ ...c, skipped: [...(c.skipped ?? []), item.index] }))}
                        className={`${button} text-stone-600 hover:bg-stone-100`}
                      >
                        <SkipForward className="size-3.5" aria-hidden /> Pomiń
                      </button>
                    )}
                  </>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      <p className="text-xs text-stone-500">
        Plan: {formatNumber(plannedKcal(planned) ?? 0, 0)} kcal
        {left.length > 0 && <> · do zjedzenia z planu jeszcze {formatNumber(leftKcal, 0)} kcal</>}
      </p>
    </section>
  )
}
