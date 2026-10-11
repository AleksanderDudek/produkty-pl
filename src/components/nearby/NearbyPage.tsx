import { Crosshair, LoaderCircle, LocateFixed, RefreshCw } from 'lucide-react'
import { useCallback, useMemo, useRef } from 'react'
import { useGeolocation, type GeoState } from '../../hooks/useGeolocation.ts'
import { useNearbyShops, type ShopsState } from '../../hooks/useNearbyShops.ts'
import type { Route } from '../../hooks/useRoute.ts'
import { useUrlState } from '../../hooks/useUrlState.ts'
import { formatNumber, plural } from '../../lib/format.ts'
import type { Dataset, IndexedProduct } from '../../lib/types.ts'
import type { LatLon } from '../../nearby/types.ts'
import { formatDistance } from '../../nearby/geo.ts'
import { DEFAULT_RADIUS, radiusLabel } from '../../nearby/radius.ts'
import { placeShops, summarizeChains } from '../../nearby/summary.ts'
import { nearbyFromParams, nearbyToParams, type NearbyState } from '../../nearby/url.ts'
import { RECIPES } from '../../recipes/catalog.ts'
import { readyProducts } from '../../recipes/ready.ts'
import { bestVariant, needsStore, recipeIndex } from '../../recipes/resolve.ts'
import { AppHeader } from '../AppHeader.tsx'
import { Footer } from '../Footer.tsx'
import { ProductDetail } from '../ProductDetail.tsx'
import { ReadyProducts } from '../recipes/ReadyProducts.tsx'
import { RecipeCard } from '../recipes/RecipeCard.tsx'
import { RadiusSlider } from './RadiusSlider.tsx'
import { StoreMap } from './StoreMap.tsx'

interface Props {
  dataset: Dataset
  products: IndexedProduct[]
  onNavigate: (route: Route) => void
}

const RADIUS_KEY = 'produkty-pl:radius'

function savedRadius(): number {
  try {
    return Number(window.localStorage.getItem(RADIUS_KEY)) || DEFAULT_RADIUS
  } catch {
    return DEFAULT_RADIUS
  }
}

function rememberRadius(radius: number): void {
  try {
    window.localStorage.setItem(RADIUS_KEY, String(radius))
  } catch {
    // Not remembered: the next visit starts at the default.
  }
}

/** Where the position came from, when it is not a fresh answer: never present an old place as the current one. */
function placeNote(geo: GeoState): string | null {
  if (geo.source !== 'saved' || geo.status === 'ready') return null
  if (geo.status === 'locating') return 'Pokazuję ostatnio zapisane miejsce, szukam aktualnej lokalizacji…'
  if (geo.status === 'denied') return 'Pokazuję ostatnio zapisane miejsce – brak zgody na lokalizację.'
  return 'Pokazuję ostatnio zapisane miejsce – nie udało się ustalić aktualnej lokalizacji.'
}

/** One sentence on what is going on, in the order the user would ask about it. */
function statusLine(geo: GeoState, shops: ShopsState, radius: number, knownCount: number, otherCount: number): string {
  const partial = shops.completeWithin > 0 && shops.completeWithin < radius
    ? ` (na razie: ${knownCount} ${plural(knownCount, 'sklep', 'sklepy', 'sklepów')} w promieniu ${radiusLabel(Math.round(shops.completeWithin / 100) * 100)})`
    : ''
  if (!geo.position) {
    if (geo.status === 'locating') return 'Szukam Twojej lokalizacji…'
    if (geo.status === 'denied') return 'Brak zgody na lokalizację. Kliknij na mapie miejsce, w którym jesteś.'
    return 'Nie udało się ustalić lokalizacji. Kliknij na mapie miejsce, w którym jesteś.'
  }
  if (shops.status === 'loading' || shops.status === 'idle') return `Szukam sklepów w promieniu ${radiusLabel(radius)}…${partial}`
  if (shops.status === 'error') return `${shops.error ?? 'Nie udało się pobrać sklepów.'}${partial}`
  if (knownCount === 0) {
    return `W promieniu ${radiusLabel(radius)} nie ma sklepów, z których da się coś ułożyć${
      otherCount ? ` (${plural(otherCount, 'jest 1 inny', `są ${otherCount} inne`, `jest ${otherCount} innych`)})` : ''
    }. Zwiększ promień.`
  }
  return `W promieniu ${radiusLabel(radius)}: ${knownCount} ${plural(knownCount, 'sklep', 'sklepy', 'sklepów')} z danymi o produktach${
    otherCount ? ` i ${otherCount} ${plural(otherCount, 'inny', 'inne', 'innych')}` : ''
  }.`
}

