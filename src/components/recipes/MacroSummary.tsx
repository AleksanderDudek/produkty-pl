import { Check, TriangleAlert } from 'lucide-react'
import { formatNumber, plural } from '../../lib/format.ts'
import type { Macros } from '../../recipes/macros.ts'

const g = (n: number) => `${formatNumber(n, 0)} g`
// The rule is checked to a hundredth of a gram; whole grams could print a tie.
const g1 = (n: number) => `${formatNumber(n, 1)} g`

interface Props {
  /** One serving: what one person eats. */
  serving: Macros
  /** How many servings the recipe makes; the line saying so appears from two. */
  servings: number
  passes: boolean
}

/** One serving, where its energy comes from, and the rule spelled out. */
export function MacroSummary({ serving, servings, passes }: Props) {
  const energy = { protein: serving.protein * 4, carbs: serving.carbs * 4, fat: serving.fat * 9 }
  const sum = energy.protein + energy.carbs + energy.fat || 1
  const share = (n: number) => `${(n / sum) * 100}%`

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p className="text-2xl font-bold text-emerald-800">
          {g(serving.protein)} <span className="text-sm font-medium text-emerald-700">białka</span>
        </p>
        <p className="text-sm text-stone-600">
          {formatNumber(serving.kcal, 0)} kcal · węgl. {g(serving.carbs)} · tł. {g(serving.fat)}
        </p>
      </div>
      {servings > 1 && (
        // The ingredient grams below are for the whole pot; these numbers are not.
        <p className="-mt-1 text-xs font-medium text-stone-500">
          na porcję (przepis na {servings} {plural(servings, 'porcję', 'porcje', 'porcji')})
        </p>
      )}
      <div className="flex h-2 overflow-hidden rounded-full bg-stone-100" role="img" aria-label="Skąd pochodzą kalorie">
        <span className="bg-emerald-600" style={{ width: share(energy.protein) }} title="białko" />
        <span className="bg-amber-400" style={{ width: share(energy.carbs) }} title="węglowodany" />
        <span className="bg-rose-400" style={{ width: share(energy.fat) }} title="tłuszcz" />
      </div>
      <p className="flex gap-3 text-[11px] text-stone-500" aria-hidden>
        <span><span className="mr-1 inline-block size-2 rounded-full bg-emerald-600" />białko</span>
        <span><span className="mr-1 inline-block size-2 rounded-full bg-amber-400" />węglowodany</span>
        <span><span className="mr-1 inline-block size-2 rounded-full bg-rose-400" />tłuszcz</span>
        <span className="ml-auto">udział w kaloriach</span>
      </p>
      {passes ? (
        <p className="flex items-center gap-1.5 text-xs text-emerald-800">
          <Check className="size-3.5" aria-hidden />
          Białko {g1(serving.protein)} &gt; węglowodany {g1(serving.carbs)} i &gt; tłuszcz {g1(serving.fat)}
        </p>
      ) : (
        <p role="alert" className="flex items-center gap-1.5 text-xs font-medium text-red-700">
          <TriangleAlert className="size-3.5" aria-hidden />
          Z tym produktem białka jest mniej niż węglowodanów lub tłuszczu – zasada nie jest spełniona.
        </p>
      )}
    </div>
  )
}
