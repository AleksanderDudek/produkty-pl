import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import App from '../../App.tsx'
import { DATASET } from '../../test/fixtures.ts'
import type { LatLon, PlacedShop } from '../../nearby/types.ts'

// Leaflet needs a real layout engine; the map is replaced by a stand-in that
// lists what it was given and can "click" a place.
vi.mock('./StoreMap.tsx', () => ({
  StoreMap: (props: { shops: PlacedShop[]; onPick: (p: LatLon) => void }) => (
    <div data-testid="map">
      <span>{props.shops.map((s) => s.chain).join(',')}</span>
      <button type="button" onClick={() => props.onPick({ lat: 52.2297, lon: 21.0122 })}>kliknij mapę</button>
      <button type="button" onClick={() => props.onPick({ lat: 52.2797, lon: 21.0122 })}>kliknij daleko</button>
    </div>
  ),
}))

const HERE = { lat: 52.2297, lon: 21.0122 }
const OVERPASS = {
  version: 0.6,
  elements: [
    { type: 'node', id: 1, lat: HERE.lat + 0.0027, lon: HERE.lon, tags: { shop: 'supermarket', brand: 'Biedronka', name: 'Biedronka', 'addr:street': 'Marszałkowska', 'addr:housenumber': '10' } },
    { type: 'node', id: 2, lat: HERE.lat + 0.0072, lon: HERE.lon, tags: { shop: 'supermarket', brand: 'Lidl', name: 'Lidl' } },
    { type: 'node', id: 3, lat: HERE.lat + 0.0009, lon: HERE.lon, tags: { shop: 'convenience', name: 'Sklep u Ani' } },
  ],
}

let overpassCalls = 0
let overpassFails = false
let overpassBodies: string[] = []
/** When set, Overpass answers only once this promise resolves (a slow 10 km query). */
let overpassGate: Promise<void> | null = null

function json(body: unknown) {
  return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } })
}

function grantLocation(granted: boolean) {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: (ok: PositionCallback, fail: PositionErrorCallback) =>
        granted
          ? ok({ coords: { latitude: HERE.lat, longitude: HERE.lon } } as GeolocationPosition)
          : fail({ code: 1, PERMISSION_DENIED: 1 } as GeolocationPositionError),
    },
  })
}

