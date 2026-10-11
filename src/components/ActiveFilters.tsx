import { X } from 'lucide-react'
import { activeFilterChips } from '../lib/active-filters.ts'
import { EMPTY_FILTERS, type Filters } from '../lib/filters.ts'
import type { Dictionaries } from '../lib/types.ts'

interface Props {
  filters: Filters
  dict: Dictionaries
  onChange: (filters: Filters) => void
}

export function ActiveFilters({ filters, dict, onChange }: Props) {
  const chips = activeFilterChips(filters, dict)
  if (chips.length === 0) return null

  return (
    <ul className="flex flex-wrap items-center gap-1.5" aria-label="Aktywne filtry">
      {chips.map((chip) => (
        <li key={chip.id}>
          <button
            type="button"
            onClick={() => onChange(chip.remove(filters))}
            className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 py-0.5 pr-1.5 pl-2.5 text-xs text-emerald-900 hover:border-emerald-400"
            aria-label={`Usuń filtr: ${chip.label}`}
          >
            {chip.label}
            <X className="size-3.5" aria-hidden />
          </button>
        </li>
      ))}
      <li>
        <button
          type="button"
          onClick={() => onChange(EMPTY_FILTERS)}
          className="px-1.5 text-xs font-medium text-stone-500 underline-offset-2 hover:text-stone-900 hover:underline"
        >
          Wyczyść wszystko
        </button>
      </li>
    </ul>
  )
}
