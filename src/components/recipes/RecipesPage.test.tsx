import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import App from '../../App.tsx'
import type { Dataset, Nutrition } from '../../lib/types.ts'
import { DATASET, makeProduct } from '../../test/fixtures.ts'

function n(kcal: number, protein: number, carbs: number, fat: number, sugars: number): Nutrition {
  return { kcal, protein, carbs, fat, sugars, saturatedFat: null, fiber: null, salt: null }
}

// Two protein yogurts at Biedronka: the default one keeps the rule, the other
// breaks it once blueberries are added (16 g protein against 18 g carbs).
const YOGURT_OK = makeProduct({
  code: 'yog-ok', name: 'Jogurt proteinowy naturalny', categories: ['en:dairies'],
  nutrition: n(64, 10, 4, 0.3, 4), stores: ['biedronka'], popularity: 10,
})
const YOGURT_WEAK = makeProduct({
  code: 'yog-weak', name: 'Jogurt proteinowy waniliowy', categories: ['en:dairies'],
  nutrition: n(70, 8, 6, 0.5, 6), stores: ['biedronka'], popularity: 1,
})
const DATA: Dataset = { ...DATASET, products: [...DATASET.products, YOGURT_OK, YOGURT_WEAK] }

function cardFor(name: string): HTMLElement {
  return screen.getByRole('heading', { level: 2, name }).closest('article')!
}

