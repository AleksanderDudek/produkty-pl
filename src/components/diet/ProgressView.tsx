import { useMemo } from 'react'
import { macroStatus, totals, type DayTotals } from '../../diet/day.ts'
import { dayReaching, forecast } from '../../diet/energy.ts'
import { addDays, dayGoal, forecastInputs, lastWeighing, projectFromWeighing, shortDay } from '../../diet/model.ts'
import type { Plan } from '../../diet/plan.ts'
import { DIET_PROFILES } from '../../diet/profiles.ts'
import type { Profile } from '../../diet/types.ts'
import type { History } from '../../hooks/useDiet.ts'
import { formatDate, formatNumber } from '../../lib/format.ts'
import { WeightChart, type ChartPoint } from './WeightChart.tsx'

interface Props {
  profile: Profile
  plan: Plan | null
  today: string
  history: History
}

/** Two years is the longest a forecast is drawn: past that the model says nothing useful. */
const HORIZON = 730

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex flex-col rounded-xl border border-stone-200 bg-white px-3 py-2">
      <span className="text-xs text-stone-500">{label}</span>
      <span className="text-lg font-semibold tabular-nums">{value}</span>
      {note && <span className="text-xs text-stone-500">{note}</span>}
    </div>
  )
}

const kg = (n: number) => `${formatNumber(n, 1)} kg`