export function NearbyPage({ dataset, products, onNavigate }: Props) {
  const read = useCallback((params: URLSearchParams) => nearbyFromParams(params, savedRadius()), [])
  const [state, update, closeEntry] = useUrlState<NearbyState>(read, nearbyToParams)
  const [geo, { locate, setManual }] = useGeolocation()
  const [shopsState, retry] = useNearbyShops(geo.position, state.radius)
  const dict = dataset.dictionaries
  const { candidates } = recipeIndex(products)

  const { ranking: recipeChains } = recipeIndex(products)
  // Only chains that can give something here: a recipe bought in full, or a
  // ready protein product. Every store key in the data would include slugs
  // like "malina" or "orlen" that an unrelated local shop can share.
  const knownChains = useMemo(() => {
    const chains = new Set(recipeChains)
    for (const group of readyProducts(products, null)) for (const p of group.items) for (const s of p.stores) chains.add(s)
    return chains
  }, [recipeChains, products])
  // Only as far as the list is complete: a wider search still running must not
  // make a shop 2 km away look like the nearest one.
  const placedRadius = shopsState.completeWithin
  const placement = useMemo(
    () => (geo.position ? placeShops(shopsState.shops, geo.position, placedRadius, knownChains) : { known: [], otherCount: 0 }),
    [shopsState.shops, geo.position, placedRadius, knownChains],
  )
  const chains = useMemo(() => summarizeChains(placement.known), [placement.known])
  const byChain = useMemo(() => new Map(chains.map((c) => [c.chain, c])), [chains])
  // A chain in the link that is not around here any more is ignored.
  const store = state.store && byChain.has(state.store) ? state.store : null
  const ranking = useMemo(() => (store ? [store] : chains.map((c) => c.chain)), [store, chains])

  // Each recipe with the nearest shop that has everything; nearest first.
  const recipes = useMemo(() => {
    if (chains.length === 0) return []
    return RECIPES.map((recipe) => ({ recipe, variant: bestVariant(recipe, candidates, ranking) }))
      .filter((r) => r.variant !== null)
      .map((r) => ({ ...r, distance: (r.variant!.store ? byChain.get(r.variant!.store) : chains[0])?.nearest.distance ?? Infinity }))
      .sort((a, b) => a.distance - b.distance)
  }, [chains, candidates, ranking, byChain])

  const recipeCount = useMemo(() => {
    const counts = new Map<string, number>()
    // Recipes made of staples need no particular shop; counting them would
    // credit every shop on the map with the same five.
    const storeRecipes = RECIPES.filter(needsStore)
    for (const c of chains) counts.set(c.chain, storeRecipes.filter((r) => bestVariant(r, candidates, [c.chain]) !== null).length)
    return counts
  }, [chains, candidates])

  const ready = useMemo(
    () => (ranking.length ? readyProducts(products, ranking) : []),
    [products, ranking],
  )

  const storeName = useCallback((chain: string) => dict.stores[chain] ?? chain, [dict.stores])
  const describeStore = useCallback(
    (chain: string) => {
      const nearest = byChain.get(chain)?.nearest
      if (!nearest) return storeName(chain)
      return [storeName(chain), formatDistance(nearest.distance), nearest.address].filter(Boolean).join(' · ')
    },
    [byChain, storeName],
  )

  const byCode = useMemo(() => new Map(products.map((p) => [p.code, p])), [products])
  const openProduct = state.product ? byCode.get(state.product) : undefined
  const open = useCallback((code: string) => update({ product: code }, { push: true }), [update])
  const mapCenter = useRef<LatLon | null>(null)
  const note = placeNote(geo)
  const setRadius = (radius: number) => {
    rememberRadius(radius)
    update({ radius })
  }

  return (
    <div className="flex min-h-screen flex-col bg-stone-50 text-stone-900">
      <AppHeader route="nearby" onNavigate={onNavigate}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <RadiusSlider radius={state.radius} onChange={setRadius} />
          <button
            type="button"
            onClick={locate}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 text-sm font-medium hover:bg-stone-50"
          >
            <LocateFixed className="size-4" aria-hidden />
            Moja lokalizacja
          </button>
        </div>
      </AppHeader>

      <main className="mx-auto grid w-full max-w-[1440px] flex-1 gap-5 px-4 py-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section aria-label="Mapa" className="flex min-w-0 flex-col gap-2 lg:sticky lg:top-36 lg:h-[calc(100vh-10rem)] lg:self-start">
          {note && <p className="text-sm font-medium text-amber-800">{note}</p>}
          <p className="flex flex-wrap items-center gap-2 text-sm text-stone-700" role="status">
            {statusLine(geo, shopsState, state.radius, placement.known.length, placement.otherCount)}
            {shopsState.status === 'error' && (
              <button type="button" onClick={retry} className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:underline">
                <RefreshCw className="size-3.5" aria-hidden /> Spróbuj ponownie
              </button>
            )}
          </p>
          {/* isolate: Leaflet's panes and controls (z-index up to 1000) stay inside this box instead of over the header. */}
          <div className="relative isolate h-[45vh] min-h-72 overflow-hidden rounded-xl border border-stone-200 lg:h-auto lg:flex-1">
            {geo.position && shopsState.status === 'loading' && (
              <div className="pointer-events-none absolute inset-x-0 top-2 z-[1100] flex justify-center">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-stone-700 shadow">
                  <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> Szukam sklepów…
                </span>
              </div>
            )}
            <StoreMap
              center={geo.position}
              radius={state.radius}
              shops={placement.known}
              selectedChain={store}
              storeName={storeName}
              recipeCount={(chain) => recipeCount.get(chain) ?? 0}
              onPick={setManual}
              pickOnClick={!geo.position}
              onSelectChain={(chain) => update({ store: chain })}
              onViewChange={(center) => (mapCenter.current = center)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <button
              type="button"
              onClick={() => mapCenter.current && setManual(mapCenter.current)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:underline"
            >
              <Crosshair className="size-4" aria-hidden />
              Ustaw środek mapy jako moją lokalizację
            </button>
            <span className="text-xs text-stone-500">albo przytrzymaj palec na mapie (prawy klik na komputerze).</span>
          </div>
          <p className="text-xs text-stone-500">
            Twoja pozycja, zaokrąglona do ok. 100 m, trafia do serwera Overpass z danymi OpenStreetMap (overpass-api.de,
            zapasowo overpass.private.coffee), a oglądany fragment mapy do tile.openstreetmap.org. Ostatnie miejsce
            zostaje tylko na tym urządzeniu.
          </p>
        </section>

        <div className="flex min-w-0 flex-col gap-6">
          {chains.length > 0 && (
            <div className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden" role="group" aria-label="Sieci w pobliżu">
              <button
                type="button"
                onClick={() => update({ store: null })}
                aria-pressed={store === null}
                className={`shrink-0 rounded-full border px-3 py-1 text-sm ${store === null ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-stone-300 bg-white text-stone-700'}`}
              >
                Wszystkie
              </button>
              {chains.map((c) => (
                <button
                  key={c.chain}
                  type="button"
                  onClick={() => update({ store: c.chain })}
                  aria-pressed={store === c.chain}
                  className={`shrink-0 rounded-full border px-3 py-1 text-sm whitespace-nowrap ${store === c.chain ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-stone-300 bg-white text-stone-700'}`}
                >
                  {storeName(c.chain)} <span className="opacity-70">{formatDistance(c.nearest.distance)}</span>
                  {c.count > 1 && <span className="opacity-70"> · {c.count}</span>}
                </button>
              ))}
            </div>
          )}

          <section aria-labelledby="nearby-recipes" className="flex flex-col gap-3">
            <h1 id="nearby-recipes" className="text-xl font-bold">
              Przepisy z najbliższych sklepów
              {recipes.length > 0 && <span className="text-base font-normal text-stone-500"> ({formatNumber(recipes.length, 0)})</span>}
            </h1>
            {recipes.length === 0 ? (
              <p className="rounded-xl border border-dashed border-stone-300 bg-white px-4 py-6 text-sm text-stone-500">
                {geo.position ? 'Tu jeszcze nic – poczekaj na sklepy albo zwiększ promień.' : 'Najpierw ustal, gdzie jesteś.'}
              </p>
            ) : (
              <ul className="grid gap-4 xl:grid-cols-2">
                {recipes.map(({ recipe }) => (
                  <li key={recipe.id} className="min-w-0">
                    <RecipeCard
                      key={ranking.join(',')}
                      recipe={recipe}
                      candidates={candidates}
                      ranking={ranking}
                      pageStore={store}
                      dict={dict}
                      onOpenProduct={open}
                      describeStore={describeStore}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {ready.length > 0 && (
            <section aria-labelledby="nearby-ready" className="flex flex-col gap-3">
              <h2 id="nearby-ready" className="text-xl font-bold">Gotowe produkty białkowe w tych sklepach</h2>
              <ReadyProducts groups={ready} dict={dict} onOpen={open} />
            </section>
          )}
        </div>
      </main>

      <Footer dataset={dataset} />

      {openProduct && (
        <ProductDetail key={openProduct.code} product={openProduct} dict={dict} onClose={() => closeEntry({ product: null })} />
      )}
    </div>
  )
}