beforeEach(() => {
  window.history.replaceState(null, '', '/przepisy')
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(DATA), { headers: { 'content-type': 'application/json' } })))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Przepisy', () => {
  test('the recipes tab lists recipes with their protein', async () => {
    render(<App />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Przepisy białkowe' })).toBeInTheDocument()
    const card = cardFor('Skyr z białkiem i malinami')
    expect(within(card).getByText(/białka$/)).toBeInTheDocument()
    expect(within(card).getByText(/Białko .* > węglowodany/)).toBeInTheDocument()
  })

  test('the tabs move between products and recipes', async () => {
    window.history.replaceState(null, '', '/')
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('link', { name: 'Przepisy białkowe' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Przepisy białkowe' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/przepisy')
    await user.click(screen.getByRole('link', { name: 'Produkty' }))
    expect(await screen.findByText(/Znaleziono/)).toBeInTheDocument()
  })

  test('each tab comes back with the state it was left in', async () => {
    window.history.replaceState(null, '', '/?ns=a')
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('link', { name: 'Przepisy białkowe' }))
    await user.click(within(await screen.findByRole('group', { name: 'Rodzaj' })).getByRole('button', { name: 'Shake' }))
    await user.click(screen.getByRole('link', { name: 'Produkty' }))
    await waitFor(() => expect(window.location.search).toBe('?ns=a'))
    await user.click(screen.getByRole('link', { name: 'Przepisy białkowe' }))
    await waitFor(() => expect(window.location.search).toBe('?typ=shake'))
  })

  test('the swap list is the product itself, so arrow keys step through it in order', async () => {
    window.history.replaceState(null, '', '/przepisy?sklep=biedronka')
    render(<App />)
    await screen.findByRole('heading', { level: 1, name: 'Przepisy białkowe' })
    const select = within(cardFor('Jogurt proteinowy z borówkami')).getByRole('combobox', { name: /Produkt: / })
    expect(select).toHaveValue('yog-ok')
    expect([...(select as HTMLSelectElement).options].map((o) => o.value)).toEqual(['yog-ok', 'yog-weak'])
  })

  test('a store chip keeps only what can be bought there, and says so', async () => {
    const user = userEvent.setup()
    render(<App />)
    const stores = await screen.findByRole('group', { name: 'Sklep' })
    await user.click(within(stores).getByRole('button', { name: /Biedronka/ }))
    expect(window.location.search).toBe('?sklep=biedronka')
    const card = cardFor('Jogurt proteinowy z borówkami')
    expect(within(card).getByText('Wszystko kupisz w: Biedronka')).toBeInTheDocument()
  })

  test('swapping to a product that breaks the rule is allowed but flagged', async () => {
    window.history.replaceState(null, '', '/przepisy?sklep=biedronka')
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { level: 1, name: 'Przepisy białkowe' })
    const card = cardFor('Jogurt proteinowy z borówkami')
    expect(within(card).queryByRole('alert')).not.toBeInTheDocument()
    await user.selectOptions(within(card).getByRole('combobox', { name: /Produkt: / }), 'yog-weak')
    expect(within(card).getByRole('alert')).toHaveTextContent('zasada nie jest spełniona')
    expect(within(card).getByRole('combobox', { name: /Produkt: / })).toHaveValue('yog-weak')
  })

  test('an ingredient opens the product detail', async () => {
    window.history.replaceState(null, '', '/przepisy?sklep=biedronka')
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { level: 1, name: 'Przepisy białkowe' })
    await user.click(within(cardFor('Jogurt proteinowy z borówkami')).getByRole('button', { name: 'Szczegóły: Jogurt proteinowy naturalny' }))
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Jogurt proteinowy naturalny' })).toBeInTheDocument())
    expect(window.location.search).toBe('?sklep=biedronka&p=yog-ok')
  })

  test('every card says how long it takes; the quick ones are marked', async () => {
    render(<App />)
    await screen.findByRole('heading', { level: 1, name: 'Przepisy białkowe' })
    expect(within(cardFor('Białko z wodą')).getByText('Szybkie')).toBeInTheDocument()
    expect(within(cardFor('Kurczak z patelni z papryką i cukinią')).getByText('Chwilę dłużej')).toBeInTheDocument()
    const chili = cardFor('Chili z indyka')
    expect(within(chili).getByText('Dłużej, w domu')).toBeInTheDocument()
    // Grams are for the whole pot; the macros are for one plate, and the card says so.
    expect(within(chili).getByText('na porcję (przepis na 3 porcje)')).toBeInTheDocument()
    expect(within(cardFor('Białko z wodą')).queryByText(/na porcję/)).not.toBeInTheDocument()
  })

  test('quick recipes come first, then by time', async () => {
    render(<App />)
    const list = await screen.findByRole('region', { name: 'Przepisy białkowe' })
    const minutes = within(list)
      .getAllByRole('article')
      .map((card) => Number.parseInt(within(card).getByText(/^\d+ min$/).textContent!, 10))
    expect(minutes.length).toBeGreaterThan(10)
    expect(minutes).toEqual([...minutes].sort((a, b) => a - b))
    expect(minutes[0]).toBeLessThanOrEqual(7)
  })

  test('a time chip keeps only that tier, keeps it in the link, and works with the kind', async () => {
    const user = userEvent.setup()
    render(<App />)
    const time = await screen.findByRole('group', { name: 'Czas' })
    await user.click(within(time).getByRole('button', { name: 'Dłużej, w domu' }))
    expect(window.location.search).toBe('?czas=dluzej')
    expect(screen.getByRole('heading', { level: 2, name: 'Chili z indyka' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: 'Białko z wodą' })).not.toBeInTheDocument()

    await user.click(within(screen.getByRole('group', { name: 'Rodzaj' })).getByRole('button', { name: 'Shake' }))
    expect(window.location.search).toBe('?typ=shake&czas=dluzej')
    expect(screen.getByText('Brak przepisów z tymi filtrami w tym sklepie.')).toBeInTheDocument()

    await user.click(within(time).getByRole('button', { name: 'Szybkie' }))
    expect(window.location.search).toBe('?typ=shake&czas=szybkie')
    expect(screen.getByRole('heading', { level: 2, name: 'Shake truskawkowy ze skyrem' })).toBeInTheDocument()

    await user.click(within(time).getByRole('button', { name: 'Wszystkie' }))
    expect(window.location.search).toBe('?typ=shake')
  })

  test('a time tier in the link is applied on load', async () => {
    window.history.replaceState(null, '', '/przepisy?czas=chwila')
    render(<App />)
    await screen.findByRole('heading', { level: 1, name: 'Przepisy białkowe' })
    expect(within(screen.getByRole('group', { name: 'Czas' })).getByRole('button', { name: 'Chwilę dłużej' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('heading', { level: 2, name: 'Kurczak z patelni z papryką i cukinią' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: 'Chili z indyka' })).not.toBeInTheDocument()
  })
})
