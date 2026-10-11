import { AlertTriangle, Check } from 'lucide-react'
import { useState } from 'react'
import { bmr, dayReaching, forecast, paceKgPerWeek, suggestedKcal, tdee } from '../../diet/energy.ts'
import { addDays } from '../../diet/model.ts'
import { DIET_PROFILE_IDS, DIET_PROFILES } from '../../diet/profiles.ts'
import { saveProfile } from '../../diet/store.ts'
import type { Profile } from '../../diet/types.ts'
import { formatDate, formatNumber } from '../../lib/format.ts'
import { DataSection } from './DataSection.tsx'
import { ImportWorkbook } from './ImportWorkbook.tsx'
import { NumberField } from './NumberField.tsx'

interface Props {
  /** The saved profile, or a starting point when there is none yet. */
  profile: Profile
  isNew: boolean
  /** The latest weighing, for the calorie presets (the start weight before any). */
  currentWeight: number
  /** Chain keys with display names, best for recipes first. */
  stores: { key: string; name: string }[]
}

const ACTIVITY: { value: number; label: string }[] = [
  { value: 1.2, label: 'Siedzący tryb, bez treningów' },
  { value: 1.28, label: 'Praca przy biurku + 2 treningi w tygodniu' },
  { value: 1.375, label: 'Lekko aktywny: 1–3 treningi w tygodniu' },
  { value: 1.55, label: 'Aktywny: 3–5 treningów w tygodniu' },
  { value: 1.725, label: 'Bardzo aktywny: codzienny wysiłek' },
]

const PACES = [0.25, 0.5, 0.75, 1]

function sameProfile(a: Profile, b: Profile): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)].filter((k) => k !== 'id'))
  return [...keys].every((k) => a[k as keyof Profile] === b[k as keyof Profile])
}

/** What is risky about these numbers, in the order it matters. */
function warningsOf(p: Profile, weight: number): string[] {
  const out: string[] = []
  const base = bmr(p, weight)
  const pace = paceKgPerWeek(p, weight, p.dailyKcal)
  if (p.dailyKcal < base) out.push(`Cel ${p.dailyKcal} kcal jest poniżej podstawowej przemiany materii (${Math.round(base)} kcal) – trudny do utrzymania i grozi utratą mięśni.`)
  if (p.dailyKcal < (p.sex === 'M' ? 1500 : 1200)) out.push('Bardzo mało kalorii – trudno wtedy dostarczyć wszystkie składniki odżywcze.')
  if (pace > weight * 0.01) out.push(`Tempo ${formatNumber(pace, 2)} kg/tydz. to ponad 1% masy ciała – zwykle za szybko, by utrzymać mięśnie i wytrwać.`)
  if (pace < 0) out.push('To nadwyżka kalorii – waga będzie rosła.')
  if (p.targetWeightKg >= p.startWeightKg) out.push('Waga docelowa nie jest niższa od startowej – prognoza nie pokaże daty osiągnięcia celu.')
  return out
}

/**
 * Who the plan is for, and what the day's numbers come from. Everything the
 * workbook's PANEL asks is here; what a person does not have to know (energy
 * per kilogram, calories per thousand steps) sits under "Zaawansowane" with
 * the workbook's values.
 */
