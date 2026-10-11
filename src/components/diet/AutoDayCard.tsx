import { Check, Shuffle } from 'lucide-react'
import type { Entry } from '../../diet/db.ts'
import type { Food } from '../../diet/foods.ts'
import type { AutoMeal } from '../../diet/suggest.ts'
import { formatNumber } from '../../lib/format.ts'
import { FitBadge, MacroLine } from './SuggestionList.tsx'

interface Props {
  meals: AutoMeal[]
  entries: Entry[]
  hasPlan: boolean
  onLog: (food: Food) => void
  onReroll: () => void
}

/**
 * "Ułóż dzień" for a day the plan does not cover (or when there is no plan):
 * a meal per part of the day from what the shops nearby sell and what is at
 * home. The set stays until the user asks for another.
 */
export function AutoDayCard({ meals, entries, hasPlan, onLog, onReroll }: Props) {
  const kcal = meals.reduce((sum, m) => sum + m.suggestion.food.nutrients.kcal, 0)
  const protein = meals.reduce((sum, m) => sum + (m.suggestion.food.nutrients.protein ?? 0), 0)
  return (
    <section aria-labelledby="auto-day-title" className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="auto-day-title" className="text-base font-semibold">Propozycja dnia</h2>
          <p className="text-xs text-stone-500">
            {hasPlan ? 'Plan nie obejmuje tego dnia – ' : 'Bez planu – '}
            zestaw z tego, co masz w pobliżu i w domu: {formatNumber(kcal, 0)} kcal, {formatNumber(protein, 0)} g białka.
          </p>
        </div>
        <button
          type="button"
          onClick={onReroll}
          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          <Shuffle className="size-4" aria-hidden /> Inny zestaw
        </button>
      </div>
      {meals.length === 0 ? (
        <p className="text-sm text-stone-500">Za mało danych, żeby ułożyć dzień – dodaj swoje jedzenie albo otwórz „W pobliżu”.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-stone-100">
          {meals.map(({ slot, suggestion: s }) => {
            const eaten = entries.some((e) => e.key === s.food.key)
            return (
              <li key={slot} className="flex flex-wrap items-start justify-between gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold tracking-wide text-stone-500 uppercase">{slot}</p>
                  <p className="text-sm font-medium">
                    {s.food.name}{' '}
                    <FitBadge fit={s.fit} className="font-normal" />
                  </p>
                  <p className="text-xs text-stone-500">
                    <MacroLine food={s.food} /> · {s.food.amountLabel}
                    {s.where && <> · {s.where}</>}
                  </p>
                </div>
                {eaten ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                    <Check className="size-3.5" aria-hidden /> zjedzone
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onLog(s.food)}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    <Check className="size-3.5" aria-hidden /> Zjadłem
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
