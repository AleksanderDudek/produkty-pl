import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import { formatDistance } from '../../nearby/geo.ts'
import type { LatLon, PlacedShop } from '../../nearby/types.ts'

interface Props {
  center: LatLon | null
  radius: number
  shops: PlacedShop[]
  selectedChain: string | null
  storeName: (chain: string) => string
  recipeCount: (chain: string) => number
  /** Set where the user is. */
  onPick: (position: LatLon) => void
  /**
   * Whether a plain click sets the place. Only while there IS no place: once
   * there is one, a click closes popups and double-clicks zoom, and moving
   * "you" takes a deliberate long-press or right-click.
   */
  pickOnClick: boolean
  onSelectChain: (chain: string | null) => void
  /** The map's centre after every pan or zoom, for "use the centre of the map". */
  onViewChange?: (center: LatLon) => void
}

/** Roughly the middle of Poland, for when nobody knows where the user is yet. */
const POLAND: L.LatLngExpression = [52.07, 19.48]

// Recognisable at a glance on a busy street; anything else is the app's green.
const CHAIN_COLORS: Record<string, string> = {
  biedronka: '#d52b1e',
  lidl: '#0050aa',
  zabka: '#2f8f3a',
  kaufland: '#e10915',
  carrefour: '#1e5bc6',
  auchan: '#cf0a2c',
  aldi: '#00005f',
  netto: '#f4c400',
  dino: '#c4161c',
  stokrotka: '#7cb342',
  lewiatan: '#e2001a',
}

function popupFor(shop: PlacedShop, props: Props): HTMLElement {
  // Built from text nodes: shop names come from OpenStreetMap, typed by anyone.
  const root = document.createElement('div')
  const line = (text: string, className = '') => {
    const p = document.createElement('p')
    p.textContent = text
    if (className) p.className = className
    root.appendChild(p)
  }
  line(shop.name, 'font-semibold')
  line(`${props.storeName(shop.chain!)} · ${formatDistance(shop.distance)}`)
  if (shop.address) line(shop.address)
  if (shop.openingHours) line(shop.openingHours, 'text-stone-500')
  const count = props.recipeCount(shop.chain!)
  line(count > 0 ? `Przepisy z kompletem składników tutaj: ${count}` : 'Brak przepisów z kompletem składników tutaj', 'mt-1')
  if (count > 0) {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = 'Pokaż te przepisy'
    button.className = 'mt-1 rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white'
    button.addEventListener('click', () => props.onSelectChain(shop.chain))
    root.appendChild(button)
  }
  return root
}

/**
 * The map, drawn by Leaflet on a canvas (thousands of markers stay fast at
 * 10 km in a city). React owns the props; Leaflet owns the DOM inside the box.
 * A click on the map moves "you" there, for when the browser will not say.
 */
export function StoreMap(props: Props) {
  const { center, radius, shops, selectedChain } = props
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layers = useRef<{ you: L.LayerGroup; shops: L.LayerGroup } | null>(null)
  const latest = useRef(props)
  useEffect(() => {
    latest.current = props
  })

  useEffect(() => {
    if (!box.current) return
    const m = L.map(box.current, { preferCanvas: true, zoomControl: true }).setView(POLAND, 6)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      // CORS mode, so the service worker caches tiles as real responses.
      crossOrigin: true,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m)
    layers.current = { you: L.layerGroup().addTo(m), shops: L.layerGroup().addTo(m) }
    const pick = (e: L.LeafletMouseEvent) => latest.current.onPick({ lat: e.latlng.lat, lon: e.latlng.lng })
    // Leaflet closes an open popup on `preclick` and then still fires `click`
    // on the map: that click was "close this", not "I am here".
    let popupOpen = false
    let closedPopup = false
    m.on('popupopen', () => (popupOpen = true))
    m.on('popupclose', () => (popupOpen = false))
    m.on('preclick', () => (closedPopup = popupOpen))
    m.on('click', (e: L.LeafletMouseEvent) => {
      if (latest.current.pickOnClick && !closedPopup) pick(e)
    })
    // Long-press on a phone (Leaflet's tap-hold), right-click on a computer.
    m.on('contextmenu', pick)
    m.on('moveend', () => {
      const c = m.getCenter()
      latest.current.onViewChange?.({ lat: c.lat, lon: c.lng })
    })
    map.current = m
    return () => {
      m.remove()
      map.current = null
      layers.current = null
    }
  }, [])

  useEffect(() => {
    const m = map.current
    const group = layers.current?.you
    if (!m || !group) return
    group.clearLayers()
    if (!center) return
    const at: L.LatLngExpression = [center.lat, center.lon]
    const circle = L.circle(at, { radius, color: '#047857', weight: 1.5, fillOpacity: 0.06 }).addTo(group)
    L.circleMarker(at, { radius: 8, color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 })
      .bindTooltip('Tu jesteś')
      .addTo(group)
    m.fitBounds(circle.getBounds(), { padding: [12, 12] })
  }, [center, radius])

  useEffect(() => {
    const group = layers.current?.shops
    if (!group) return
    group.clearLayers()
    for (const shop of shops) {
      const chosen = shop.chain === selectedChain
      const dimmed = selectedChain !== null && !chosen
      L.circleMarker([shop.lat, shop.lon], {
        radius: chosen ? 9 : 7,
        color: '#fff',
        weight: 2,
        fillColor: CHAIN_COLORS[shop.chain!] ?? '#047857',
        fillOpacity: dimmed ? 0.35 : 0.95,
      })
        .bindPopup(() => popupFor(shop, latest.current))
        .addTo(group)
    }
  }, [shops, selectedChain])

  return <div ref={box} role="region" aria-label="Mapa sklepów w pobliżu" className="h-full min-h-72 w-full rounded-xl" />
}
