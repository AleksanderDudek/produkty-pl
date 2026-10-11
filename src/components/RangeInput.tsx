import { useDebouncedDraft } from '../hooks/useDebouncedDraft.ts'
import type { Range } from '../lib/filters.ts'

interface Props {
  label: string
  unit: string
  step: number
  range: Range | undefined
  onChange: (range: Range | undefined) => void
}

/** "10,5" and "10.5" both mean ten and a half; anything else means unset. */
function parse(text: string): number | null {
  const trimmed = text.trim().replace(',', '.')
  if (!trimmed) return null
  const n = Number(trimmed)
  return Number.isFinite(n) && n >= 0 ? n : null
}

const sameNumber = (draft: string, committed: string) => parse(draft) === parse(committed)

export function RangeInput({ label, unit, step, range, onChange }: Props) {
  const min = range?.min ?? null
  const max = range?.max ?? null

  const commit = (nextMin: number | null, nextMax: number | null) =>
    onChange(nextMin === null && nextMax === null ? undefined : { min: nextMin, max: nextMax })

  const [minDraft, setMinDraft, flushMin] = useDebouncedDraft(min === null ? '' : String(min), (d) => commit(parse(d), max), sameNumber)
  const [maxDraft, setMaxDraft, flushMax] = useDebouncedDraft(max === null ? '' : String(max), (d) => commit(min, parse(d)), sameNumber)

  const input = 'h-8 w-full min-w-0 rounded-md border border-stone-300 px-2 text-sm tabular-nums outline-none focus:border-emerald-600'
  return (
    <fieldset className="grid grid-cols-[1fr_auto] items-center gap-x-2 gap-y-1">
      <legend className="sr-only">{label}</legend>
      <span className="col-span-2 text-xs font-medium text-stone-600">
        {label}{unit && <span className="font-normal text-stone-400"> ({unit})</span>}
      </span>
      <div className="flex items-center gap-1.5">
        <input
          inputMode="decimal"
          step={step}
          value={minDraft}
          onChange={(e) => setMinDraft(e.target.value)}
          onBlur={flushMin}
          placeholder="od"
          aria-label={`${label} od`}
          className={input}
        />
        <span className="text-stone-400">–</span>
        <input
          inputMode="decimal"
          step={step}
          value={maxDraft}
          onChange={(e) => setMaxDraft(e.target.value)}
          onBlur={flushMax}
          placeholder="do"
          aria-label={`${label} do`}
          className={input}
        />
      </div>
      {range ? (
        <button
          type="button"
          onClick={() => {
            setMinDraft('')
            setMaxDraft('')
            onChange(undefined)
          }}
          className="text-xs text-stone-400 hover:text-stone-700"
          aria-label={`Wyczyść: ${label}`}
        >
          ✕
        </button>
      ) : <span />}
    </fieldset>
  )
}
