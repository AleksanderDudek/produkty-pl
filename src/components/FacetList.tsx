import { useMemo, useState } from 'react'
import { formatNumber } from '../lib/format.ts'
import { normalizeForSearch } from '../lib/text.ts'
import type { Counts } from '../lib/browse.ts'

interface Props {
  label: string
  counts: Counts
  selected: string[]
  names: Record<string, string>
  onChange: (selected: string[]) => void
  limit?: number
}

const collator = new Intl.Collator('pl-PL')

/**
 * A checkbox list over one facet. Selected entries stay on top and visible
 * even when the current filters leave them no products — otherwise a choice
 * could vanish from the list while still filtering it.
 */
export function FacetList({ label, counts, selected, names, onChange, limit = 8 }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [search, setSearch] = useState('')

  const entries = useMemo(() => {
    const keys = new Set([...Object.keys(counts), ...selected])
    return [...keys]
      .map((key) => ({ key, name: names[key] ?? key, count: counts[key] ?? 0, selected: selected.includes(key) }))
      .sort((a, b) =>
        Number(b.selected) - Number(a.selected) || b.count - a.count || collator.compare(a.name, b.name))
  }, [counts, selected, names])

  const needle = normalizeForSearch(search)
  const matching = needle ? entries.filter((e) => normalizeForSearch(e.name).includes(needle)) : entries
  const visible = expanded || needle ? matching.slice(0, 200) : matching.slice(0, Math.max(limit, selected.length))

  if (entries.length === 0) return <p className="text-xs text-stone-400">Brak wartości dla bieżących filtrów.</p>

  return (
    <div className="flex flex-col gap-1">
      {entries.length > limit && (
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Szukaj: ${label.toLowerCase()}`}
          aria-label={`Szukaj w: ${label}`}
          className="mb-1 h-8 rounded-md border border-stone-300 px-2 text-sm outline-none focus:border-emerald-600"
        />
      )}
      <ul className="flex flex-col">
        {visible.map((e) => (
          <li key={e.key}>
            <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-stone-100">
              <input
                type="checkbox"
                checked={e.selected}
                onChange={() => onChange(e.selected ? selected.filter((k) => k !== e.key) : [...selected, e.key])}
                className="size-4 accent-emerald-600"
              />
              <span className={`flex-1 truncate ${e.count === 0 && !e.selected ? 'text-stone-400' : ''}`}>{e.name}</span>
              <span className="text-xs tabular-nums text-stone-400">{formatNumber(e.count, 0)}</span>
            </label>
          </li>
        ))}
      </ul>
      {needle && matching.length === 0 && <p className="text-xs text-stone-400">Nic nie pasuje.</p>}
      {!needle && matching.length > limit && (
        <button
          type="button"
          onClick={() => setExpanded((x) => !x)}
          className="self-start text-xs font-medium text-emerald-700 hover:underline"
        >
          {expanded ? 'Pokaż mniej' : `Pokaż więcej (${formatNumber(matching.length - limit, 0)})`}
        </button>
      )}
    </div>
  )
}
