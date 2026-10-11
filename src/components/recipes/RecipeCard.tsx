import { Clock, ListOrdered, Store, Utensils } from 'lucide-react'
import { useMemo, useState } from 'react'
import { plural } from '../../lib/format.ts'
import type { Dictionaries } from '../../lib/types.ts'
import { KIND_LABELS, servingsOf, type Recipe } from '../../recipes/catalog.ts'
import { tierOf } from '../../recipes/tiers.ts'
import {
  availableStores,
  bestVariant,
  needsStore,
  resolveRecipe,
  type Candidates,
  type Overrides,
} from '../../recipes/resolve.ts'
import { IngredientLine } from './IngredientLine.tsx'
import { MacroSummary } from './MacroSummary.tsx'
import { TierBadge } from './TierBadge.tsx'

interface Props {
  recipe: Recipe
  candidates: Candidates
  ranking: string[]
  /** The page's store filter; null shows each recipe at its best store. */
  pageStore: string | null
  dict: Dictionaries
  onOpenProduct: (code: string) => void
  /** How to name a chain on this card: "Biedronka · 350 m · Marszałkowska 10" near you. */
  describeStore?: (chain: string) => string
}

export function RecipeCard({ recipe, candidates, ranking, pageStore, dict, onOpenProduct, describeStore }: Props) {
  const storeName = (chain: string) => dict.stores[chain] ?? chain
  // The card's own store choice, kept only while the page filter is unset.
  const [cardStore, setCardStore] = useState<string | null | undefined>(undefined)
  const [overrides, setOverrides] = useState<Overrides>({})

  const stores = useMemo(() => availableStores(recipe, candidates, ranking), [recipe, candidates, ranking])
  // Where it would be bought by default, decided WITHOUT the user's swaps: a
  // swap that breaks the rule must be shown as broken, not quietly moved to
  // another shop.
  const defaultStore = useMemo(() => bestVariant(recipe, candidates, ranking)?.store ?? null, [recipe, candidates, ranking])
  const store = pageStore ?? cardStore ?? defaultStore
  const resolved = useMemo(
    () => resolveRecipe(recipe, candidates, store, overrides),
    [recipe, candidates, store, overrides],
  )

  const servings = servingsOf(recipe)

  const chooseStore = (next: string) => {
    setCardStore(next)
    setOverrides({})
  }

  // A recipe that needs a shop is only ever shown with one that has it all
  // (bestVariant never mixes shops), so `store` is set whenever it is needed.
  const shopLine = needsStore(recipe) && store
    ? `Wszystko kupisz w: ${describeStore ? describeStore(store) : storeName(store)}`
    : 'Składniki są w każdym sklepie'

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
          <TierBadge tier={tierOf(recipe.minutes)} />
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-800">{KIND_LABELS[recipe.kind]}</span>
          <span className="inline-flex items-center gap-1"><Clock className="size-3.5" aria-hidden />{recipe.minutes} min</span>
          <span className="inline-flex items-center gap-1"><Utensils className="size-3.5" aria-hidden />{recipe.tool}</span>
        </div>
        <h2 className="text-lg font-bold leading-snug text-stone-900">{recipe.name}</h2>
        <p className="text-sm text-stone-600">{recipe.description}</p>
      </div>

      <MacroSummary serving={resolved.perServing} servings={servings} passes={resolved.passes} />

      <div className="flex flex-col gap-1.5">
        <p className="flex items-center gap-1.5 text-sm font-medium text-stone-800">
          <Store className="size-4 text-stone-500" aria-hidden />
          {shopLine}
        </p>
        {needsStore(recipe) && !pageStore && stores.length > 1 && (
          <div className="flex flex-wrap gap-1" role="group" aria-label={`Sklep dla: ${recipe.name}`}>
            {stores.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => chooseStore(s)}
                aria-pressed={s === store}
                className={`rounded-full border px-2.5 py-0.5 text-xs ${
                  s === store ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-stone-300 text-stone-600 hover:border-stone-400'
                }`}
              >
                {storeName(s)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        {servings > 1 && (
          <p className="text-xs text-stone-500">
            Ilości na cały przepis, czyli {servings} {plural(servings, 'porcję', 'porcje', 'porcji')}.
          </p>
        )}
        <ul className="divide-y divide-stone-100 border-y border-stone-100">
          {resolved.items.map((r) => (
            <IngredientLine
              key={r.def.id}
              resolved={r}
              store={store}
              dict={dict}
              onSwap={(code) => setOverrides((o) => ({ ...o, [r.def.id]: code }))}
              onOpenProduct={onOpenProduct}
            />
          ))}
        </ul>
      </div>

      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-stone-800">
          <ListOrdered className="size-4 text-stone-500" aria-hidden />
          Jak zrobić
          <span className="text-stone-400 transition group-open:rotate-90" aria-hidden>›</span>
        </summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-stone-700">
          {recipe.steps.map((step) => <li key={step}>{step}</li>)}
        </ol>
      </details>
    </article>
  )
}
