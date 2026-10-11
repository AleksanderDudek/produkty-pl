import { useCallback, useMemo, type ReactNode } from 'react'
import { useUrlState } from '../../hooks/useUrlState.ts'
import type { Route } from '../../hooks/useRoute.ts'
import type { Dataset, IndexedProduct } from '../../lib/types.ts'
import { KIND_LABELS, RECIPES, type Recipe, type RecipeKind } from '../../recipes/catalog.ts'
import { readyProducts } from '../../recipes/ready.ts'
import { bestVariant, needsStore, recipeIndex, resolveRecipe, type Candidates } from '../../recipes/resolve.ts'
import { byTime, TIER_LABELS, tierOf, type TimeTier } from '../../recipes/tiers.ts'
import { recipesFromParams, recipesToParams } from '../../recipes/url.ts'
import { AppHeader } from '../AppHeader.tsx'
import { Footer } from '../Footer.tsx'
import { ProductDetail } from '../ProductDetail.tsx'
import { RecipeCard } from './RecipeCard.tsx'
import { ReadyProducts } from './ReadyProducts.tsx'
import { TierIcon } from './TierBadge.tsx'

interface Props {
  dataset: Dataset
  products: IndexedProduct[]
  onNavigate: (route: Route) => void
}

/**
 * A store must cover at least this many recipes that need a shop to get its
 * own chip. Two let a convenience store (Żabka) in on the strength of the
 * "staples are everywhere" assumption, which is weakest exactly there.
 */
const MIN_STORE_RECIPES = 3

function shownIn(recipe: Recipe, candidates: Candidates, store: string | null, ranking: string[]): boolean {
  if (!store) return bestVariant(recipe, candidates, ranking) !== null
  const r = resolveRecipe(recipe, candidates, store)
  return r.available && r.passes
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-full border px-3 py-1 text-sm whitespace-nowrap ${
        active ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-stone-300 bg-white text-stone-700 hover:border-stone-400'
      }`}
    >
      {children}
    </button>
  )
}

export function RecipesPage({ dataset, products, onNavigate }: Props) {
  const [state, update, closeEntry] = useUrlState(recipesFromParams, recipesToParams)
  const dict = dataset.dictionaries

  const { candidates, ranking } = recipeIndex(products)
  const storeChips = useMemo(
    () =>
      ranking
        .map((store) => ({
          store,
          count: RECIPES.filter((r) => shownIn(r, candidates, store, ranking)).length,
          needing: RECIPES.filter((r) => needsStore(r) && shownIn(r, candidates, store, ranking)).length,
        }))
        .filter((s) => s.needing >= MIN_STORE_RECIPES),
    [ranking, candidates],
  )
  // A store in the link that offers nothing here is ignored rather than
  // showing an empty page.
  const store = storeChips.some((s) => s.store === state.store) ? state.store : null

  const recipes = useMemo(
    () =>
      RECIPES.filter(
        (r) =>
          (!state.kind || r.kind === state.kind) &&
          (!state.tier || tierOf(r.minutes) === state.tier) &&
          shownIn(r, candidates, store, ranking),
      ).sort(byTime),
    [state.kind, state.tier, candidates, store, ranking],
  )
  const ready = useMemo(() => readyProducts(products, store), [products, store])

  const byCode = useMemo(() => new Map(products.map((p) => [p.code, p])), [products])
  const openProduct = state.product ? byCode.get(state.product) : undefined
  const open = useCallback((code: string) => update({ product: code }, { push: true }), [update])

  return (
    <div className="flex min-h-screen flex-col bg-stone-50 text-stone-900">
      <AppHeader route="recipes" onNavigate={onNavigate}>
        <div className="flex flex-col gap-2">
          <div className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0" role="group" aria-label="Sklep">
            <span className="mr-1 shrink-0 text-sm text-stone-500">Sklep:</span>
            <Chip active={store === null} onClick={() => update({ store: null })}>Wszystkie</Chip>
            {storeChips.map((s) => (
              <Chip key={s.store} active={store === s.store} onClick={() => update({ store: s.store })}>
                {dict.stores[s.store] ?? s.store} <span className="opacity-70">({s.count})</span>
              </Chip>
            ))}
          </div>
          <div className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0" role="group" aria-label="Czas">
            <span className="mr-1 shrink-0 text-sm text-stone-500">Czas:</span>
            <Chip active={state.tier === null} onClick={() => update({ tier: null })}>Wszystkie</Chip>
            {(Object.keys(TIER_LABELS) as TimeTier[]).map((tier) => (
              <Chip key={tier} active={state.tier === tier} onClick={() => update({ tier })}>
                <span className="inline-flex items-center gap-1">
                  <TierIcon tier={tier} />
                  {TIER_LABELS[tier]}
                </span>
              </Chip>
            ))}
          </div>
          <div className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0" role="group" aria-label="Rodzaj">
            <span className="mr-1 shrink-0 text-sm text-stone-500">Rodzaj:</span>
            <Chip active={state.kind === null} onClick={() => update({ kind: null })}>Wszystkie</Chip>
            {(Object.keys(KIND_LABELS) as RecipeKind[]).map((kind) => (
              <Chip key={kind} active={state.kind === kind} onClick={() => update({ kind })}>{KIND_LABELS[kind]}</Chip>
            ))}
          </div>
        </div>
      </AppHeader>

      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-8 px-4 py-5">
        <section aria-labelledby="recipes-title" className="flex flex-col gap-3">
          <div>
            <h1 id="recipes-title" className="text-xl font-bold">Przepisy białkowe</h1>
            <p className="text-sm text-stone-600">
              Zasada: w każdej porcji jest <strong>więcej białka niż węglowodanów i więcej białka niż tłuszczu</strong>.
              Liczę ją z prawdziwych produktów ze sklepu, który widzisz na karcie. Najpierw szybkie (do 7 minut,
              z błyskawicą), potem dania na chwilę dłużej i obiady do zrobienia w domu, często na kilka porcji.
              {store
                ? ` Wszystko poniżej kupisz w sklepie ${dict.stores[store] ?? store}.`
                : ' Każdy przepis pokazuje sklep, w którym kupisz wszystkie składniki naraz.'}
            </p>
          </div>
          {recipes.length === 0 ? (
            <p className="rounded-xl border border-dashed border-stone-300 bg-white px-4 py-8 text-center text-sm text-stone-500">
              Brak przepisów z tymi filtrami w tym sklepie.
            </p>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {recipes.map((recipe) => (
                // min-w-0: a grid item is as wide as its content by default, and
                // a product name inside a <select> made cards 677 px on a phone.
                <li key={recipe.id} className="min-w-0">
                  <RecipeCard
                    // A new page store starts the card over: its swaps belonged to the old store.
                    key={store ?? 'any'}
                    recipe={recipe}
                    candidates={candidates}
                    ranking={ranking}
                    pageStore={store}
                    dict={dict}
                    onOpenProduct={open}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="ready-title" className="flex flex-col gap-3">
          <div>
            <h2 id="ready-title" className="text-xl font-bold">Gotowe produkty białkowe</h2>
            <p className="text-sm text-stone-600">
              Bez przygotowania: produkty, które same spełniają zasadę (na 100 g), od najwięcej białka na kalorię.
            </p>
          </div>
          <ReadyProducts groups={ready} dict={dict} onOpen={open} />
        </section>
      </main>

      <Footer dataset={dataset} />

      {openProduct && (
        <ProductDetail key={openProduct.code} product={openProduct} dict={dict} onClose={() => closeEntry({ product: null })} />
      )}
    </div>
  )
}
