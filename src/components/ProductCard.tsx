import { brandLine } from '../lib/display.ts'
import { formatGrams, formatKcal } from '../lib/format.ts'
import type { Dictionaries, IndexedProduct } from '../lib/types.ts'
import { PriceTag } from './PriceTag.tsx'
import { ProductImage } from './ProductImage.tsx'
import { ScoreBadge } from './ScoreBadge.tsx'

interface Props {
  product: IndexedProduct
  dict: Dictionaries
  onOpen: (code: string) => void
  /** Where the card sits in the page outline. */
  headingLevel?: 3 | 4
}

/**
 * The whole card is clickable, but the BUTTON is only the name: a <button>
 * may hold phrasing content alone, and one wrapping the card would hide the
 * heading from screen readers. Its ::after stretches over the card instead.
 */
export function ProductCard({ product: p, dict, onOpen, headingLevel = 3 }: Props) {
  const Heading = headingLevel === 4 ? 'h4' : 'h3'
  const brand = brandLine(p, dict)
  const n = p.nutrition

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md has-[button:focus-visible]:outline-2 has-[button:focus-visible]:outline-emerald-600">
      <ProductImage path={p.images.front} size={200} alt="" padded className="aspect-square w-full border-b border-stone-100" />
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <Heading className="line-clamp-2 text-sm font-semibold text-stone-900 group-hover:text-emerald-800">
          <button
            type="button"
            onClick={() => onOpen(p.code)}
            className="text-left outline-none after:absolute after:inset-0 after:content-['']"
          >
            {p.name}
          </button>
        </Heading>
        {(brand || p.quantity) && (
          <p className="line-clamp-1 text-xs text-stone-500">
            {[brand, p.quantity].filter(Boolean).join(' · ')}
          </p>
        )}
        <p className="text-base font-bold text-stone-900">
          {formatKcal(n.kcal)} <span className="text-xs font-normal text-stone-500">/ 100 g</span>
        </p>
        <dl className="grid grid-cols-3 gap-1 text-[11px] text-stone-600">
          <div><dt className="text-stone-400">Białko</dt><dd className="font-medium">{formatGrams(n.protein)}</dd></div>
          <div><dt className="text-stone-400">Tłuszcz</dt><dd className="font-medium">{formatGrams(n.fat)}</dd></div>
          <div><dt className="text-stone-400">Węglow.</dt><dd className="font-medium">{formatGrams(n.carbs)}</dd></div>
        </dl>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-x-2 gap-y-1 pt-1">
          <div className="flex flex-wrap gap-1">
            {p.nutriscore && <ScoreBadge kind="nutriscore" value={p.nutriscore} />}
            {p.nova && <ScoreBadge kind="nova" value={p.nova} />}
          </div>
          {p.price && <PriceTag price={p.price} className="text-sm" />}
        </div>
      </div>
    </article>
  )
}
