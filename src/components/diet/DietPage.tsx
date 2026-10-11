import { CalendarDays, TrendingDown, UserRound, Utensils } from 'lucide-react'
import { useMemo } from 'react'
import { addDays, mondayOf, weightOn } from '../../diet/model.ts'
import { buildPool } from '../../diet/pool.ts'
import { completeProfile } from '../../diet/store.ts'
import { dietFromParams, dietToParams, DIET_VIEWS, VIEW_LABELS, type DietView } from '../../diet/url.ts'
import { useClock, useCustomFoods, useHistory, useNearbyChains, usePlan, useProfile } from '../../hooks/useDiet.ts'
import type { Route } from '../../hooks/useRoute.ts'
import { useUrlState } from '../../hooks/useUrlState.ts'
import type { Dataset, IndexedProduct } from '../../lib/types.ts'
import { chainsWithFood } from '../../recipes/chains.ts'
import { recipeIndex } from '../../recipes/resolve.ts'
import { AppHeader } from '../AppHeader.tsx'
import { Footer } from '../Footer.tsx'
import { PlanView } from './PlanView.tsx'
import { ProfileView } from './ProfileView.tsx'
import { ProgressView } from './ProgressView.tsx'
import { TodayView } from './TodayView.tsx'

interface Props {
  dataset: Dataset
  products: IndexedProduct[]
  onNavigate: (route: Route) => void
}

const ICONS: Record<DietView, typeof Utensils> = { dzis: Utensils, plan: CalendarDays, postep: TrendingDown, profil: UserRound }

/**
 * The diet tab: a profile, a log of what was really eaten, and a day that
 * bends - the plan when there is one, swaps of about the same calories,
 * suggestions from what the shops nearby sell. All of it on this device.
 */
export function DietPage({ dataset, products, onNavigate }: Props) {
  const [state, update] = useUrlState(dietFromParams, dietToParams)
  const profile = useProfile()
  const plan = usePlan()
  const custom = useCustomFoods()
  const clock = useClock()
  const today = clock.date
  const date = state.date ?? today
  const dict = dataset.dictionaries

  const { candidates, ranking } = recipeIndex(products)
  const knownChains = chainsWithFood(products)
  const preferred = profile?.preferredStore ?? null
  const nearby = useNearbyChains(knownChains, preferred, clock.ms)
  // Enough history for every view: the profile's start (progress), the last
  // two weeks, and the week being looked at (its correction and its table).
  const from = profile ? [profile.startDate, addDays(today, -14), mondayOf(date)].sort()[0] : null
  const history = useHistory(from)

  const chains = useMemo(() => (nearby.chains.length ? nearby.chains.map((c) => c.chain) : preferred ? [preferred] : []), [nearby, preferred])
  const pool = useMemo(
    () => buildPool({ products, dict, candidates, chains, fallbackRanking: ranking, plan: plan ?? null, custom: custom ?? [] }),
    [products, dict, candidates, chains, ranking, plan, custom],
  )
  const stores = useMemo(() => ranking.map((key) => ({ key, name: dict.stores[key] ?? key })), [ranking, dict])
  // Stable: the profile form resets itself when its profile changes identity.
  const blank = useMemo(() => completeProfile({}), [])

  const loading = profile === undefined || plan === undefined || (profile !== null && history === undefined)
  const setDate = (next: string | null) => update({ date: next === today ? null : next })

  return (
    <div className="flex min-h-screen flex-col bg-stone-50 text-stone-900">
      <AppHeader route="diet" onNavigate={onNavigate}>
        {profile && (
          <nav aria-label="Widoki diety" className="flex flex-wrap gap-1">
            {DIET_VIEWS.map((view) => {
              const Icon = ICONS[view]
              return (
                <button
                  key={view}
                  type="button"
                  onClick={() => update({ view })}
                  aria-current={state.view === view ? 'page' : undefined}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm ${
                    state.view === view ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <Icon className="size-4" aria-hidden /> {VIEW_LABELS[view]}
                </button>
              )
            })}
          </nav>
        )}
      </AppHeader>

      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-4 px-4 py-4">
        {loading ? (
          <p className="text-sm text-stone-500">Ładowanie…</p>
        ) : !profile ? (
          <ProfileView profile={blank} isNew currentWeight={blank.startWeightKg} stores={stores} />
        ) : state.view === 'plan' ? (
          <PlanView profile={profile} plan={plan ?? null} date={date} today={today} history={history!} onDate={setDate} onOpenDay={(d) => update({ view: 'dzis', date: d === today ? null : d })} />
        ) : state.view === 'postep' ? (
          <ProgressView profile={profile} plan={plan ?? null} today={today} history={history!} />
        ) : state.view === 'profil' ? (
          <ProfileView profile={profile} isNew={false} currentWeight={weightOn(history!.days.values(), today, profile.startWeightKg)} stores={stores} />
        ) : (
          <TodayView
            profile={profile}
            plan={plan ?? null}
            date={date}
            today={today}
            hour={clock.hour}
            history={history!}
            pool={pool}
            nearby={nearby}
            products={products}
            dict={dict}
            onDate={setDate}
            onNavigate={onNavigate}
          />
        )}
      </main>

      <Footer dataset={dataset} />
    </div>
  )
}
