# PWA + W pobliżu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Installable PWA whose start screen finds shops near the user (Overpass/OSM, radius 0.5–10 km) and lists the recipes doable in them.

**Architecture:** Pure modules in `src/nearby/` (geo, radius, overpass, cache, nearby summary, url) under unit tests; two hooks (geolocation, nearby shops); a Leaflet map component mocked in page tests; the recipe engine reused with "nearby chains, nearest first" as the store ranking. PWA via `vite-plugin-pwa` generateSW.

**Spec:** `docs/superpowers/specs/2026-10-10-pwa-w-poblizu-design.md`

### Task 1: Shared chain matching
- [ ] Move `CHAINS`, `storeKey`, `parseStores` to `src/lib/stores.ts`; `scripts/lib/stores.ts` re-exports them and keeps `PRIVATE_LABELS`. Existing store tests stay green.

### Task 2: Pure nearby modules (TDD)
- [ ] `geo.ts`: `distanceMeters` (haversine), `formatDistance` ("350 m", "1,2 km").
- [ ] `radius.ts`: `RADIUS_STEPS`, `DEFAULT_RADIUS`, `snapRadius`, `radiusLabel`.
- [ ] `overpass.ts`: `buildQuery`, `parseShops(json, center, knownChains)`, `fetchShops` (form POST, endpoints in order, one retry, rejects non-JSON).
- [ ] `cache.ts`: key by ~100 m cell, entry covers a smaller radius, 24 h TTL, storage failures ignored.
- [ ] `summary.ts`: shops within radius, per-chain nearest shop and count, ranking.
- [ ] `url.ts`: `?r=&sklep=&p=` codec; position never written.

### Task 3: Engine touch-ups
- [ ] `readyProducts` accepts several stores.
- [ ] `RecipeCard` takes `describeStore(chain)` for the shop line and chips.

### Task 4: Hooks
- [ ] `useGeolocation` (auto on mount, remembers last position, manual set).
- [ ] `useNearbyShops` (debounced, cache-aware, abortable, status + retry).

### Task 5: UI
- [ ] Route `/w-poblizu`, third tab, PWA `start_url`.
- [ ] `RadiusSlider`, `StoreMap` (Leaflet, canvas, popups, click to move), `NearbyPage`.
- [ ] Page tests with geolocation, fetch and the map mocked.

### Task 6: PWA
- [ ] `vite-plugin-pwa`, manifest, runtime caching, navigate fallback, `PwaUpdatePrompt`, icons via `sharp`, CSP meta, `BASE_PATH`.
- [ ] `pnpm build && pnpm preview`: manifest served, service worker registered, offline reload of `/w-poblizu` works.

### Task 7: Finish
- [ ] Real Overpass in the browser, desktop + mobile; full gate; review; merge.