export function ProgressView({ profile, plan, today, history }: Props) {
  const model = useMemo(() => {
    const inputs = forecastInputs(profile, plan, history, today, HORIZON)
    const series = forecast(profile, inputs)
    const weighing = lastWeighing(history.days.values())
    const projection = projectFromWeighing(profile, inputs, weighing)
    const projected = [...projection].map(([date, w]) => ({ date, plan: w, real: w }))
    return {
      series,
      weighing,
      projection,
      planReach: dayReaching(profile.targetWeightKg, series, 'plan'),
      projectedReach: dayReaching(profile.targetWeightKg, projected, 'real'),
    }
  }, [profile, plan, history, today])

  const measured = [...history.days.values()]
    .filter((d) => d.weightKg != null)
    .map((d) => ({ date: d.date, kg: d.weightKg! }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Draw to the goal (and a little past it), at least a month ahead of today.
  const reach = [model.planReach, model.projectedReach].filter((d): d is string => d !== null).sort().at(-1)
  const chartEnd = [addDays(today, 30), reach ? addDays(reach, 7) : addDays(today, 90)].sort().at(-1)!
  const points: ChartPoint[] = model.series
    .filter((p) => p.date <= chartEnd)
    .map((p) => ({ date: p.date, plan: p.plan, projection: model.projection.get(p.date) ?? null }))

  const current = model.weighing?.kg ?? profile.startWeightKg
  const lost = profile.startWeightKg - current
  const toGo = current - profile.targetWeightKg
  const modelToday = model.series.find((p) => p.date === today)?.real

  // The last two weeks against each day's own goal.
  const fortnight = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13)).map((date) => ({
    date,
    eaten: history.eaten.get(date) ?? null,
    goal: dayGoal(profile, history.eaten, date, today).kcal,
  }))
  const maxKcal = Math.max(...fortnight.map((d) => Math.max(d.eaten ?? 0, d.goal))) * 1.1

  // A week of macros: the average of the days that were logged, not of seven.
  // Calories count every logged day; macros only days where every entry has
  // them - a dinner logged as "650 kcal" is not 0 g of protein.
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 7)).filter((d) => history.eaten.has(d))
  const byDate = new Map<string, DayTotals>()
  for (const date of week) byDate.set(date, totals(history.entries.filter((e) => e.date === date)))
  const complete = week.filter((d) => byDate.get(d)!.unknownMacros === 0)
  const mean = (days: string[], pick: (t: DayTotals) => number) => Math.round(days.reduce((sum, d) => sum + pick(byDate.get(d)!), 0) / days.length)
  const average: DayTotals | null = week.length
    ? {
        kcal: mean(week, (t) => t.kcal),
        protein: complete.length ? mean(complete, (t) => t.protein) : 0,
        carbs: complete.length ? mean(complete, (t) => t.carbs) : 0,
        fat: complete.length ? mean(complete, (t) => t.fat) : 0,
        unknownMacros: week.length - complete.length,
      }
    : null
  const targets = DIET_PROFILES[profile.dietProfile].targets(profile.dailyKcal, profile.targetWeightKg)
  const weekStatus = average ? macroStatus(targets, average, true) : null

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Postęp</h1>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Start" value={kg(profile.startWeightKg)} note={formatDate(profile.startDate)} />
        <Stat label="Teraz" value={kg(current)} note={model.weighing ? `ważenie ${shortDay(model.weighing.date)}` : 'brak ważenia'} />
        <Stat label={lost >= 0 ? 'Mniej o' : 'Więcej o'} value={kg(Math.abs(lost))} />
        <Stat label="Do celu" value={toGo > 0 ? kg(toGo) : 'cel osiągnięty'} note={`cel ${kg(profile.targetWeightKg)}`} />
      </div>

      <section aria-labelledby="chart-title" className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4">
        <h2 id="chart-title" className="text-base font-semibold">Waga</h2>
        <WeightChart start={profile.startDate} today={today} points={points} measured={measured} target={profile.targetWeightKg} />
        <ul className="flex flex-col gap-1 text-sm text-stone-700">
          <li>Według planu cel {model.planReach ? <strong>{formatDate(model.planReach)}</strong> : 'nie zostanie osiągnięty w ciągu dwóch lat'}.</li>
          {model.weighing && (
            <li>
              Od ostatniego ważenia, jedząc według planu:{' '}
              {model.projectedReach ? <strong>{formatDate(model.projectedReach)}</strong> : 'cel poza zasięgiem dwóch lat – sprawdź cel kalorii w profilu'}.
            </li>
          )}
          {modelToday !== undefined && model.weighing && (
            <li className="text-xs text-stone-500">
              Z zapisów jedzenia wynikałoby dziś {kg(modelToday)}; waga pokazuje {kg(current)}. Woda i jelita potrafią przesunąć wynik o 1–2 kg – patrz na trend, nie na
              jeden dzień.
            </li>
          )}
        </ul>
      </section>

      <section aria-labelledby="kcal-title" className="flex flex-col gap-2 rounded-2xl border border-stone-200 bg-white p-4">
        <h2 id="kcal-title" className="text-base font-semibold">Kalorie – ostatnie 14 dni</h2>
        <ol className="flex h-40 items-end gap-1" aria-label="Zjedzone kalorie dzień po dniu">
          {fortnight.map((d) => {
            const over = d.eaten !== null && d.eaten > d.goal * 1.05
            return (
              <li key={d.date} className="relative flex h-full flex-1 flex-col justify-end" title={`${shortDay(d.date)}: ${d.eaten === null ? 'brak zapisów' : `${d.eaten} kcal`} / cel ${d.goal}`}>
                <div className="absolute inset-x-0 border-t border-dashed border-stone-400" style={{ bottom: `${(d.goal / maxKcal) * 100}%` }} aria-hidden />
                {d.eaten !== null ? (
                  <div className={`rounded-t ${over ? 'bg-red-400' : 'bg-emerald-500'}`} style={{ height: `${(d.eaten / maxKcal) * 100}%` }} />
                ) : (
                  <div className="h-1 rounded bg-stone-200" />
                )}
                <span className="sr-only">
                  {shortDay(d.date)}: {d.eaten === null ? 'brak zapisów' : `${d.eaten} kcal`}, cel {d.goal}
                </span>
              </li>
            )
          })}
        </ol>
        <div className="flex justify-between text-xs text-stone-500">
          <span>{shortDay(fortnight[0].date)}</span>
          <span>linia przerywana: cel dnia · czerwony: ponad cel</span>
          <span>{shortDay(today)}</span>
        </div>
      </section>

      <section aria-labelledby="macro-title" className="flex flex-col gap-2 rounded-2xl border border-stone-200 bg-white p-4">
        <h2 id="macro-title" className="text-base font-semibold">Makroskładniki – średnia z ostatniego tygodnia</h2>
        {average && weekStatus ? (
          <>
            <p className="text-xs text-stone-500">
              Kalorie z {week.length} {week.length === 1 ? 'dnia' : 'dni'} z zapisami, makroskładniki z {complete.length}{' '}
              {complete.length === 1 ? 'dnia' : 'dni'} z pełnymi danymi – wobec celów profilu „{DIET_PROFILES[profile.dietProfile].label}”.
            </p>
            <dl className="grid gap-2 sm:grid-cols-4">
              {(
                [
                  ['kcal', 'Kalorie', `${average.kcal} / ${targets.kcal}`],
                  ['protein', 'Białko', `${average.protein} / ${targets.protein.target} g`],
                  ['carbs', 'Węglowodany', `${average.carbs} / ${targets.carbs.max ?? targets.carbs.target} g`],
                  ['fat', 'Tłuszcz', `${average.fat} / ${targets.fat.target} g`],
                ] as const
              ).map(([key, label, value]) =>
                key !== 'kcal' && complete.length === 0 ? (
                  <div key={key} className="rounded-xl bg-stone-50 px-3 py-2">
                    <dt className="text-xs text-stone-500">{label}</dt>
                    <dd className="text-sm text-stone-500">brak danych – wpisy mają tylko kalorie</dd>
                  </div>
                ) : (
                <div key={key} className="rounded-xl bg-stone-50 px-3 py-2">
                  <dt className="text-xs text-stone-500">{label}</dt>
                  <dd className="font-semibold tabular-nums">{value}</dd>
                  <dd
                    className={`text-xs ${weekStatus[key].status === 'brak' ? 'text-amber-800' : weekStatus[key].status === 'nadmiar' ? 'text-red-700' : 'text-emerald-800'}`}
                  >
                    {weekStatus[key].status === 'brak' ? 'za mało' : weekStatus[key].status === 'nadmiar' ? 'za dużo' : 'w normie'}
                    {key !== 'kcal' && weekStatus[key].status !== 'ok' && ` – ${weekStatus[key].note}`}
                  </dd>
                </div>
                ),
              )}
            </dl>
          </>
        ) : (
          <p className="text-sm text-stone-500">Brak zapisów z ostatniego tygodnia.</p>
        )}
      </section>
    </div>
  )
}
