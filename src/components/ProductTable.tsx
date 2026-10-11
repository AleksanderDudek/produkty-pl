import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { brandLine } from '../lib/display.ts'
import { formatGrams, formatNumber, UNKNOWN } from '../lib/format.ts'
import type { Sort, SortKey } from '../lib/sort.ts'
import type { Dictionaries, IndexedProduct, Nutrient } from '../lib/types.ts'
import { PriceTag } from './PriceTag.tsx'
import { ProductImage } from './ProductImage.tsx'
import { ScoreBadge } from './ScoreBadge.tsx'

interface Props {
  products: IndexedProduct[]
  dict: Dictionaries
  sort: Sort
  onSort: (sort: Sort) => void
  onOpen: (code: string) => void
}

const NUTRIENT_COLUMNS: { key: Nutrient & SortKey; label: string }[] = [
  { key: 'protein', label: 'Białko' },
  { key: 'fat', label: 'Tłuszcz' },
  { key: 'carbs', label: 'Węglow.' },
  { key: 'sugars', label: 'Cukry' },
  { key: 'salt', label: 'Sól' },
]

// Clicking a new column starts in its most useful direction.
const FIRST_DIR: Partial<Record<SortKey, 'asc' | 'desc'>> = { protein: 'desc', fiber: 'desc', popularity: 'desc' }

function SortHeader({ label, sortKey, sort, onSort, align = 'right' }: {
  label: string
  sortKey: SortKey
  sort: Sort
  onSort: (sort: Sort) => void
  align?: 'left' | 'right'
}) {
  const active = sort.key === sortKey
  const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown
  const next: Sort = active
    ? { key: sortKey, dir: sort.dir === 'asc' ? 'desc' : 'asc' }
    : { key: sortKey, dir: FIRST_DIR[sortKey] ?? 'asc' }
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`px-2 py-2 font-medium ${align === 'right' ? 'text-right' : 'text-left'}`}
    >
      <button
        type="button"
        onClick={() => onSort(next)}
        className={`inline-flex items-center gap-1 rounded hover:text-emerald-700 ${active ? 'text-emerald-700' : ''}`}
      >
        {label}
        <Icon className="size-3.5" aria-hidden />
      </button>
    </th>
  )
}

export function ProductTable({ products, dict, sort, onSort, onOpen }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
      <table className="w-full min-w-[860px] text-sm">
        <thead className="border-b border-stone-200 bg-stone-50 text-xs text-stone-600">
          <tr>
            <th scope="col" className="w-14 px-2 py-2"><span className="sr-only">Zdjęcie</span></th>
            <SortHeader label="Nazwa" sortKey="name" sort={sort} onSort={onSort} align="left" />
            <SortHeader label="kcal" sortKey="kcal" sort={sort} onSort={onSort} />
            {NUTRIENT_COLUMNS.map((c) => (
              <SortHeader key={c.key} label={c.label} sortKey={c.key} sort={sort} onSort={onSort} />
            ))}
            <SortHeader label="Nutri-Score" sortKey="nutriscore" sort={sort} onSort={onSort} />
            <SortHeader label="NOVA" sortKey="nova" sort={sort} onSort={onSort} />
            <SortHeader label="Cena" sortKey="price" sort={sort} onSort={onSort} />
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {products.map((p) => (
            <tr key={p.code} onClick={() => onOpen(p.code)} className="cursor-pointer hover:bg-emerald-50/50">
              <td className="px-2 py-1.5">
                <ProductImage path={p.images.front} size={100} alt="" className="size-11 rounded" />
              </td>
              <td className="max-w-[320px] px-2 py-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpen(p.code)
                  }}
                  className="line-clamp-1 text-left font-medium text-stone-900 hover:text-emerald-800"
                >
                  {p.name}
                </button>
                <span className="line-clamp-1 text-xs text-stone-500">
                  {[brandLine(p, dict), p.quantity].filter(Boolean).join(' · ')}
                </span>
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums font-semibold">
                {p.nutrition.kcal === null ? UNKNOWN : formatNumber(p.nutrition.kcal, 0)}
              </td>
              {NUTRIENT_COLUMNS.map((c) => (
                <td key={c.key} className="px-2 py-1.5 text-right tabular-nums text-stone-700">
                  {formatGrams(p.nutrition[c.key])}
                </td>
              ))}
              <td className="px-2 py-1.5 text-right">
                {p.nutriscore ? <ScoreBadge kind="nutriscore" value={p.nutriscore} /> : UNKNOWN}
              </td>
              <td className="px-2 py-1.5 text-right">
                {p.nova ? <ScoreBadge kind="nova" value={p.nova} /> : UNKNOWN}
              </td>
              <td className="px-2 py-1.5 text-right whitespace-nowrap">
                {p.price ? <PriceTag price={p.price} /> : UNKNOWN}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
