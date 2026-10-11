import { ChevronLeft, ChevronRight, Dumbbell, Footprints, MapPin, Plus, Scale, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { macroStatus, totals } from '../../diet/day.ts'
import { db, type DayRow } from '../../diet/db.ts'
import { planFood, type Food } from '../../diet/foods.ts'
import { addDays, dayGoal, dayLabel, longDay, mealsLeftAt, remainingOf } from '../../diet/model.ts'
import { plannedDay, plannedKcal, type Plan, type PlannedItem, type PlanItem } from '../../diet/plan.ts'
import { DIET_PROFILES } from '../../diet/profiles.ts'
import { logFood, updateChoices, updateDay } from '../../diet/store.ts'
import { autoDay, seedOf, suggest, swaps, type Context } from '../../diet/suggest.ts'
import type { Profile } from '../../diet/types.ts'
import { useDay, useEntries, type History, type NearbyChains } from '../../hooks/useDiet.ts'
import type { Route } from '../../hooks/useRoute.ts'
import { formatNumber } from '../../lib/format.ts'
import type { Dictionaries, IndexedProduct } from '../../lib/types.ts'
import { formatDistance } from '../../nearby/geo.ts'
import { AutoDayCard } from './AutoDayCard.tsx'
import { FoodPicker } from './FoodPicker.tsx'
import { MacroBars } from './MacroBars.tsx'
import { PlanDayCard } from './PlanDayCard.tsx'
import { SuggestionList } from './SuggestionList.tsx'
import { SwapDialog } from './SwapDialog.tsx'

interface Props {
  profile: Profile
  plan: Plan | null
  date: string
  today: string
  /** The current hour: the day winds down, and after 21:00 a shortfall is real. */
  hour: number
  history: History
  pool: Food[]
  nearby: NearbyChains
  products: IndexedProduct[]
  dict: Dictionaries
  onDate: (date: string | null) => void
  onNavigate: (route: Route) => void
}

/** What a swapped-in food becomes on the plan: its name with the amount when the amount is not obvious. */
function asPlanItem(food: Food): PlanItem {
  return {
    text: food.source === 'product' ? `${food.name} (${food.amountLabel})` : food.name,
    ...food.nutrients,
    stores: food.stores,
  }
}

function numberOrNull(text: string): number | null {
  const n = Number(text.replace(',', '.'))
  return text.trim() && Number.isFinite(n) && n > 0 ? n : null
}

function BodyInputs({ date, day }: { date: string; day: DayRow }) {
  const field = 'h-9 w-24 rounded-lg border border-stone-300 px-2 text-sm tabular-nums'
  return (
    <section aria-label="Pomiary dnia" className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-stone-200 bg-white p-4 text-sm">
      <label className="flex items-center gap-2">
        <Scale className="size-4 text-stone-500" aria-hidden /> Waga (kg)
        <input
          // Keyed on the stored value: a new day, or a value saved elsewhere, refreshes the field.
          key={`w-${date}-${day.weightKg ?? ''}`}
          defaultValue={day.weightKg ?? ''}
          inputMode="decimal"
          aria-label="Waga w kilogramach"
          onBlur={(e) => {
            const value = numberOrNull(e.target.value)
            if (value !== (day.weightKg ?? null)) void updateDay(date, { weightKg: value })
          }}
          className={field}
        />
      </label>
      <label className="flex items-center gap-2">
        <Footprints className="size-4 text-stone-500" aria-hidden /> Kroki
        <input
          key={`s-${date}-${day.steps ?? ''}`}
          defaultValue={day.steps ?? ''}
          inputMode="numeric"
          aria-label="Liczba kroków"
          onBlur={(e) => {
            const value = numberOrNull(e.target.value)
            if (value !== (day.steps ?? null)) void updateDay(date, { steps: value === null ? null : Math.round(value) })
          }}
          className={field}
        />
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={day.training ?? false} onChange={(e) => void updateDay(date, { training: e.target.checked })} className="size-4 accent-emerald-600" />
        <Dumbbell className="size-4 text-stone-500" aria-hidden /> Trening
      </label>
    </section>
  )
}

/** One sentence on where the suggestions shop, and the way to change it. */
function NearbyLine({ nearby, preferred, dict, onNavigate }: { nearby: NearbyChains; preferred: string | null; dict: Dictionaries; onNavigate: (route: Route) => void }) {
  const link = (
    <button type="button" onClick={() => onNavigate('nearby')} className="font-medium text-emerald-700 hover:underline">
      {nearby.source === 'nearby' ? 'Odśwież w „W pobliżu”' : 'Otwórz „W pobliżu”'}
    </button>
  )
  const name = (chain: string) => dict.stores[chain] ?? chain
  return (
    <p className="flex gap-1.5 text-xs text-stone-600">
      <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span>
        {nearby.source === 'nearby' ? (
          <>
            Propozycje biorą pod uwagę sklepy w pobliżu:{' '}
            {nearby.chains
              .slice(0, 5)
              .map((c) => `${name(c.chain)} ${formatDistance(c.nearest.distance)}`)
              .join(' · ')}
            .
          </>
        ) : nearby.source === 'preferred' && preferred ? (
          <>Planuję pod sklep {name(preferred)} – nie znam sklepów wokół Ciebie.</>
        ) : (
          <>Nie znam sklepów wokół Ciebie – propozycje biorą pod uwagę wszystkie sieci.</>
        )}{' '}
        {link}
      </span>
    </p>
  )
}

export function TodayView({ profile, plan, date, today, hour, history, pool, nearby, products, dict, onDate, onNavigate }: Props) {
  const entries = useEntries(date)
  const day = useDay(date)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [swapping, setSwapping] = useState<PlannedItem | null>(null)

  const eaten = useMemo(() => totals(entries ?? []), [entries])
  const goal = dayGoal(profile, history.eaten, date, today)
  const dietProfile = DIET_PROFILES[profile.dietProfile]
  const targets = dietProfile.targets(goal.kcal, profile.targetWeightKg)
  const dayDone = date < today || (date === today && hour >= 21)
  const status = macroStatus(targets, eaten, dayDone)
  const planned = plan ? plannedDay(plan, date, day?.choices) : null

  const base: Omit<Context, 'remaining' | 'mealsLeft'> = {
    targets,
    profile: dietProfile,
    nearby: nearby.chains.length ? nearby.chains.map((c) => c.chain) : profile.preferredStore ? [profile.preferredStore] : [],
    storeName: (chain) => dict.stores[chain] ?? chain,
    distance: (chain) => {
      const c = nearby.chains.find((x) => x.chain === chain)
      return c ? formatDistance(c.nearest.distance) : null
    },
  }
  const ctx: Context = { ...base, remaining: remainingOf(targets, eaten), mealsLeft: date === today ? mealsLeftAt(hour) : date < today ? 1 : 4 }
  const suggestions = suggest(pool, ctx, 8)
  const autoSeed = day?.autoSeed ?? seedOf(date)
  // A few hundred foods scored four times: cheap enough not to memoise.
  const auto = planned ? null : autoDay(pool, base, autoSeed)
  const swapOptions = swapping ? swaps(planFood(swapping), pool, ctx) : []

  if (!entries || !day) return <p className="text-sm text-stone-500">Ładowanie…</p>

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onDate(addDays(date, -1))} aria-label="Poprzedni dzień" className="rounded-lg p-1.5 hover:bg-stone-100">
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <div className="min-w-44 text-center">
            <h1 className="text-lg leading-tight font-semibold first-letter:uppercase">{dayLabel(date, today)}</h1>
            {Math.abs(Date.parse(date) - Date.parse(today)) <= 86_400_000 && <p className="text-xs text-stone-500">{longDay(date)}</p>}
          </div>
          <button type="button" onClick={() => onDate(addDays(date, 1))} aria-label="Następny dzień" className="rounded-lg p-1.5 hover:bg-stone-100">
            <ChevronRight className="size-5" aria-hidden />
          </button>
          {date !== today && (
            <button type="button" onClick={() => onDate(null)} className="ml-1 rounded-lg px-2 py-1 text-sm text-emerald-700 hover:bg-emerald-50">
              Wróć do dziś
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <Plus className="size-4" aria-hidden /> Dodaj zjedzone
        </button>
      </div>

      <MacroBars targets={targets} eaten={eaten} status={status} adjustment={goal.adjustment} plannedKcal={plannedKcal(planned)} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          {planned && plan ? (
            <PlanDayCard plan={plan} planned={planned} date={date} entries={entries} onSwap={setSwapping} />
          ) : (
            <AutoDayCard
              meals={auto ?? []}
              entries={entries}
              hasPlan={plan !== null}
              onLog={(food) => void logFood(date, food)}
              onReroll={() => void updateDay(date, { autoSeed: (autoSeed + 1) >>> 0 })}
            />
          )}

          <section aria-labelledby="eaten-title" className="flex flex-col gap-2 rounded-2xl border border-stone-200 bg-white p-4">
            <h2 id="eaten-title" className="text-base font-semibold">
              Zjedzone <span className="font-normal text-stone-500">· {formatNumber(eaten.kcal, 0)} kcal</span>
            </h2>
            {entries.length === 0 ? (
              <p className="text-sm text-stone-500">Nic jeszcze nie zapisane. Odhacz pozycję planu albo dodaj, co zjadłeś – liczy się to, co naprawdę zjedzone.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-stone-100">
                {entries.map((e) => (
                  <li key={e.id} className="flex items-start gap-2 py-2 text-sm">
                    <span className="w-11 shrink-0 text-xs text-stone-500 tabular-nums">{e.time}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium break-words">{e.name}</p>
                      <p className="text-xs text-stone-500 tabular-nums">
                        {formatNumber(e.kcal, 0)} kcal
                        {e.protein !== null ? ` · B ${formatNumber(e.protein, 0)} · W ${formatNumber(e.carbs ?? 0, 0)} · T ${formatNumber(e.fat ?? 0, 0)}` : ' · makro nieznane'}
                        {e.amountLabel && ` · ${e.amountLabel}`}
                      </p>
                    </div>
                    <button type="button" onClick={() => e.id && void db.entries.delete(e.id)} aria-label={`Usuń: ${e.name}`} className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-red-600">
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-4">
          <section aria-labelledby="next-title" className="flex flex-col gap-2 rounded-2xl border border-stone-200 bg-white p-4">
            <h2 id="next-title" className="text-base font-semibold">Co teraz?</h2>
            <p className="text-xs text-stone-500">
              {ctx.remaining.kcal > 50
                ? `Zostało ${formatNumber(ctx.remaining.kcal, 0)} kcal i ${formatNumber(Math.max(0, ctx.remaining.protein), 0)} g białka na ${ctx.mealsLeft} ${ctx.mealsLeft === 1 ? 'posiłek' : 'posiłki'}. Najlepsze oznaczone gwiazdką.`
                : 'Kalorie na dziś wykorzystane – jeśli jesteś głodny, wybierz coś lekkiego i białkowego.'}{' '}
              Profil: {dietProfile.label}.
            </p>
            <NearbyLine nearby={nearby} preferred={profile.preferredStore} dict={dict} onNavigate={onNavigate} />
            <SuggestionList suggestions={suggestions} actionLabel="Zjadłem" onPick={(food) => void logFood(date, food)} />
          </section>
          <BodyInputs date={date} day={day} />
        </div>
      </div>

      <FoodPicker open={pickerOpen} date={date} pool={pool} products={products} dict={dict} onClose={() => setPickerOpen(false)} />
      <SwapDialog
        item={swapping ? planFood(swapping) : null}
        options={swapOptions}
        onPick={(food) => {
          const index = swapping!.index
          void updateChoices(date, (c) => ({ ...c, swaps: { ...c.swaps, [index]: asPlanItem(food) } }))
        }}
        onClose={() => setSwapping(null)}
      />
    </div>
  )
}
