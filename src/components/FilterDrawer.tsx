import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { formatNumber } from '../lib/format.ts'

interface Props {
  open: boolean
  resultCount: number
  onClose: () => void
  children: ReactNode
}

/** The filter panel as a side sheet on narrow screens: a native modal dialog. */
export function FilterDrawer({ open, resultCount, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) ref.current?.close()
      }}
      aria-label="Filtry"
      className="mr-auto ml-0 h-full max-h-none w-[min(360px,92vw)] bg-white p-0 shadow-2xl backdrop:bg-stone-900/40 open:flex open:flex-col"
    >
      <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
        <h2 className="text-base font-semibold">Filtry</h2>
        <button type="button" onClick={() => ref.current?.close()} className="rounded p-1 hover:bg-stone-100" aria-label="Zamknij filtry">
          <X className="size-5" aria-hidden />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4">{children}</div>
      <div className="border-t border-stone-200 p-3">
        <button
          type="button"
          onClick={() => ref.current?.close()}
          className="h-10 w-full rounded-lg bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Pokaż {formatNumber(resultCount, 0)} produktów
        </button>
      </div>
    </dialog>
  )
}
