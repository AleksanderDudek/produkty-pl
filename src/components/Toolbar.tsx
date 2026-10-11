import { LayoutGrid, Search, SlidersHorizontal, Table2, X } from 'lucide-react'
import { useDebouncedDraft } from '../hooks/useDebouncedDraft.ts'
import { SORT_OPTIONS } from '../lib/labels.ts'
import type { Sort } from '../lib/sort.ts'
import type { View } from '../lib/url-state.ts'

interface Props {
  query: string
  onQuery: (q: string) => void
  sort: Sort
  onSort: (sort: Sort) => void
  view: View
  onView: (view: View) => void
  activeFilters: number
  onOpenFilters: () => void
}

export function Toolbar({ query, onQuery, sort, onSort, view, onView, activeFilters, onOpenFilters }: Props) {
  const [draft, setDraft, flush] = useDebouncedDraft(query, onQuery, (a, b) => a.trim() === b.trim())
  const sortValue = `${sort.key}-${sort.dir}`
  const inPresets = SORT_OPTIONS.some((o) => `${o.key}-${o.dir}` === sortValue)

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* A <div>, not a <label>: a button inside a label joins the input's
          accessible name ("Szukaj produktu Wyczyść wyszukiwanie"). */}
      <div role="search" className="relative min-w-0 flex-1 basis-full sm:basis-64">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" aria-hidden />
        <input
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={flush}
          onKeyDown={(e) => {
            if (e.key === 'Enter') flush()
          }}
          aria-label="Szukaj produktu"
          placeholder="Szukaj: nazwa, marka lub kod kreskowy"
          className="h-10 w-full rounded-lg border border-stone-300 bg-white pr-9 pl-9 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 [&::-webkit-search-cancel-button]:appearance-none"
        />
        {draft && (
          <button
            type="button"
            onClick={() => {
              setDraft('')
              onQuery('')
            }}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-stone-400 hover:text-stone-700"
            aria-label="Wyczyść wyszukiwanie"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={onOpenFilters}
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 text-sm font-medium lg:hidden"
      >
        <SlidersHorizontal className="size-4" aria-hidden />
        Filtry{activeFilters > 0 && <span className="rounded-full bg-emerald-600 px-1.5 text-xs text-white">{activeFilters}</span>}
      </button>

      <label className="flex min-w-0 flex-1 items-center gap-2 text-sm sm:flex-none">
        <span className="hidden text-stone-500 sm:inline">Sortuj:</span>
        <select
          value={sortValue}
          onChange={(e) => {
            const [key, dir] = e.target.value.split('-') as [Sort['key'], Sort['dir']]
            onSort({ key, dir })
          }}
          className="h-10 w-full min-w-0 rounded-lg border border-stone-300 bg-white px-2 text-sm outline-none focus:border-emerald-600 sm:w-auto"
          aria-label="Sortowanie"
        >
          {/* A table header can pick a direction the presets do not list. */}
          {!inPresets && <option value={sortValue}>Własne (z tabeli)</option>}
          {SORT_OPTIONS.map((o) => (
            <option key={`${o.key}-${o.dir}`} value={`${o.key}-${o.dir}`}>{o.label}</option>
          ))}
        </select>
      </label>

      <div className="inline-flex rounded-lg border border-stone-300 bg-white p-0.5" role="group" aria-label="Widok">
        {([
          ['cards', 'Karty', LayoutGrid],
          ['table', 'Tabela', Table2],
        ] as const).map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            onClick={() => onView(value)}
            aria-pressed={view === value}
            className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm ${
              view === value ? 'bg-emerald-600 text-white' : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Icon className="size-4" aria-hidden />
            <span className="sr-only sm:not-sr-only">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
