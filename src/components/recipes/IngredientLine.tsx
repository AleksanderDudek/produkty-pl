import { Info } from 'lucide-react'
import { brandLine } from '../../lib/display.ts'
import { formatNumber } from '../../lib/format.ts'
import type { Dictionaries, IndexedProduct } from '../../lib/types.ts'
import type { ResolvedItem } from '../../recipes/resolve.ts'

interface Props {
  resolved: ResolvedItem
  store: string | null
  dict: Dictionaries
  onSwap: (code: string) => void
  onOpenProduct: (code: string) => void
}

/** Why this line's product is what it is, in a few words. */
function sourceNote({ def, product, fromStore }: ResolvedItem, store: string | null): string | null {
  if (def.role === 'pantry') return product && fromStore ? null : 'masz w domu'
  if (!product) return def.role === 'staple' ? 'w każdym sklepie · wartości typowe' : null
  if (store && !fromStore) return 'z innego sklepu'
  return null
}

const MAX_OPTIONS = 25

function optionLabel(p: IndexedProduct, dict: Dictionaries): string {
  const brand = brandLine(p, dict)
  return `${p.name}${brand ? ` · ${brand}` : ''} – ${formatNumber(p.nutrition.protein ?? 0)} g białka/100 g`
}

export function IngredientLine({ resolved, store, dict, onSwap, onOpenProduct }: Props) {
  const { item, def, product, alternatives } = resolved
  const note = sourceNote(resolved, store)
  // A stable list that includes the chosen product, so the select can BE the
  // choice: arrow keys step through it in order instead of toggling.
  const options = alternatives.slice(0, MAX_OPTIONS)
  if (product && !options.includes(product)) options.push(product)

  return (
    <li className="flex flex-col gap-1 py-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-medium text-stone-900">{def.label}</span>
        <span className="shrink-0 text-sm tabular-nums text-stone-600">
          {item.measure ? `${item.measure} · ` : ''}
          {formatNumber(item.grams, 0)}&nbsp;g
        </span>
      </div>
      {product && (
        <div className="flex items-center gap-1.5 text-xs">
          {options.length > 1 ? (
            <select
              value={product.code}
              onChange={(e) => onSwap(e.target.value)}
              aria-label={`Produkt: ${def.label}`}
              className="min-w-0 flex-1 truncate rounded border border-stone-300 bg-white px-1.5 py-1 text-xs text-emerald-800"
            >
              {options.map((p) => <option key={p.code} value={p.code}>{optionLabel(p, dict)}</option>)}
            </select>
          ) : (
            <span className="min-w-0 flex-1 truncate text-emerald-800">{optionLabel(product, dict)}</span>
          )}
          <button
            type="button"
            onClick={() => onOpenProduct(product.code)}
            aria-label={`Szczegóły: ${product.name}`}
            title="Szczegóły produktu"
            className="shrink-0 rounded p-1 text-stone-500 hover:bg-stone-100 hover:text-emerald-700"
          >
            <Info className="size-4" aria-hidden />
          </button>
        </div>
      )}
      {note && <span className="text-xs text-stone-400">{note}</span>}
    </li>
  )
}
