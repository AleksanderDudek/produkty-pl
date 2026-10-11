import type { ReactNode } from 'react'
import type { Facets } from '../lib/browse.ts'
import type { Filters, ListKey, RangeKey, ToggleKey } from '../lib/filters.ts'
import { formatNumber } from '../lib/format.ts'
import { ECO_COLORS, NOVA_COLORS, NUTRI_COLORS } from '../lib/grades.ts'
import {
  DIET_TOGGLES,
  NOVA_LABELS,
  NUTRITION_RANGES,
  PRESENCE_TOGGLES,
  RANGE_LABELS,
  TOGGLE_LABELS,
  gradeLabel,
} from '../lib/labels.ts'
import { ECO_GRADES, NOVA_GROUPS, NUTRI_GRADES, type Dictionaries } from '../lib/types.ts'
import { FacetList } from './FacetList.tsx'
import { RangeInput } from './RangeInput.tsx'

interface Props {
  filters: Filters
  facets: Facets
  dict: Dictionaries
  /** Allergen tags offered for exclusion, most common first. */
  allergenOptions: string[]
  onChange: (filters: Filters) => void
}

function Section({ title, children, open = true }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group border-b border-stone-200 py-3 last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-stone-800">
        {title}
        <span className="text-stone-400 transition group-open:rotate-90" aria-hidden>›</span>
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  )
}

function toggled<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

function Chip({ label, title, count, active, colors, onClick }: {
  label: string
  title: string
  count: number
  active: boolean
  colors: { bg: string; fg: string }
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={title}
      className={`flex min-w-11 flex-col items-center rounded-lg border-2 px-2 py-1 transition ${
        active ? 'border-stone-900 shadow' : 'border-transparent opacity-80 hover:opacity-100'
      } ${count === 0 && !active ? 'opacity-30' : ''}`}
      style={{ backgroundColor: colors.bg, color: colors.fg }}
    >
      <span className="text-sm font-bold leading-tight">{label}</span>
      <span className="text-[10px] leading-tight tabular-nums">{formatNumber(count, 0)}</span>
    </button>
  )
}

export function FilterPanel({ filters, facets, dict, allergenOptions, onChange }: Props) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch })
  const setRange = (key: RangeKey, range: Filters['ranges'][RangeKey]) => {
    const ranges = { ...filters.ranges }
    if (range) ranges[key] = range
    else delete ranges[key]
    set({ ranges })
  }

  const toggleRow = (key: ToggleKey) => (
    <label key={key} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-stone-100">
      <input
        type="checkbox"
        checked={filters.toggles.includes(key)}
        onChange={() => set({ toggles: toggled(filters.toggles, key) })}
        className="size-4 accent-emerald-600"
      />
      <span className="flex-1">{TOGGLE_LABELS[key]}</span>
      <span className="text-xs tabular-nums text-stone-400">{formatNumber(facets.toggles[key], 0)}</span>
    </label>
  )

  const facet = (key: ListKey, label: string) => (
    <FacetList
      label={label}
      counts={facets[key]}
      selected={filters[key]}
      names={dict[key]}
      onChange={(selected) => set({ [key]: selected })}
    />
  )

  return (
    <div className="flex flex-col">
      <Section title="Pokaż tylko">{PRESENCE_TOGGLES.map(toggleRow)}</Section>
      <Section title="Dieta">{DIET_TOGGLES.map(toggleRow)}</Section>

      <Section title="Nutri-Score">
        <div className="flex flex-wrap gap-1.5">
          {NUTRI_GRADES.map((g) => (
            <Chip
              key={g}
              label={gradeLabel(g)}
              title={`Nutri-Score ${gradeLabel(g)}`}
              count={facets.nutriscore[g] ?? 0}
              active={filters.nutriscore.includes(g)}
              colors={NUTRI_COLORS[g]}
              onClick={() => set({ nutriscore: toggled(filters.nutriscore, g) })}
            />
          ))}
        </div>
      </Section>

      <Section title="NOVA – stopień przetworzenia">
        <div className="flex flex-wrap gap-1.5">
          {NOVA_GROUPS.map((g) => (
            <Chip
              key={g}
              label={String(g)}
              title={`NOVA ${g}: ${NOVA_LABELS[g]}`}
              count={facets.nova[g] ?? 0}
              active={filters.nova.includes(g)}
              colors={NOVA_COLORS[g]}
              onClick={() => set({ nova: toggled(filters.nova, g) })}
            />
          ))}
        </div>
        <p className="mt-1.5 text-xs text-stone-500">1 – nieprzetworzone, 4 – ultraprzetworzone</p>
      </Section>

      <Section title="Eco-Score" open={false}>
        <div className="flex flex-wrap gap-1.5">
          {ECO_GRADES.map((g) => (
            <Chip
              key={g}
              label={gradeLabel(g)}
              title={`Eco-Score ${gradeLabel(g)}`}
              count={facets.ecoscore[g] ?? 0}
              active={filters.ecoscore.includes(g)}
              colors={ECO_COLORS[g]}
              onClick={() => set({ ecoscore: toggled(filters.ecoscore, g) })}
            />
          ))}
        </div>
      </Section>

      <Section title="Wartości odżywcze na 100 g">
        <div className="flex flex-col gap-2">
          {NUTRITION_RANGES.map((key) => (
            <RangeInput
              key={key}
              {...RANGE_LABELS[key]}
              range={filters.ranges[key]}
              onChange={(range) => setRange(key, range)}
            />
          ))}
        </div>
      </Section>

      <Section title="Cena">
        <RangeInput {...RANGE_LABELS.price} range={filters.ranges.price} onChange={(r) => setRange('price', r)} />
        <p className="mt-1.5 text-xs text-stone-500">Ceny z Open Prices – ma je niewielka część produktów.</p>
      </Section>

      <Section title="Kategoria">{facet('categories', 'Kategoria')}</Section>
      <Section title="Marka">{facet('brands', 'Marka')}</Section>
      <Section title="Sklep">{facet('stores', 'Sklep')}</Section>
      <Section title="Etykiety i certyfikaty" open={false}>
        <p className="mb-1.5 text-xs text-stone-500">Produkt musi mieć wszystkie zaznaczone.</p>
        {facet('labels', 'Etykiety')}
      </Section>

      <Section title="Bez alergenów" open={false}>
        <ul className="flex flex-col">
          {allergenOptions.map((tag) => (
            <li key={tag}>
              <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-stone-100">
                <input
                  type="checkbox"
                  checked={filters.withoutAllergens.includes(tag)}
                  onChange={() => set({ withoutAllergens: toggled(filters.withoutAllergens, tag) })}
                  className="size-4 accent-emerald-600"
                />
                bez: {dict.allergens[tag] ?? tag}
              </label>
            </li>
          ))}
        </ul>
        <p className="mt-1.5 text-xs text-stone-500">
          Wyklucza też śladowe ilości. Pokazuje tylko produkty ze znanym składem – nieznany skład nie znaczy „bez alergenów”.
        </p>
      </Section>

      <Section title="Dodatki do żywności (E)" open={false}>
        <RangeInput {...RANGE_LABELS.additives} range={filters.ranges.additives} onChange={(r) => setRange('additives', r)} />
      </Section>
    </div>
  )
}
