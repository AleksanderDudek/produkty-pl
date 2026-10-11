import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { db } from '../../diet/db.ts'
import { addDays, dayGoal, mondayOf, shortDay } from '../../diet/model.ts'
import { plannedDay, plannedKcal, type Plan } from '../../diet/plan.ts'
import { ACTIVE_PLAN } from '../../diet/store.ts'
import type { Profile } from '../../diet/types.ts'
import type { History } from '../../hooks/useDiet.ts'
import { formatDate, formatNumber } from '../../lib/format.ts'
import { ImportWorkbook } from './ImportWorkbook.tsx'

interface Props {
  profile: Profile
  plan: Plan | null
  date: string
  today: string
  history: History
  onDate: (date: string | null) => void
  onOpenDay: (date: string) => void
}

/** The plan as a week: what each day was meant to be, what it was, and the way into any of them. */
export function PlanView({ profile, plan, date, today, history, onDate, onOpenDay }: Props) {
  if (!plan) {
    return (
      <section className="flex max-w-2xl flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-5">
        <h1 className="text-lg font-semibold">Nie masz jeszcze planu</h1>
        <p className="text-sm text-stone-600">
          Wczytaj swój arkusz z planem: dni wzorcowe z wariantami, potrawy z kaloriami i makro, parametry z panelu. Plik jest czytany w
          przeglądarce i nigdzie nie jest wysyłany.
        </p>
        <p className="text-sm text-stone-600">Bez planu też się da: „Dziś” układa propozycję dnia z tego, co jest w sklepach w pobliżu i w domu.</p>
        <ImportWorkbook />
      </section>
    )
  }

  const monday = mondayOf(date)
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  const end = addDays(plan.startDate, plan.days.length - 1)

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4">
        <div>
          <h1 className="text-lg font-semibold">{plan.name}</h1>
          <p className="text-sm text-stone-600">
            {formatDate(plan.startDate)} – {formatDate(end)} · {plan.days.length} dni · {Object.keys(plan.templates).length} dni wzorcowych · po końcu plan się powtarza
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <ImportWorkbook label="Wczytaj ponownie" />
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Usunąć plan? Zapisy jedzenia i pomiary zostaną.')) void db.plans.delete(ACTIVE_PLAN)
            }}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-stone-600 hover:bg-stone-100"
          >
            <Trash2 className="size-4" aria-hidden /> Usuń plan
          </button>
        </div>
      </section>

      <section aria-labelledby="week-title" className="flex flex-col gap-2 rounded-2xl border border-stone-200 bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 id="week-title" className="text-base font-semibold">
            Tydzień od {formatDate(monday)}
          </h2>
          <div className="flex gap-1">
            <button type="button" onClick={() => onDate(addDays(date, -7))} aria-label="Poprzedni tydzień" className="rounded-lg p-1.5 hover:bg-stone-100">
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <button type="button" onClick={() => onDate(addDays(date, 7))} aria-label="Następny tydzień" className="rounded-lg p-1.5 hover:bg-stone-100">
              <ChevronRight className="size-5" aria-hidden />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-stone-500">
              <tr>
                <th className="py-1 pr-2 font-medium">Dzień</th>
                <th className="py-1 pr-2 font-medium">Wzór</th>
                <th className="py-1 pr-2 text-right font-medium">Plan</th>
                <th className="py-1 pr-2 text-right font-medium">Cel</th>
                <th className="py-1 text-right font-medium">Zjedzone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {week.map((d) => {
                const choices = history.days.get(d)?.choices
                const planned = plannedDay(plan, d, choices)
                const eaten = history.eaten.get(d)
                const goal = dayGoal(profile, history.eaten, d, today).kcal
                const over = eaten !== undefined && eaten > goal * 1.05
                return (
                  <tr key={d} className={d === today ? 'bg-emerald-50/60' : ''}>
                    <td className="py-1.5 pr-2">
                      <button type="button" onClick={() => onOpenDay(d)} className="text-left font-medium text-emerald-800 hover:underline">
                        {shortDay(d)}
                      </button>
                    </td>
                    <td className="py-1.5 pr-2 text-stone-600">{planned ? `${planned.template} · wariant ${planned.variant}` : '–'}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{planned ? formatNumber(plannedKcal(planned) ?? 0, 0) : '–'}</td>
                    <td className="py-1.5 pr-2 text-right text-stone-600 tabular-nums">{d >= today ? formatNumber(goal, 0) : ''}</td>
                    <td className={`py-1.5 text-right tabular-nums ${over ? 'font-semibold text-red-700' : ''}`}>{eaten !== undefined ? formatNumber(eaten, 0) : ''}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-stone-500">Kliknij dzień, żeby go otworzyć: odhaczyć, zamienić pozycje albo wybrać inny wariant.</p>
      </section>

      {plan.notes.length > 0 && (
        <section aria-labelledby="notes-title" className="flex flex-col gap-1 rounded-2xl border border-stone-200 bg-white p-4">
          <h2 id="notes-title" className="text-base font-semibold">Uwagi z planu</h2>
          <ul className="list-disc pl-5 text-sm text-stone-600">
            {plan.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="templates-title" className="flex flex-col gap-2 rounded-2xl border border-stone-200 bg-white p-4">
        <h2 id="templates-title" className="text-base font-semibold">Dni wzorcowe i warianty</h2>
        {Object.entries(plan.templates).map(([key, variants]) => (
          <details key={key} className="rounded-lg border border-stone-100 px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium">
              {key} · {variants.length} {variants.length === 1 ? 'wariant' : 'wariantów'} ·{' '}
              {formatNumber(Math.min(...variants.map((v) => v.totals.kcal)), 0)}–{formatNumber(Math.max(...variants.map((v) => v.totals.kcal)), 0)} kcal
            </summary>
            <ol className="mt-2 flex flex-col gap-2">
              {variants.map((v) => (
                <li key={v.index} className="text-sm">
                  <p className="font-medium">
                    Wariant {v.index}{' '}
                    <span className="font-normal text-stone-500 tabular-nums">
                      · {formatNumber(v.totals.kcal, 0)} kcal · B {formatNumber(v.totals.protein ?? 0, 0)} · W {formatNumber(v.totals.carbs ?? 0, 0)} · T{' '}
                      {formatNumber(v.totals.fat ?? 0, 0)}
                    </span>
                  </p>
                  <p className="text-xs text-stone-600">{v.items.map((i) => i.text).join(' · ')}</p>
                </li>
              ))}
            </ol>
          </details>
        ))}
      </section>
    </div>
  )
}
