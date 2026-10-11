import { Plus, Star } from 'lucide-react'
import type { Food } from '../../diet/foods.ts'
import type { Fit, FitLevel } from '../../diet/profiles.ts'
import { isPair, type Suggestion } from '../../diet/suggest.ts'
import { formatNumber } from '../../lib/format.ts'

const FIT_BADGE: Record<FitLevel, { label: string; className: string }> = {
  great: { label: 'pasuje', className: 'bg-emerald-100 text-emerald-800' },
  ok: { label: 'może być', className: 'bg-stone-100 text-stone-700' },
  avoid: { label: 'nie pasuje', className: 'bg-red-100 text-red-800' },
}

/** How a food suits the diet profile, with the reason as its tooltip. */
export function FitBadge({ fit, className = '' }: { fit: Fit; className?: string }) {
  return (
    <span title={fit.reason} className={`rounded-full px-1.5 py-0.5 text-[11px] ${FIT_BADGE[fit.level].className} ${className}`}>
      {FIT_BADGE[fit.level].label}
    </span>
  )
}

export function MacroLine({ food }: { food: Food }) {
  const n = food.nutrients
  const g = (v: number | null) => (v === null ? '?' : formatNumber(v, 0))
  return (
    <span className="tabular-nums">
      {formatNumber(n.kcal, 0)} kcal · B {g(n.protein)} · W {g(n.carbs)} · T {g(n.fat)}
    </span>
  )
}

interface Props {
  suggestions: Suggestion[]
  actionLabel: string
  onPick: (food: Food) => void
}

/** Ranked options with the reasons behind them; the starred ones are the best right now. */
export function SuggestionList({ suggestions, actionLabel, onPick }: Props) {
  if (suggestions.length === 0) return <p className="text-sm text-stone-500">Brak propozycji w tym budżecie.</p>
  return (
    <ul className="flex flex-col divide-y divide-stone-100">
      {suggestions.map((s, i) => {
        // Swaps list singles first; the pairs after them get their own heading.
        const firstPair = isPair(s.food) && (i === 0 || !isPair(suggestions[i - 1].food))
        return (
          <li key={s.food.key} className="flex flex-col py-2.5">
            {firstPair && <p className="mb-2 text-xs font-semibold tracking-wide text-stone-500 uppercase">{i === 0 ? 'Dwie rzeczy razem' : 'Albo dwie rzeczy razem'}</p>}
            <div className="flex items-start gap-3">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                  {s.best && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-900" title="Najlepszy wybór">
                      <Star className="size-3 fill-current" aria-hidden /> najlepsze
                    </span>
                  )}
                  <span className="min-w-0 break-words">{s.food.name}</span>
                  <FitBadge fit={s.fit} />
                </p>
                <p className="text-xs text-stone-600">
                  <MacroLine food={s.food} /> · {s.food.amountLabel}
                  {s.where && <> · {s.where}</>}
                </p>
                <p className="text-xs text-stone-500">{s.reasons.slice(0, 3).join(' · ')}</p>
              </div>
              <button
                type="button"
                onClick={() => onPick(s.food)}
                aria-label={`${actionLabel}: ${s.food.name}`}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-emerald-600 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                <Plus className="size-3.5" aria-hidden /> {actionLabel}
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
