import { PackageSearch } from 'lucide-react'
import { lazy, Suspense, useDeferredValue, useMemo, useState } from 'react'
import { ActiveFilters } from './components/ActiveFilters.tsx'
import { AppHeader } from './components/AppHeader.tsx'
import { FilterDrawer } from './components/FilterDrawer.tsx'
import { FilterPanel } from './components/FilterPanel.tsx'
import { Footer } from './components/Footer.tsx'
import { Pagination } from './components/Pagination.tsx'
import { ProductCard } from './components/ProductCard.tsx'
import { ProductDetail } from './components/ProductDetail.tsx'
import { ProductTable } from './components/ProductTable.tsx'
import { RecipesPage } from './components/recipes/RecipesPage.tsx'
import { StatusScreen } from './components/StatusScreen.tsx'
import { Toolbar } from './components/Toolbar.tsx'
import { useDataset } from './hooks/useDataset.ts'
import { useRoute, type Route } from './hooks/useRoute.ts'
import { useViewState } from './hooks/useViewState.ts'
import { browse } from './lib/browse.ts'
import { allergenOptions } from './lib/display.ts'
import { EMPTY_FILTERS, countActiveFilters, type Filters } from './lib/filters.ts'
import { formatNumber } from './lib/format.ts'
import { sortProducts } from './lib/sort.ts'
import type { Dataset, IndexedProduct } from './lib/types.ts'

export const PAGE_SIZE = 48

// The map (Leaflet) and the diet (IndexedDB, the workbook reader) are big and
// only needed on their own tabs: loaded when opened, and still precached by
// the service worker, so they work offline like the rest.
const NearbyPage = lazy(() => import('./components/nearby/NearbyPage.tsx').then((m) => ({ default: m.NearbyPage })))
const DietPage = lazy(() => import('./components/diet/DietPage.tsx').then((m) => ({ default: m.DietPage })))

export default function App() {
  const data = useDataset()
  const [route, navigate] = useRoute()
  if (data.status === 'loading') return <StatusScreen kind="loading" />
  if (data.status === 'error') return <StatusScreen kind="error" message={data.message} />
  if (route === 'recipes') return <RecipesPage dataset={data.dataset} products={data.products} onNavigate={navigate} />
  if (route === 'nearby' || route === 'diet') {
    const Page = route === 'nearby' ? NearbyPage : DietPage
    return (
      <Suspense fallback={<StatusScreen kind="loading" />}>
        <Page dataset={data.dataset} products={data.products} onNavigate={navigate} />
      </Suspense>
    )
  }
  return <Browser dataset={data.dataset} products={data.products} onNavigate={navigate} />
}

function Browser({ dataset, products, onNavigate }: { dataset: Dataset; products: IndexedProduct[]; onNavigate: (route: Route) => void }) {
  const [state, update, closeProduct] = useViewState()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const dict = dataset.dictionaries

  // Filtering 29 000 products takes tens of milliseconds; deferring keeps the
  // inputs responsive while the list catches up.
  const filters = useDeferredValue(state.filters)
  const sort = useDeferredValue(state.sort)
  const { results, facets } = useMemo(() => browse(products, filters), [products, filters])
  const sorted = useMemo(() => sortProducts(results, sort), [results, sort])
  const stale = filters !== state.filters || sort !== state.sort

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const page = Math.min(state.page, pageCount)
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const byCode = useMemo(() => new Map(products.map((p) => [p.code, p])), [products])
  const openProduct = state.product ? byCode.get(state.product) : undefined
  const allergens = useMemo(() => allergenOptions(products), [products])

  const setFilters = (next: Filters) => update({ filters: next })
  const open = (code: string) => update({ product: code }, { push: true })
  const goToPage = (next: number) => {
    update({ page: next })
    window.scrollTo({ top: 0 })
  }

  const panel = (
    <FilterPanel filters={state.filters} facets={facets} dict={dict} allergenOptions={allergens} onChange={setFilters} />
  )
  const activeCount = countActiveFilters(state.filters)

  return (
    <div className="flex min-h-screen flex-col bg-stone-50 text-stone-900">
      <AppHeader route="products" onNavigate={onNavigate}>
        <p className="hidden text-xs text-stone-500 sm:block">
          {formatNumber(products.length, 0)} produktów spożywczych sprzedawanych w Polsce
        </p>
        <Toolbar
          query={state.filters.q}
          onQuery={(q) => update((s) => ({ filters: { ...s.filters, q } }))}
          sort={state.sort}
          onSort={(next) => update({ sort: next })}
          view={state.view}
          onView={(view) => update({ view })}
          activeFilters={activeCount}
          onOpenFilters={() => setDrawerOpen(true)}
        />
      </AppHeader>

      <div className="mx-auto grid w-full max-w-[1440px] flex-1 gap-6 px-4 py-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden self-start lg:sticky lg:top-32 lg:block lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto lg:pr-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-wide text-stone-500 uppercase">Filtry</h2>
            {activeCount > 0 && (
              <button type="button" onClick={() => setFilters(EMPTY_FILTERS)} className="text-xs text-emerald-700 hover:underline">
                Wyczyść ({activeCount})
              </button>
            )}
          </div>
          {panel}
        </aside>

        <main className="flex min-w-0 flex-col gap-4">
          <h1 className="sr-only">Produkty</h1>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-stone-600" aria-live="polite">
              Znaleziono <strong className="text-stone-900">{formatNumber(sorted.length, 0)}</strong>{' '}
              {sorted.length === 1 ? 'produkt' : 'produktów'}
              {pageCount > 1 && <> · strona {formatNumber(page, 0)} z {formatNumber(pageCount, 0)}</>}
            </p>
            <ActiveFilters filters={state.filters} dict={dict} onChange={setFilters} />
          </div>

          <div className={`transition-opacity ${stale ? 'opacity-60' : ''}`}>
            {sorted.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center">
                <PackageSearch className="size-10 text-stone-300" aria-hidden />
                <p className="font-medium">Brak produktów dla tych filtrów.</p>
                <button
                  type="button"
                  onClick={() => setFilters(EMPTY_FILTERS)}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Wyczyść filtry
                </button>
              </div>
            ) : state.view === 'table' ? (
              <ProductTable products={pageItems} dict={dict} sort={state.sort} onSort={(next) => update({ sort: next })} onOpen={open} />
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                {pageItems.map((p) => (
                  <li key={p.code}>
                    <ProductCard product={p} dict={dict} onOpen={open} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Pagination page={page} pageCount={pageCount} onPage={goToPage} />
        </main>
      </div>

      <Footer dataset={dataset} />

      <FilterDrawer open={drawerOpen} resultCount={sorted.length} onClose={() => setDrawerOpen(false)}>
        {panel}
      </FilterDrawer>

      {openProduct && <ProductDetail key={openProduct.code} product={openProduct} dict={dict} onClose={closeProduct} />}
    </div>
  )
}
