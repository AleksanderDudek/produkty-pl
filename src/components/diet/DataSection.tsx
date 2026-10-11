import { Download, Trash2, Upload } from 'lucide-react'
import { useId, useState } from 'react'
import { db } from '../../diet/db.ts'
import { clearAll, exportAll, now, restoreAll } from '../../diet/store.ts'
import { useCustomFoods } from '../../hooks/useDiet.ts'
import { formatNumber } from '../../lib/format.ts'
import { ImportWorkbook } from './ImportWorkbook.tsx'

/** Backup, restore, the user's own foods, and wiping it all - the data lives only here. */
export function DataSection() {
  const restoreId = useId()
  const custom = useCustomFoods()
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const download = async () => {
    const backup = await exportAll()
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `dieta-kopia-${now().date}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const restore = async (file: File) => {
    try {
      if (!window.confirm('Przywrócić kopię? Obecne dane na tym urządzeniu zostaną nią zastąpione.')) return
      const { dropped } = await restoreAll(JSON.parse(await file.text()))
      setMessage({ ok: true, text: dropped ? `Kopia przywrócona. Pominięte nieczytelne wpisy: ${dropped}.` : 'Kopia przywrócona.' })
    } catch (error) {
      setMessage({ ok: false, text: error instanceof SyntaxError ? 'To nie jest plik kopii (JSON).' : error instanceof Error ? error.message : 'Nie udało się przywrócić.' })
    }
  }

  return (
    <section aria-labelledby="data-title" className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-4">
      <div>
        <h2 id="data-title" className="text-base font-semibold">Twoje dane</h2>
        <p className="text-sm text-stone-600">
          Profil, zapisy i plan są tylko w tej przeglądarce na tym urządzeniu – nic nie jest wysyłane. Wyczyszczenie danych przeglądarki je usunie, więc zrób kopię.
        </p>
      </div>

      <div className="flex flex-wrap items-start gap-2">
        <button type="button" onClick={() => void download()} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium hover:bg-stone-50">
          <Download className="size-4" aria-hidden /> Pobierz kopię
        </button>
        <label htmlFor={restoreId} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium hover:bg-stone-50">
          <Upload className="size-4" aria-hidden /> Przywróć z kopii
        </label>
        <input
          id={restoreId}
          type="file"
          accept=".json,application/json"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) void restore(file)
          }}
        />
        <ImportWorkbook label="Wczytaj plan z Excela" />
      </div>
      {message && (
        <p role="status" className={`text-sm ${message.ok ? 'text-emerald-800' : 'text-red-700'}`}>
          {message.text}
        </p>
      )}

      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold">Moje jedzenie</h3>
        {!custom?.length ? (
          <p className="text-xs text-stone-500">Nic jeszcze. Przy „Dodaj zjedzone → Tylko kalorie” zaznacz „Zapisz jako moje jedzenie”.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-stone-100 text-sm">
            {custom.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-2 py-1.5">
                <span>
                  {f.name} <span className="text-xs text-stone-500 tabular-nums">· {formatNumber(f.kcal, 0)} kcal</span>
                </span>
                <button type="button" onClick={() => void db.foods.delete(f.id)} aria-label={`Usuń: ${f.name}`} className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-red-600">
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          if (window.confirm('Usunąć WSZYSTKO: profil, zapisy jedzenia, pomiary, plan i moje jedzenie? Tego nie da się cofnąć.')) void clearAll()
        }}
        className="inline-flex w-fit items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
      >
        <Trash2 className="size-4" aria-hidden /> Usuń wszystkie dane
      </button>
    </section>
  )
}
