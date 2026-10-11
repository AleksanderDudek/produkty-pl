import { ExternalLink, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { brandLine, names } from '../lib/display.ts'
import { formatDate, formatGrams, formatKcal } from '../lib/format.ts'
import { NUTRIENT_LABELS, PALM_OIL_LABELS, TRI_LABELS } from '../lib/labels.ts'
import { NUTRIENTS, type Dictionaries, type Product } from '../lib/types.ts'
import { PriceTag } from './PriceTag.tsx'
import { ProductImage } from './ProductImage.tsx'
import { ScoreBadge } from './ScoreBadge.tsx'

interface Props {
  product: Product
  dict: Dictionaries
  onClose: () => void
}

const IMAGE_LABELS = { front: 'Opakowanie', ingredients: 'Skład', nutrition: 'Wartości odżywcze' } as const
type ImageKind = keyof typeof IMAGE_LABELS

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">{title}</h3>
      <div className="text-sm text-stone-800">{children}</div>
    </section>
  )
}

function Tags({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-1">
      {items.map((item) => (
        <li key={item} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-700">{item}</li>
      ))}
    </ul>
  )
}

/**
 * A native <dialog> opened with showModal(): the browser supplies the focus
 * trap, Esc to close and the inert background.
 */
export function ProductDetail({ product: p, dict, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const kinds = (Object.keys(IMAGE_LABELS) as ImageKind[]).filter((k) => p.images[k])
  const [shown, setShown] = useState<ImageKind>(kinds[0] ?? 'front')
  // Captured once, before showModal() moves focus into the dialog.
  const [opener] = useState(() => document.activeElement)

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  // Closing with Esc or the X lets the browser return focus to the opener.
  // Closing with Back unmounts the dialog without close(), so nothing does:
  // do it here, or keyboard users start again from the top of the page.
  useEffect(() => () => {
    if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
  }, [opener])

  const brand = brandLine(p, dict)
  const category = p.mainCategory ? dict.categories[p.mainCategory] ?? p.mainCategory : null
  const allergens = names(dict, 'allergens', p.allergens)
  const traces = names(dict, 'allergens', p.traces)
  const diet = [
    p.vegan && `wegańskie: ${TRI_LABELS[p.vegan]}`,
    p.vegetarian && `wegetariańskie: ${TRI_LABELS[p.vegetarian]}`,
    p.palmOil && PALM_OIL_LABELS[p.palmOil],
  ].filter((x): x is string => !!x)

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) ref.current?.close()
      }}
      aria-labelledby="product-title"
      className="m-auto max-h-[92vh] w-[min(1000px,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl bg-white p-0 text-stone-900 shadow-2xl backdrop:bg-stone-900/50"
    >
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-stone-200 bg-white/95 px-5 py-4 backdrop-blur">
        <div>
          <h2 id="product-title" className="text-lg font-bold leading-tight">{p.name}</h2>
          <p className="text-sm text-stone-500">{[brand, p.quantity].filter(Boolean).join(' · ')}</p>
        </div>
        <button
          type="button"
          onClick={() => ref.current?.close()}
          className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-900"
          aria-label="Zamknij"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>

      <div className="grid gap-6 p-5 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="flex flex-col gap-3">
          <ProductImage path={p.images[shown]} size={400} alt={`${p.name} – ${IMAGE_LABELS[shown]}`} padded className="aspect-square w-full rounded-xl border border-stone-200" />
          {kinds.length > 1 && (
            <div className="flex gap-2" role="group" aria-label="Zdjęcia">
              {kinds.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setShown(kind)}
                  aria-pressed={shown === kind}
                  className={`flex flex-col items-center gap-1 rounded-lg border-2 p-1 text-[11px] ${
                    shown === kind ? 'border-emerald-600' : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <ProductImage path={p.images[kind]} size={100} alt="" className="size-14 rounded" />
                  {IMAGE_LABELS[kind]}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {p.nutriscore && <ScoreBadge kind="nutriscore" value={p.nutriscore} size="md" />}
            {p.nova && <ScoreBadge kind="nova" value={p.nova} size="md" />}
            {p.ecoscore && <ScoreBadge kind="ecoscore" value={p.ecoscore} size="md" />}
          </div>
          {p.price && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <PriceTag price={p.price} className="text-xl" />
              <p className="mt-1 text-xs text-stone-600">
                {[p.price.store, p.price.city].filter(Boolean).join(', ') || 'Sklep nieznany'} ·{' '}
                {formatDate(p.price.date)}
                {p.price.discounted && ' · promocja'}
              </p>
              {p.price.count > 1 && (
                <p className="text-xs text-stone-500">Najnowsza z {p.price.count} zgłoszonych cen.</p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-5">
          {(p.genericName || category) && (
            <Block title="Opis">
              {p.genericName && <p>{p.genericName}</p>}
              {category && <p className="text-stone-600">Kategoria: {category}</p>}
            </Block>
          )}

          <Block title="Wartości odżywcze w 100 g">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-stone-100">
                {NUTRIENTS.map((key) => {
                  const nested = key === 'saturatedFat' || key === 'sugars'
                  return (
                    <tr key={key}>
                      <th scope="row" className={`py-1 text-left font-normal ${nested ? 'pl-4 text-stone-500' : ''}`}>
                        {NUTRIENT_LABELS[key]}
                      </th>
                      <td className="py-1 text-right tabular-nums font-medium">
                        {key === 'kcal' ? formatKcal(p.nutrition.kcal) : formatGrams(p.nutrition[key])}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {p.servingSize && <p className="mt-1 text-xs text-stone-500">Porcja: {p.servingSize}</p>}
          </Block>

          {p.ingredientsText && (
            <Block title="Składniki">
              <p className="leading-relaxed">{p.ingredientsText}</p>
            </Block>
          )}

          {(allergens.length > 0 || traces.length > 0) && (
            <Block title="Alergeny">
              {allergens.length > 0 && <p>Zawiera: {allergens.join(', ')}</p>}
              {traces.length > 0 && <p className="text-stone-600">Może zawierać: {traces.join(', ')}</p>}
            </Block>
          )}

          {p.additives.length > 0 && (
            <Block title={`Dodatki (${p.additives.length})`}>
              <Tags items={names(dict, 'additives', p.additives)} />
            </Block>
          )}

          {p.labels.length > 0 && (
            <Block title="Etykiety">
              <Tags items={names(dict, 'labels', p.labels)} />
            </Block>
          )}

          {diet.length > 0 && <Block title="Dieta"><p>{diet.join(' · ')}</p></Block>}

          {p.stores.length > 0 && (
            <Block title="Sklepy">
              <p>{names(dict, 'stores', p.stores).join(', ')}</p>
            </Block>
          )}

          <Block title="Kod kreskowy">
            <p className="font-mono">{p.code}</p>
          </Block>

          <a
            href={`https://pl.openfoodfacts.org/produkt/${encodeURIComponent(p.code)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-emerald-700 hover:underline"
          >
            Zobacz w Open Food Facts <ExternalLink className="size-4" aria-hidden />
          </a>
        </div>
      </div>
    </dialog>
  )
}
