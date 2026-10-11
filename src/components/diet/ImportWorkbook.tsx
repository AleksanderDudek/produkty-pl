import { Upload } from 'lucide-react'
import { useId, useState } from 'react'
import { importWorkbook } from '../../diet/store.ts'

type Result = { kind: 'ok'; text: string; warnings: string[] } | { kind: 'error'; text: string }

/**
 * Reads the user's own plan workbook IN the browser: the file is never sent
 * anywhere and never stored as a file - only the plan read out of it is kept,
 * on this device.
 */
export function ImportWorkbook({ label = 'Wczytaj plan z Excela', onDone }: { label?: string; onDone?: () => void }) {
  const id = useId()
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result | null>(null)

  const read = async (file: File) => {
    setBusy(true)
    setResult(null)
    try {
      const imported = await importWorkbook(new Uint8Array(await file.arrayBuffer()))
      const variants = Object.values(imported.plan.templates).reduce((sum, v) => sum + v.length, 0)
      setResult({
        kind: 'ok',
        text: `Wczytano „${imported.plan.name}”: ${imported.plan.days.length} dni, ${Object.keys(imported.plan.templates).length} dni wzorcowych, ${variants} wariantów${
          imported.days.length ? `, ${imported.days.length} dni z zapisami` : ''
        }.`,
        warnings: imported.profileApplied
          ? imported.warnings
          : ['Profil zostaje bez zmian – parametry z panelu arkusza wczytuję tylko przy pierwszym imporcie. Zmienisz je w zakładce „Profil”.', ...imported.warnings],
      })
      onDone?.()
    } catch (error) {
      setResult({ kind: 'error', text: error instanceof Error ? error.message : 'Nie udało się odczytać pliku.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className={`inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-600 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 ${busy ? 'pointer-events-none opacity-60' : ''}`}
      >
        <Upload className="size-4" aria-hidden /> {busy ? 'Czytam…' : label}
      </label>
      <input
        id={id}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) void read(file)
        }}
      />
      {result && (
        <div role="status" className={`rounded-lg px-3 py-2 text-sm ${result.kind === 'ok' ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-800'}`}>
          <p>{result.text}</p>
          {result.kind === 'ok' && result.warnings.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-xs text-amber-800">
              {result.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
