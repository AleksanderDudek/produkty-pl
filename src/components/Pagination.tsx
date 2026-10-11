import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatNumber } from '../lib/format.ts'

interface Props {
  page: number
  pageCount: number
  onPage: (page: number) => void
}

/** First, last, and two either side of the current page, with gaps marked. */
function pageNumbers(page: number, pageCount: number): (number | 'gap')[] {
  const wanted = new Set([1, pageCount, page - 2, page - 1, page, page + 1, page + 2])
  const pages = [...wanted].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b)
  const out: (number | 'gap')[] = []
  for (const p of pages) {
    const last = out[out.length - 1]
    if (typeof last === 'number' && p - last > 1) out.push('gap')
    out.push(p)
  }
  return out
}

export function Pagination({ page, pageCount, onPage }: Props) {
  if (pageCount <= 1) return null
  const button = 'inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm'

  return (
    <nav aria-label="Strony wyników" className="flex flex-wrap items-center justify-center gap-1">
      <button
        type="button"
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        className={`${button} border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-40`}
        aria-label="Poprzednia strona"
      >
        <ChevronLeft className="size-4" aria-hidden />
      </button>
      {pageNumbers(page, pageCount).map((p, i) =>
        p === 'gap' ? (
          <span key={`gap-${i}`} className="px-1 text-stone-400">…</span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPage(p)}
            aria-current={p === page ? 'page' : undefined}
            className={`${button} ${
              p === page
                ? 'border-emerald-600 bg-emerald-600 font-semibold text-white'
                : 'border-stone-200 bg-white hover:bg-stone-50'
            }`}
          >
            {formatNumber(p, 0)}
          </button>
        ),
      )}
      <button
        type="button"
        onClick={() => onPage(page + 1)}
        disabled={page >= pageCount}
        className={`${button} border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-40`}
        aria-label="Następna strona"
      >
        <ChevronRight className="size-4" aria-hidden />
      </button>
    </nav>
  )
}
