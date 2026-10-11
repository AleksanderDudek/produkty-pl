import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import App from '../../App.tsx'
import { db } from '../../diet/db.ts'
import type { Plan } from '../../diet/plan.ts'
import { clearAll, completeProfile, logQuick, saveProfile } from '../../diet/store.ts'
import { DATASET } from '../../test/fixtures.ts'

// A Wednesday: Monday and Tuesday of the same week are already over.
const WEDNESDAY = new Date('2026-10-14T12:00:00')

// The tab is loaded on demand, and the database answers asynchronously: under a
// full parallel test run the first render can take longer than the default 1 s.
const slow = { timeout: 5000 }

const item = (text: string, kcal: number, protein: number, carbs: number, fat: number) => ({ text, kcal, protein, carbs, fat, stores: [] })
const TERIYAKI = item('½ opak. Teriyaki', 640, 41, 43, 31)
const BURRITO = item('½ opak. Burrito', 600, 50, 13, 27)
const MASLO = item('Masło 10 g', 54, 0.1, 0.1, 6)

const PLAN: Plan = {
  id: 'active',
  name: 'Plan testowy',
  startDate: '2026-10-12',
  days: ['1A'],
  templates: { '1A': [{ index: 1, items: [TERIYAKI, MASLO], totals: { kcal: 694, protein: 41.1, carbs: 43.1, fat: 37 } }] },
  foods: [TERIYAKI, BURRITO, MASLO],
  notes: [],
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(WEDNESDAY)
  await clearAll()
  window.localStorage.clear()
  window.history.replaceState(null, '', '/dieta')
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(DATASET), { headers: { 'content-type': 'application/json' } })))
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('Dieta', () => {
  test('a first visit asks for the profile, then opens the day', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Zacznij od profilu' }, slow)).toBeInTheDocument()
    // The numbers the form shows are computed live from what is typed.
    expect(screen.getByText('Podstawowe spalanie (BMR)')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Zapisz i zacznij' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Dziś' }, slow)).toBeInTheDocument()
    expect(await db.profile.get('me')).toMatchObject({ dailyKcal: 2000, dietProfile: 'redukcja' })
    // No plan: the day is proposed from what can be had.
    expect(screen.getByRole('heading', { name: 'Propozycja dnia' })).toBeInTheDocument()
  })

  test('a mistyped number stops the save and says what is expected', async () => {
    const user = userEvent.setup()
    render(<App />)
    const age = await screen.findByLabelText('Wiek', {}, slow)
    await user.clear(age)
    await user.type(age, '3x')
    expect(screen.getByText('Wpisz liczbę od 14 do 100.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Zapisz i zacznij' }))
    expect(age).toHaveFocus()
    expect(await db.profile.get('me')).toBeUndefined()
  })

  test('calories alone can be logged, and the day says the macros are incomplete', async () => {
    await saveProfile(completeProfile({ startDate: '2026-10-01', adaptWeekly: false }))
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Dodaj zjedzone' }, slow))
    const dialog = screen.getByRole('dialog', { name: 'Dodaj zjedzone' })
    await user.click(within(dialog).getByRole('button', { name: 'Tylko kalorie' }))
    await user.type(within(dialog).getByLabelText('Co to było'), 'Obiad u rodziców')
    await user.type(within(dialog).getByLabelText('Kalorie (kcal)'), '650')
    await user.click(within(dialog).getByRole('button', { name: 'Dodaj' }))

    expect(await screen.findByText('Obiad u rodziców', {}, slow)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Zjedzone/ })).toHaveTextContent('650 kcal')
    expect(screen.getByText(/1 wpis ma tylko kalorie/)).toBeInTheDocument()
  })

  test("a plan line is swapped for one of about the same calories, then ticked off", async () => {
    await saveProfile(completeProfile({ startDate: '2026-10-12', adaptWeekly: false }))
    await db.plans.put(PLAN)
    const user = userEvent.setup()
    render(<App />)
    const card = (await screen.findByRole('heading', { name: /Plan na ten dzień/ }, slow)).closest('section')!
    await user.click(within(card).getAllByRole('button', { name: /Zamień/ })[0])

    const dialog = screen.getByRole('dialog', { name: /Zamień: ½ opak. Teriyaki/ })
    await user.click(within(dialog).getByRole('button', { name: 'Wybierz: ½ opak. Burrito' }))

    await waitFor(() => expect(within(card).getByText('½ opak. Burrito')).toBeInTheDocument(), slow)
    expect(within(card).getByText(/zamiast: ½ opak. Teriyaki/)).toBeInTheDocument()
    await user.click(within(card).getAllByRole('button', { name: /Zjadłem/ })[0])
    await waitFor(async () => expect(await db.entries.toArray()).toMatchObject([{ name: '½ opak. Burrito', kcal: 600, planIndex: 0 }]), slow)
  })

  test('a surplus earlier in the week lowers today, and says why', async () => {
    await saveProfile(completeProfile({ startDate: '2026-10-01', dailyKcal: 2000, adaptWeekly: true }))
    await logQuick('2026-10-12', 'Wesele', 2600)
    render(<App />)
    // 600 over, spread over the five days left to Sunday.
    expect(await screen.findByText(/Cel na dziś obniżony o 120 kcal/, {}, slow)).toBeInTheDocument()
  })
})
