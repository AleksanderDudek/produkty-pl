import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import App from './App.tsx'
import { MISSING_DATA_MESSAGE } from './hooks/useDataset.ts'
import { DATASET } from './test/fixtures.ts'

function serve(body: string, contentType: string, status = 200) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(body, { status, headers: { 'content-type': contentType } })))
}

async function cardNames(): Promise<string[]> {
  const list = await screen.findByRole('list', { name: (_, el) => el.tagName === 'UL' && el.classList.contains('grid') })
  return within(list).getAllByRole('heading', { level: 3 }).map((h) => h.textContent ?? '')
}

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  serve(JSON.stringify(DATASET), 'application/json')
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('App', () => {
  test('lists every product once the data has loaded', async () => {
    render(<App />)
    expect(await screen.findByText(/Znaleziono/)).toHaveTextContent('Znaleziono 6 produktów')
    expect(await cardNames()).toHaveLength(6)
  })

  test('search narrows the list, ignoring Polish diacritics', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(await screen.findByPlaceholderText(/Szukaj/), 'zolty')
    await waitFor(() => expect(screen.getByText(/Znaleziono/)).toHaveTextContent('Znaleziono 1 produkt'))
    expect(await cardNames()).toEqual(['Żółty ser Gouda'])
    expect(window.location.search).toBe('?q=zolty')
  })

  test('a Nutri-Score chip filters the list and is written to the URL', async () => {
    const user = userEvent.setup()
    render(<App />)
    const filters = await screen.findByRole('complementary')
    await user.click(within(filters).getByTitle('Nutri-Score A'))
    await waitFor(() => expect(screen.getByText(/Znaleziono/)).toHaveTextContent('Znaleziono 2 produktów'))
    expect((await cardNames()).sort()).toEqual(['Skyr naturalny', 'Tofu naturalne'])
    expect(window.location.search).toBe('?ns=a')
    // The chip can be removed from the active-filter list.
    await user.click(screen.getByRole('button', { name: 'Usuń filtr: Nutri-Score A' }))
    await waitFor(() => expect(screen.getByText(/Znaleziono/)).toHaveTextContent('Znaleziono 6 produktów'))
  })

  test('the state in the URL is restored on load', async () => {
    window.history.replaceState(null, '', '/?only=vegan&sort=kcal-asc')
    render(<App />)
    await waitFor(() => expect(screen.getByText(/Znaleziono/)).toHaveTextContent('Znaleziono 3 produktów'))
    expect(await cardNames()).toEqual(['Pepsi', 'Tofu naturalne', 'Musli owocowe'])
  })

  test('the table view shows a table', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Tabela' }))
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(7) // header + 6
  })

  test('a card opens the product detail, and closing it returns to the list', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: /Skyr naturalny/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Skyr naturalny' })
    expect(within(dialog).getByText('Piątnica · 150 g')).toBeInTheDocument()
    expect(within(dialog).getByText('Bez dodatku cukru')).toBeInTheDocument()
    expect(window.location.search).toBe('?p=2')

    await user.click(within(dialog).getByRole('button', { name: 'Zamknij' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Skyr naturalny' })).not.toBeInTheDocument())
    expect(window.location.search).toBe('')
  })

  test('a search typed just before opening a product is not lost', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(await screen.findByRole('searchbox', { name: 'Szukaj produktu' }), 'skyr')
    // No pause: the click lands inside the 250 ms debounce window.
    await user.click(screen.getByRole('button', { name: 'Skyr naturalny' }))
    expect(window.location.search).toBe('?q=skyr&p=2')
    const dialog = await screen.findByRole('dialog', { name: 'Skyr naturalny' })
    await user.click(within(dialog).getByRole('button', { name: 'Zamknij' }))
    await waitFor(() => expect(window.location.search).toBe('?q=skyr'))
    expect(screen.getByRole('searchbox', { name: 'Szukaj produktu' })).toHaveValue('skyr')
  })

  test('closing a product with Back returns focus to its card', async () => {
    const user = userEvent.setup()
    render(<App />)
    const card = await screen.findByRole('button', { name: 'Pepsi' })
    await user.click(card)
    await screen.findByRole('dialog', { name: 'Pepsi' })
    window.history.back()
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Pepsi' })).not.toBeInTheDocument())
    expect(card).toHaveFocus()
  })

  test('cards expose the product name as a heading and as the button name', async () => {
    render(<App />)
    const heading = await screen.findByRole('heading', { level: 3, name: 'Tofu naturalne' })
    expect(within(heading).getByRole('button', { name: 'Tofu naturalne' })).toBeInTheDocument()
  })

  test('explains how to create the data when the file is missing', async () => {
    // The dev server answers a missing file with index.html and a 200.
    serve('<!doctype html><html></html>', 'text/html')
    render(<App />)
    expect(await screen.findByRole('alert')).toHaveTextContent(MISSING_DATA_MESSAGE)
  })
})
