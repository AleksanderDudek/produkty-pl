import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { Food } from '../../diet/foods.ts'
import { SWAP_TOLERANCE, type Suggestion } from '../../diet/suggest.ts'
import { MacroLine, SuggestionList } from './SuggestionList.tsx'

interface Props {
  /** The item being replaced; null: closed. */
  item: Food | null
  options: Suggestion[]
  onPick: (food: Food) => void
  onClose: () => void
}

/** "Zamień": what can stand in for a planned item at about the same calories, closest macros first. */
export function SwapDialog({ item, options, onPick, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (item && !dialog.open) dialog.showModal()
    else if (!item && dialog.open) dialog.close()
  }, [item])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) ref.current?.close()
      }}
      aria-labelledby="swap-title"
      className="m-auto max-h-[90vh] w-[min(640px,calc(100vw-1.5rem))] rounded-2xl bg-white p-0 text-stone-900 shadow-2xl backdrop:bg-stone-900/50"
    >
      {item && (
        <>
          <div className="flex items-start justify-between gap-3 border-b border-stone-200 px-4 py-3">
            <div>
              <h2 id="swap-title" className="text-base font-semibold">Zamień: {item.name}</h2>
              <p className="text-xs text-stone-500">
                <MacroLine food={item} /> · zamienniki ±{Math.round(SWAP_TOLERANCE * 100)}% kalorii, najbliższe makro najpierw
              </p>
            </div>
            <button type="button" onClick={() => ref.current?.close()} aria-label="Zamknij" className="rounded p-1 hover:bg-stone-100">
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto px-4 py-2">
            {options.length ? (
              <SuggestionList
                suggestions={options}
                actionLabel="Wybierz"
                onPick={(food) => {
                  onPick(food)
                  ref.current?.close()
                }}
              />
            ) : (
              <p className="py-4 text-sm text-stone-500">
                Nie ma nic o podobnej kaloryczności. Dodaj własne jedzenie („Dodaj zjedzone” → „Tylko kalorie” → zapisz) albo pomiń tę pozycję.
              </p>
            )}
          </div>
        </>
      )}
    </dialog>
  )
}