export function ProfileView({ profile, isNew, currentWeight, stores }: Props) {
  const [draft, setDraft] = useState<Profile>(profile)
  const [saved, setSaved] = useState(false)
  // A profile changed elsewhere (an imported workbook, a restored backup)
  // replaces the form; the same values coming back from a save do not.
  const [source, setSource] = useState(profile)
  if (profile !== source) {
    setSource(profile)
    if (!sameProfile(profile, draft)) {
      setDraft(profile)
      setSaved(false)
    }
  }
  const set = (patch: Partial<Profile>) => {
    setDraft((d) => ({ ...d, ...patch }))
    setSaved(false)
  }

  const weight = isNew ? draft.startWeightKg : currentWeight
  const base = bmr(draft, weight)
  const expenditure = tdee(draft, weight)
  const pace = paceKgPerWeek(draft, weight, draft.dailyKcal)
  const reach = (() => {
    const days = Array.from({ length: 730 }, (_, i) => ({ date: addDays(draft.startDate, i), plannedKcal: draft.dailyKcal }))
    return dayReaching(draft.targetWeightKg, forecast(draft, days), 'plan')
  })()
  const warnings = warningsOf(draft, weight)
  const activityKnown = ACTIVITY.some((a) => a.value === draft.activityMultiplier)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">{isNew ? 'Zacznij od profilu' : 'Profil'}</h1>
        {isNew && (
          <p className="mt-1 max-w-2xl text-sm text-stone-600">
            Z tych danych liczę Twoje spalanie i dzienny cel. Wszystko zostaje na tym urządzeniu. Masz arkusz z planem? Wczytaj go – parametry z panelu i plan
            posiłków przyjdą razem.
          </p>
        )}
      </div>
      {isNew && <ImportWorkbook label="Wczytaj z Excela" />}

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          // A field still showing a typo holds its last valid number in the draft:
          // saving now would store a value the user is not looking at.
          const invalid = e.currentTarget.querySelector<HTMLInputElement>('[aria-invalid="true"]')
          if (invalid) {
            invalid.focus()
            return
          }
          void saveProfile(draft).then(() => setSaved(true))
        }}
      >
        <section aria-labelledby="body-title" className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4">
          <h2 id="body-title" className="text-base font-semibold">Ty</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-stone-700">Płeć</span>
              <select value={draft.sex} onChange={(e) => set({ sex: e.target.value as Profile['sex'] })} className="h-9 rounded-lg border border-stone-300 bg-white px-2">
                <option value="M">mężczyzna</option>
                <option value="K">kobieta</option>
              </select>
            </label>
            <NumberField label="Wiek" value={draft.age} onChange={(age) => set({ age })} integer min={14} max={100} suffix="lat" />
            <NumberField label="Wzrost" value={draft.heightCm} onChange={(heightCm) => set({ heightCm })} min={120} max={230} suffix="cm" />
            <NumberField label="Waga na starcie" value={draft.startWeightKg} onChange={(startWeightKg) => set({ startWeightKg })} min={30} max={350} suffix="kg" />
            <NumberField label="Waga docelowa" value={draft.targetWeightKg} onChange={(targetWeightKg) => set({ targetWeightKg })} min={30} max={350} suffix="kg" />
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-stone-700">Start</span>
              <input
                type="date"
                value={draft.startDate}
                onChange={(e) => e.target.value && set({ startDate: e.target.value })}
                className="h-9 rounded-lg border border-stone-300 px-2"
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-stone-700">Aktywność (bez liczenia kroków)</span>
              <select
                value={draft.activityMultiplier}
                onChange={(e) => set({ activityMultiplier: Number(e.target.value) })}
                className="h-9 rounded-lg border border-stone-300 bg-white px-2"
              >
                {!activityKnown && <option value={draft.activityMultiplier}>Własny współczynnik × {draft.activityMultiplier}</option>}
                {ACTIVITY.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label} (× {a.value})
                  </option>
                ))}
              </select>
            </label>
            <NumberField label="Kroki dziennie (plan)" value={draft.targetSteps} onChange={(targetSteps) => set({ targetSteps })} integer min={0} max={50000} />
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer text-stone-600">Zaawansowane (wartości z arkusza)</summary>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <NumberField label="Kroki już w aktywności" value={draft.baseSteps} onChange={(baseSteps) => set({ baseSteps })} integer min={0} max={30000} />
              <NumberField label="kcal na 1000 kroków na kg" value={draft.kcalPer1000StepsPerKg} onChange={(kcalPer1000StepsPerKg) => set({ kcalPer1000StepsPerKg })} min={0} max={2} />
              <NumberField label="Dodatkowy wysiłek" value={draft.extraWeeklyKcal} onChange={(extraWeeklyKcal) => set({ extraWeeklyKcal })} integer min={0} max={20000} suffix="kcal/tydz." />
              <NumberField label="Energia w 1 kg masy" value={draft.kcalPerKg} onChange={(kcalPerKg) => set({ kcalPerKg })} integer min={3000} max={9000} suffix="kcal" />
            </div>
          </details>
        </section>

        <section aria-labelledby="goal-title" className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4">
          <h2 id="goal-title" className="text-base font-semibold">Cel kalorii</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div className="rounded-xl bg-stone-50 px-3 py-2">
              <dt className="text-xs text-stone-500">Podstawowe spalanie (BMR)</dt>
              <dd className="font-semibold tabular-nums">{formatNumber(base, 0)} kcal</dd>
            </div>
            <div className="rounded-xl bg-stone-50 px-3 py-2">
              <dt className="text-xs text-stone-500">Spalanie dzienne (z krokami)</dt>
              <dd className="font-semibold tabular-nums">{formatNumber(expenditure, 0)} kcal</dd>
            </div>
            <div className="rounded-xl bg-stone-50 px-3 py-2">
              <dt className="text-xs text-stone-500">Deficyt</dt>
              <dd className="font-semibold tabular-nums">{formatNumber(expenditure - draft.dailyKcal, 0)} kcal/dzień</dd>
            </div>
            <div className="rounded-xl bg-stone-50 px-3 py-2">
              <dt className="text-xs text-stone-500">Tempo</dt>
              <dd className="font-semibold tabular-nums">{formatNumber(pace, 2)} kg/tydz.</dd>
              <dd className="text-xs text-stone-500">{reach ? `cel ok. ${formatDate(reach)}` : 'cel poza zasięgiem'}</dd>
            </div>
          </dl>
          <p className="text-xs text-stone-500">Liczone dla wagi {formatNumber(weight, 1)} kg{isNew ? '' : ' (ostatnie ważenie)'}.</p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-40">
              <NumberField label="Dziennie" value={draft.dailyKcal} onChange={(dailyKcal) => set({ dailyKcal })} integer min={800} max={6000} suffix="kcal" />
            </div>
            <div className="flex flex-wrap gap-1" role="group" aria-label="Cel według tempa">
              {PACES.map((p) => {
                const kcal = Math.round(suggestedKcal(draft, weight, p) / 10) * 10
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => set({ dailyKcal: kcal })}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs ${draft.dailyKcal === kcal ? 'border-emerald-600 bg-emerald-50 text-emerald-900' : 'border-stone-300 text-stone-700 hover:bg-stone-50'}`}
                  >
                    −{formatNumber(p, 2)} kg/tydz. · {formatNumber(kcal, 0)} kcal
                  </button>
                )
              })}
            </div>
          </div>
          {warnings.length > 0 && (
            <ul className="flex flex-col gap-1 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {warnings.map((w) => (
                <li key={w} className="flex gap-2">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> {w}
                </li>
              ))}
            </ul>
          )}
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={draft.adaptWeekly} onChange={(e) => set({ adaptWeekly: e.target.checked })} className="mt-0.5 size-4 accent-emerald-600" />
            <span>
              Dopasowuj cel do tygodnia: nadwyżka z wcześniejszych dni jest rozkładana na kolejne (najwyżej 10% celu dziennie), niedojedzone kalorie wracają.
            </span>
          </label>
        </section>

        <fieldset className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4">
          <legend className="px-1 text-base font-semibold">Sposób odżywiania</legend>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {DIET_PROFILE_IDS.map((id) => {
              const p = DIET_PROFILES[id]
              const t = p.targets(draft.dailyKcal, draft.targetWeightKg)
              const active = draft.dietProfile === id
              return (
                <label
                  key={id}
                  className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-3 text-sm ${active ? 'border-emerald-600 bg-emerald-50' : 'border-stone-200 hover:border-stone-300'}`}
                >
                  <span className="flex items-center gap-2 font-semibold">
                    <input type="radio" name="diet-profile" checked={active} onChange={() => set({ dietProfile: id })} className="accent-emerald-600" />
                    {p.label}
                  </span>
                  <span className="text-stone-600">{p.description}</span>
                  <span className="text-xs text-stone-600">
                    <strong className="text-emerald-800">Tak:</strong> {p.allows}
                  </span>
                  <span className="text-xs text-stone-600">
                    <strong className="text-red-700">Unikaj:</strong> {p.avoids}
                  </span>
                  <span className="text-xs text-stone-500 tabular-nums">
                    Dziennie: B {t.protein.target} g · W {t.carbs.max !== null ? `do ${t.carbs.max}` : t.carbs.target} g · T {t.fat.target} g
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>

        <section aria-labelledby="store-title" className="flex flex-col gap-2 rounded-2xl border border-stone-200 bg-white p-4">
          <h2 id="store-title" className="text-base font-semibold">Sklep</h2>
          <label className="flex flex-col gap-1 text-sm sm:max-w-sm">
            <span className="text-stone-600">Gdy nie znam sklepów w pobliżu, planuj pod:</span>
            <select
              value={draft.preferredStore ?? ''}
              onChange={(e) => set({ preferredStore: e.target.value || null })}
              className="h-9 rounded-lg border border-stone-300 bg-white px-2"
            >
              <option value="">dowolny sklep</option>
              {stores.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-stone-500">Sklepy w pobliżu z zakładki „W pobliżu” mają pierwszeństwo – odczytuję je z tego urządzenia, bez nowego wyszukiwania.</p>
        </section>

        <div className="sticky bottom-0 z-10 -mx-4 flex items-center gap-3 border-t border-stone-200 bg-stone-50/95 px-4 py-3 backdrop-blur">
          <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
            {isNew ? 'Zapisz i zacznij' : 'Zapisz profil'}
          </button>
          {saved && (
            <span role="status" className="inline-flex items-center gap-1 text-sm text-emerald-800">
              <Check className="size-4" aria-hidden /> Zapisano
            </span>
          )}
        </div>
      </form>

      {!isNew && <DataSection />}
    </div>
  )
}
