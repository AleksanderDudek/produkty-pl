import { useId, useState } from 'react'

interface Props {
  label: string
  value: number
  onChange: (value: number) => void
  suffix?: string
  min?: number
  max?: number
  integer?: boolean
}

function parse(text: string, integer: boolean): number | null {
  const n = Number(text.replace(',', '.').trim())
  if (!text.trim() || !Number.isFinite(n)) return null
  return integer ? Math.round(n) : n
}

/**
 * A number typed the Polish way ("105,5") without the field fighting the
 * typing: it keeps its own text and reports a number only when the text is
 * one. A value set from outside (a preset button) replaces the text, unless
 * the text already means that value.
 */
export function NumberField({ label, value, onChange, suffix, min, max, integer = false }: Props) {
  const id = useId()
  const [text, setText] = useState(String(value))
  const [shown, setShown] = useState(value)
  if (value !== shown) {
    setShown(value)
    if (parse(text, integer) !== value) setText(String(value))
  }
  const parsed = parse(text, integer)
  const invalid = parsed === null || (min !== undefined && parsed < min) || (max !== undefined && parsed > max)
  const hint = min !== undefined && max !== undefined ? `Wpisz liczbę od ${min} do ${max}.` : 'Wpisz liczbę.'

  return (
    <div className="flex flex-col gap-1 text-sm">
      <label htmlFor={id} className="text-stone-700">
        {label}
      </label>
      <div className="flex items-center gap-1.5">
        <input
          id={id}
          inputMode={integer ? 'numeric' : 'decimal'}
          value={text}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${id}-error` : undefined}
          onChange={(e) => {
            setText(e.target.value)
            const n = parse(e.target.value, integer)
            if (n !== null && (min === undefined || n >= min) && (max === undefined || n <= max)) {
              setShown(n)
              onChange(n)
            }
          }}
          className={`h-9 w-full min-w-0 rounded-lg border px-2 tabular-nums outline-none focus:border-emerald-600 ${invalid ? 'border-red-400' : 'border-stone-300'}`}
        />
        {suffix && <span className="shrink-0 text-xs text-stone-500">{suffix}</span>}
      </div>
      {invalid && (
        <p id={`${id}-error`} className="text-xs text-red-700">
          {hint}
        </p>
      )}
    </div>
  )
}
