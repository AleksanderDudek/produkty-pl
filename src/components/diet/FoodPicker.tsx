import { X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { db } from '../../diet/db.ts'
import { productFood, withGrams, type Food } from '../../diet/foods.ts'
import { logFood, logQuick } from '../../diet/store.ts'
import { matchesQuery } from '../../lib/search.ts'
import { normalizeForSearch, tokenize } from '../../lib/text.ts'
import type { Dictionaries, IndexedProduct } from '../../lib/types.ts'
import { MacroLine } from './SuggestionList.tsx'

interface Props {
  open: boolean
  date: string
  pool: Food[]
  products: IndexedProduct[]
  dict: Dictionaries
  onClose: () => void
}

const MAX_RESULTS = 30
const input = 'h-9 w-full rounded-lg border border-stone-300 px-2 text-sm outline-none focus:border-emerald-600'

function numberOrNull(text: string): number | null {
  const n = Number(text.replace(',', '.'))
  return text.trim() && Number.isFinite(n) && n >= 0 ? n : null
}

/**
 * "Dodaj zjedzone": search everything that can be eaten - the plan's items,
 * the user's own foods, recipes and every product in the database - or just
 * write down calories, like the workbook's "extra kcal" for a dinner out.
 */
export function FoodPicker({ open, date, pool, products, dict, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState<'search' | 'quick'>('search')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Food | null>(null)
  const [grams, setGrams] = useState('')
  const [quick, setQuick] = useState({ name: '', kcal: '', protein: '', carbs: '', fat: '', save: false })
  // A double tap must not log the same meal twice.
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      // React's autoFocus runs at mount, while the dialog is still closed: focus once it is shown.
      searchRef.current?.focus()
    } else if (!open && dialog.open) dialog.close()
  }, [open])

  const results = useMemo(() => {
    const tokens = tokenize(query)
    const ownFirst = pool.filter((f) => f.source !== 'product')
    if (!tokens.length) return ownFirst.slice(0, MAX_RESULTS)
    const fromPool = ownFirst.filter((f) => matchesQuery(normalizeForSearch(f.name), tokens))
    const fromProducts: Food[] = []
    for (const p of products) {
      if (fromProducts.length >= MAX_RESULTS) break
      if (!matchesQuery(p.searchText, tokens)) continue
      const food = productFood(p, dict)
      if (food) fromProducts.push(food)
    }
    return [...fromPool, ...fromProducts].slice(0, MAX_RESULTS)
  }, [query, pool, products, dict])

  const chosen = selected && selected.per100 && numberOrNull(grams) ? withGrams(selected, numberOrNull(grams)!) : selected

  const reset = () => {
    setSelected(null)
    setGrams('')
    setQuery('')
    setQuick({ name: '', kcal: '', protein: '', carbs: '', fat: '', save: false })
  }

  const once = async (work: () => Promise<unknown>) => {
    if (busy) return
    setBusy(true)
    try {
      await work()
      reset()
      ref.current?.close()
    } finally {
      setBusy(false)
    }
  }

  const add = () => {
    if (chosen) void once(() => logFood(date, chosen))
  }

  const addQuick = () => {
    const kcal = numberOrNull(quick.kcal)
    if (kcal === null) return
    const macros = { protein: numberOrNull(quick.protein), carbs: numberOrNull(quick.carbs), fat: numberOrNull(quick.fat) }
    const name = quick.name.trim()
    void once(() =>
      // One transaction: the meal and the saved food arrive together or not at all.
      db.transaction('rw', db.entries, db.foods, async () => {
        await logQuick(date, name, kcal, macros)
        if (quick.save && name) await db.foods.add({ name, amountLabel: '1 porcja', kcal, ...macros })
      }),
    )
  }

  const tabButton = (value: typeof tab, label: string) => (
    <button
      type="button"
      onClick={() => setTab(value)}
      aria-pressed={tab === value}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === value ? 'bg-emerald-600 text-white' : 'text-stone-600 hover:bg-stone-100'}`}
    >
      {label}
    </button>
  )

  return (
    <dialog
      ref={ref}
      onClose={() => {
        reset()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) ref.current?.close()
      }}
      aria-labelledby="food-picker-title"
      className="m-auto max-h-[90vh] w-[min(640px,calc(100vw-1.5rem))] rounded-2xl bg-white p-0 text-stone-900 shadow-2xl backdrop:bg-stone-900/50"
    >
      <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
        <h2 id="food-picker-title" className="text-base font-semibold">Dodaj zjedzone</h2>
        <button type="button" onClick={() => ref.current?.close()} aria-label="Zamknij" className="rounded p-1 hover:bg-stone-100">
          <X className="size-5" aria-hidden />
        </button>
      </div>
      <div className="flex gap-1 px-4 pt-3" role="group" aria-label="Sposób dodania">
        {tabButton('search', 'Szukaj')}
        {tabButton('quick', 'Tylko kalorie')}
      </div>

      {tab === 'search' ? (
        <div className="flex flex-col gap-3 p-4">
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelected(null)
            }}
            placeholder="Produkt, przepis, pozycja planu…"
            aria-label="Szukaj jedzenia"
            className={input}
          />
          {chosen ? (
            <div className="flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-sm font-semibold">{chosen.name}</p>
              <p className="text-xs text-stone-600">{chosen.detail}</p>
              {chosen.per100 && (
                <label className="flex items-center gap-2 text-sm">
                  Ile gramów
                  <input
                    inputMode="decimal"
                    value={grams}
                    onChange={(e) => setGrams(e.target.value)}
                    aria-label="Gramy"
                    className="h-8 w-24 rounded-md border border-stone-300 px-2 text-sm"
                  />
                </label>
              )}
              <p className="text-sm">
                <MacroLine food={chosen} /> · {chosen.amountLabel}
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={add} disabled={busy} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60">
                  Dodaj
                </button>
                <button type="button" onClick={() => setSelected(null)} className="rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100">
                  Wróć
                </button>
              </div>
            </div>
          ) : (
            <ul className="flex max-h-[50vh] flex-col divide-y divide-stone-100 overflow-y-auto">
              {results.map((food) => (
                <li key={food.key}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(food)
                      setGrams(food.grams ? String(food.grams) : '')
                    }}
                    className="flex w-full flex-col items-start gap-0.5 px-1 py-2 text-left hover:bg-stone-50"
                  >
                    <span className="text-sm font-medium">{food.name}</span>
                    <span className="text-xs text-stone-500">
                      <MacroLine food={food} /> · {food.amountLabel} · {food.detail}
                    </span>
                  </button>
                </li>
              ))}
              {results.length === 0 && <li className="py-3 text-sm text-stone-500">Nic nie pasuje – dodaj samo „Tylko kalorie”.</li>}
            </ul>
          )}
        </div>
      ) : (
        <form
          className="grid grid-cols-2 gap-3 p-4"
          onSubmit={(e) => {
            e.preventDefault()
            addQuick()
          }}
        >
          <label className="col-span-2 flex flex-col gap-1 text-sm">
            Co to było
            <input value={quick.name} onChange={(e) => setQuick({ ...quick, name: e.target.value })} placeholder="np. obiad u rodziców" className={input} />
          </label>
          <label className="col-span-2 flex flex-col gap-1 text-sm sm:col-span-1">
            Kalorie (kcal)
            <input required inputMode="decimal" value={quick.kcal} onChange={(e) => setQuick({ ...quick, kcal: e.target.value })} className={input} />
          </label>
          <p className="col-span-2 text-xs text-stone-500 sm:col-span-1 sm:self-end">Makroskładniki – jeśli znasz:</p>
          {(['protein', 'carbs', 'fat'] as const).map((k) => (
            <label key={k} className="flex flex-col gap-1 text-sm">
              {{ protein: 'Białko (g)', carbs: 'Węglowodany (g)', fat: 'Tłuszcz (g)' }[k]}
              <input inputMode="decimal" value={quick[k]} onChange={(e) => setQuick({ ...quick, [k]: e.target.value })} className={input} />
            </label>
          ))}
          <label className="col-span-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={quick.save} onChange={(e) => setQuick({ ...quick, save: e.target.checked })} className="size-4 accent-emerald-600" />
            Zapisz jako moje jedzenie (pojawi się w wyszukiwaniu i propozycjach)
          </label>
          <button type="submit" disabled={busy} className="col-span-2 h-10 rounded-lg bg-emerald-600 text-sm font-semibold text-white disabled:opacity-60">
            Dodaj
          </button>
        </form>
      )}
    </dialog>
  )
}
