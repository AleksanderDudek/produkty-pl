# PWA + "W pobliżu" — recipes you can make from the shops around you

Date: 2026-10-10
Status: decided autonomously ("analyze current system, use best practices, pick
recommended, finish on your own").

## What was asked

1. Make the app a PWA, like the user's teleo and gym-training-tracker.
2. Couple it with a map: open the app, it finds shops near you, a slider sets
   the distance (from 500 m up to a maximum the user left open), and you get
   the recipes you can make by visiting a shop within that radius.

## Decisions

| Question | Decision | Why |
|---|---|---|
| PWA tooling | `vite-plugin-pwa` (Workbox `generateSW`), `registerType: 'prompt'`, manual registration, update toast | Same as teleo; a hand-written worker (gym tracker) is more code for the same result. No custom worker logic is needed here. |
| Start screen | `start_url` = `w-poblizu` | "Open the app, it finds shops near you." |
| Shop data | OpenStreetMap via the Overpass API | Free, no key, worldwide, has `brand` tags that map onto our chain keys through the existing `storeKey`. |
| Map | Leaflet + OSM raster tiles, canvas renderer | Small, no key, standard; attribution "© OpenStreetMap" shown. |
| Radius | steps 0.5, 1, 1.5, 2, 3, 5, 7.5, 10 km; default 1 km | 500 m is a walk to the corner, 10 km covers a drive in the suburbs; beyond that "nearby" stops meaning anything. |
| Location | browser geolocation; if denied or unavailable, a click on the map sets the place | Desktop browsers often deny; the feature must still work. |
| Privacy | the position is sent only to Overpass to find shops; never put in the URL (a shared link would leak it); last position kept in localStorage on this device | |

## Measured before designing

One Overpass query, central Warsaw, 1 km: 93 shops (nodes and ways, every one
with coordinates via `out center`). `brand` tags map onto our keys: Żabka 52,
Carrefour 13, Biedronka 5, Społem 4, Auchan, Lewiatan, Stokrotka, Eurospar.

The public servers are unreliable: in five requests overpass-api.de answered
200 twice, 504 and 406 (with an HTML body) otherwise, and two mirrors answered
500/504. A preflighted request (OPTIONS) is refused with 406, while a simple
form-encoded POST gets `Access-Control-Allow-Origin: *`. So:

- requests are simple POSTs (`application/x-www-form-urlencoded`), never JSON;
- a response is accepted only if it parses as Overpass JSON — an HTML error
  page with status 200 is a failure;
- endpoints are tried in order with one retry after a pause; the error shown
  says the shop server is busy and offers "Spróbuj ponownie";
- results are cached in localStorage for 24 h keyed by position (rounded to
  ~100 m) and the radius fetched. Shrinking the radius never refetches: the
  wider answer is filtered. Growing it fetches at the new radius.

## How "nearby" feeds the recipes

The recipe engine already answers "can this recipe be bought in full in chain
X" (`availableStores`, `bestVariant` over a store ranking). "Nearby" is a
ranking: the chains with a shop inside the radius, nearest first. Passing it
as the ranking makes every card default to the NEAREST shop that has
everything, and its store chips list only nearby chains. Recipes needing no
shop are shown when any known shop is within the radius. Cards say which shop
and how far: "Biedronka · 350 m · ul. Marszałkowska 10".

Only chains we have product data for count (a local shop with no data cannot
be planned on). The map shows those; the summary says how many other shops
were found.

## Page "W pobliżu" (`/w-poblizu`)

- Controls: radius slider with its value, "Moja lokalizacja", status line.
- Map: you, the radius circle, a marker per known shop (popup: name, chain,
  distance, address, how many recipes it covers). Click the map to move.
- Chain chips (nearest distance each) filter the recipes to one chain.
- Recipes doable nearby, nearest shop first, then ready products sold by the
  nearby chains.
- State in the URL: radius, chain, open product — never the position.

## PWA

- Manifest: Polish name, `start_url` and `scope` relative to the base, standalone,
  theme `#047857`, icons 64/192/512 + maskable + apple-touch generated with
  `sharp` from one SVG mark (teleo's script), shortcuts to Przepisy and Produkty.
- Precache: the app shell. Runtime: `products.json` stale-while-revalidate
  (23 MB, cached on first use, offline afterwards); Open Food Facts photos
  cache-first, 400 entries, 30 days; OSM tiles cache-first, 500 entries, 7 days
  (viewed tiles only — no prefetching, per the tile policy). Navigation falls
  back to `index.html`, so `/przepisy` and `/w-poblizu` open offline.
- Update: a toast "Nowa wersja – Odśwież"; never applied mid-use.
- CSP meta in the build (GitHub Pages cannot set headers), allowing exactly the
  Open Food Facts images, OSM tiles and Overpass endpoints.
- Base path from `BASE_PATH` (default `/`), so the same build can be served
  from a sub-path like the user's other apps on GitHub Pages.

Geolocation and installation need HTTPS (localhost is exempt). Deploying is
NOT done here: it publishes the app, and the 23 MB dataset is built from a
local 12 GB dump, so it needs a decision about where the data lives.

## Tests

Pure: distance and formatting, radius steps, Overpass query, parsing (nodes,
ways with `center`, brand vs name, unknown chains, duplicates), endpoint
fallback on HTML/5xx, cache keys/coverage/TTL, chain summary and ranking,
URL codec, `readyProducts` over several chains. UI: the page with
geolocation, Overpass and the map mocked — shops found, recipes shown with
the nearest shop, radius change, denied location, Overpass failure.

## Changes after review

- **Picking a place is deliberate.** A plain click sets it only while there is
  no position; otherwise it would fire when closing a popup or double-tapping
  to zoom and throw a good GPS fix away. Long-press / right-click and a
  keyboard-reachable "Ustaw środek mapy jako moją lokalizację" set it on purpose.
  A late GPS answer never overwrites a pick (request sequence numbers).
- **Query circle.** Overpass is asked about a centre rounded to 3 decimals
  (~100 m) with the radius + 250 m; that circle is what is cached. The exact
  position never leaves the device, and small moves or a reopen hit the cache.
  Only overpass-api.de and overpass.private.coffee are used, both named on the
  page with the tile server.
- **Overpass runtime errors** (JSON, status 200, `remark: runtime error…`) are
  failures, not "no shops"; each request has a 30 s timeout.
- **Shops are only shown for the circle they were fetched for**; a saved place
  is labelled as saved; only chains that give a recipe or a ready product count.
- **Dataset versioning.** `data/manifest.json` carries a content hash; the app
  loads `products.json?v=<hash>` cache-first. The first-visit "works offline"
  message waits until that file is in the worker's cache.
- `BASE_PATH` is normalised to `/x/`.