beforeEach(() => {
  window.localStorage.clear()
  window.history.replaceState(null, '', '/w-poblizu')
  overpassCalls = 0
  overpassFails = false
  overpassBodies = []
  overpassGate = null
  grantLocation(true)
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (String(url).includes('/data/')) return json(DATASET)
    overpassCalls++
    overpassBodies.push(String(init?.body))
    if (overpassGate) await overpassGate
    return overpassFails ? new Response('<html>busy</html>', { status: 504 }) : json(OVERPASS)
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function cardFor(name: string): HTMLElement {
  return screen.getByRole('heading', { level: 2, name }).closest('article')!
}

describe('W pobliżu', () => {
  test('finds the shops around you and lists recipes with the nearest shop that has everything', async () => {
    render(<App />)
    expect(await screen.findByText(/W promieniu 1 km: 2 sklepy z danymi o produktach i 1 inny\./)).toBeInTheDocument()
    expect(within(cardFor('Skyr z białkiem i malinami')).getByText('Wszystko kupisz w: Biedronka · 300 m · Marszałkowska 10')).toBeInTheDocument()
    expect(within(cardFor('Białko z wodą')).getByText('Składniki są w każdym sklepie')).toBeInTheDocument()
    expect(screen.getByTestId('map')).toHaveTextContent('biedronka,lidl')
  })

  test('a smaller radius drops the farther shop without asking the server again', async () => {
    render(<App />)
    await screen.findByText(/2 sklepy z danymi/)
    fireEvent.change(screen.getByRole('slider'), { target: { value: '0' } })
    expect(await screen.findByText(/W promieniu 500 m: 1 sklep z danymi/)).toBeInTheDocument()
    expect(screen.getByTestId('map')).toHaveTextContent(/^biedronkakliknij/)
    expect(overpassCalls).toBe(1)
    expect(window.location.search).toBe('?r=500')
  })

  test('with location refused, a click on the map sets the place', async () => {
    grantLocation(false)
    const user = userEvent.setup()
    render(<App />)
    expect(await screen.findByText(/Brak zgody na lokalizację/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'kliknij mapę' }))
    expect(await screen.findByText(/2 sklepy z danymi/)).toBeInTheDocument()
  })

  test('a busy map server says so and offers to try again', async () => {
    overpassFails = true
    const user = userEvent.setup()
    render(<App />)
    expect(await screen.findByText(/przeciążony/, {}, { timeout: 4000 })).toBeInTheDocument()
    overpassFails = false
    await user.click(screen.getByRole('button', { name: /Spróbuj ponownie/ }))
    expect(await screen.findByText(/2 sklepy z danymi/, {}, { timeout: 4000 })).toBeInTheDocument()
  }, 15_000)

  test('a chain chip narrows the recipes to that chain', async () => {
    const user = userEvent.setup()
    render(<App />)
    const chips = await screen.findByRole('group', { name: 'Sieci w pobliżu' })
    await user.click(within(chips).getByRole('button', { name: /Lidl/ }))
    expect(window.location.search).toBe('?sklep=lidl')
    await waitFor(() => expect(within(cardFor('Skyr z białkiem i malinami')).getByText(/Wszystko kupisz w: Lidl · 800 m/)).toBeInTheDocument())
  })

  test('the position never appears in the URL', async () => {
    render(<App />)
    await screen.findByText(/2 sklepy z danymi/)
    expect(window.location.href).not.toMatch(/52\.2|21\.0/)
  })

  test('the request carries the position rounded to about 100 m, never the exact one', async () => {
    render(<App />)
    await screen.findByText(/2 sklepy z danymi/)
    const query = new URLSearchParams(overpassBodies[0]).get('data')!
    expect(query).toContain('around:1250,52.23,21.012')
    expect(query).not.toContain('52.2297')
  })

  test('a saved place is labelled as saved until a fresh position arrives', async () => {
    window.localStorage.setItem('produkty-pl:position', JSON.stringify(HERE))
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: () => {} } })
    render(<App />)
    expect(await screen.findByText(/Pokazuję ostatnio zapisane miejsce, szukam aktualnej lokalizacji/)).toBeInTheDocument()
  })

  test('after a move, shops from the old place are not shown if the new request fails', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText(/2 sklepy z danymi/)
    overpassFails = true
    await user.click(screen.getByRole('button', { name: 'kliknij daleko' }))
    expect(await screen.findByText(/przeciążony/, {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getByTestId('map').firstChild).toHaveTextContent(/^$/)
    expect(screen.queryByRole('heading', { level: 2, name: 'Skyr z białkiem i malinami' })).not.toBeInTheDocument()
  }, 15_000)

  test('growing the radius keeps what was found while the wider search runs, and says so', async () => {
    render(<App />)
    await screen.findByText(/W promieniu 1 km: 2 sklepy/)
    let release!: () => void
    overpassGate = new Promise((resolve) => (release = resolve))
    fireEvent.change(screen.getByRole('slider'), { target: { value: '5' } }) // 5 km
    expect(await screen.findByText(/Szukam sklepów w promieniu 5 km/)).toBeInTheDocument()
    expect(screen.getByText(/na razie: 2 sklepy w promieniu 1/)).toBeInTheDocument()
    expect(screen.getByTestId('map')).toHaveTextContent(/^biedronka,lidl/)
    expect(screen.getByRole('heading', { level: 2, name: 'Skyr z białkiem i malinami' })).toBeInTheDocument()
    release()
    expect(await screen.findByText(/W promieniu 5 km: 2 sklepy/)).toBeInTheDocument()
  }, 15_000)
})
