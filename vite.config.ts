/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { DATASET_CACHE, DATASET_META_CACHE } from './src/lib/dataset-url.ts'

/**
 * `/` locally; a sub-path such as `/produkty-pl/` when served from GitHub
 * Pages. Normalised to a leading AND trailing slash: Vite would forgive a
 * missing one, the manifest and Workbox would not ("/produkty-plw-poblizu").
 */
const BASE_TRIMMED = (process.env.BASE_PATH ?? '').replace(/^\/+|\/+$/g, '')
const BASE = BASE_TRIMMED ? `/${BASE_TRIMMED}/` : '/'

const OVERPASS = ['https://overpass-api.de', 'https://overpass.private.coffee']
const IMAGES = ['https://images.openfoodfacts.org', 'https://tile.openstreetmap.org']

/**
 * Content-Security-Policy for the production build, as a <meta> tag (static
 * hosting cannot set headers). Exactly the outside origins the app uses:
 * Open Food Facts photos and OSM tiles as images, Overpass for shops. Styles
 * allow inline because Leaflet positions its layers with style attributes.
 * Dev is left alone: Vite's HMR relies on inline scripts.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${IMAGES.join(' ')}`,
  `connect-src 'self' ${[...OVERPASS, ...IMAGES].join(' ')}`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ')

function contentSecurityPolicy(): Plugin {
  return {
    name: 'produkty-pl:csp',
    apply: 'build',
    transformIndexHtml: (html) =>
      html.replace(/<meta charset="UTF-8" \/>/, (charset) => `${charset}\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
  }
}

const DAY = 24 * 3600

// https://vite.dev/config/
export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    tailwindcss(),
    contentSecurityPolicy(),
    VitePWA({
      // Updates wait for the user's "Odśwież": reloading under someone who is
      // reading a recipe in a shop would lose their place.
      registerType: 'prompt',
      injectRegister: false,
      // Not in the manifest, so not added automatically: iOS uses it.
      includeAssets: ['icons/apple-touch-icon-180x180.png'],
      manifest: {
        id: BASE,
        name: 'Produkty PL – przepisy białkowe ze sklepów w pobliżu',
        short_name: 'Produkty PL',
        description: 'Przepisy z przewagą białka z produktów ze sklepów wokół Ciebie i dieta, która dopasowuje się do tego, co naprawdę zjesz. Dane: Open Food Facts i OpenStreetMap.',
        lang: 'pl',
        dir: 'ltr',
        // "Open the app and it finds the shops near you."
        start_url: `${BASE}w-poblizu`,
        scope: BASE,
        display: 'standalone',
        theme_color: '#047857',
        background_color: '#fafaf9',
        categories: ['food', 'health', 'lifestyle'],
        icons: [
          { src: 'icons/pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Dieta na dziś', short_name: 'Dieta', url: `${BASE}dieta`, icons: [{ src: 'icons/pwa-192x192.png', sizes: '192x192' }] },
          { name: 'Przepisy białkowe', short_name: 'Przepisy', url: `${BASE}przepisy`, icons: [{ src: 'icons/pwa-192x192.png', sizes: '192x192' }] },
          { name: 'Wszystkie produkty', short_name: 'Produkty', url: BASE, icons: [{ src: 'icons/pwa-192x192.png', sizes: '192x192' }] },
        ],
      },
      workbox: {
        // The shell only; the 23 MB dataset is cached at runtime below. The
        // manifest and its icons are added by the plugin itself, so PNGs and the
        // manifest are not globbed again (they were precached twice).
        globPatterns: ['**/*.{js,css,html,svg}'],
        // data/: the dataset, cached at runtime. mark.svg: only the source of the icons.
        globIgnores: ['data/**', 'icons/mark.svg'],
        // Every in-app path is the shell, so /przepisy, /w-poblizu and /dieta open offline.
        navigateFallback: `${BASE}index.html`,
        navigateFallbackDenylist: [/\/data\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Tiny and fresh: it names the dataset version. Offline, the last copy.
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.endsWith('/data/manifest.json'),
            handler: 'NetworkFirst',
            options: { cacheName: DATASET_META_CACHE, networkTimeoutSeconds: 4, cacheableResponse: { statuses: [200] } },
          },
          {
            // A versioned URL never changes, so it is kept until a new version
            // replaces it (two kept: the new one and the one being replaced).
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.endsWith('/data/products.json') && url.searchParams.has('v'),
            handler: 'CacheFirst',
            options: { cacheName: DATASET_CACHE, expiration: { maxEntries: 2 }, cacheableResponse: { statuses: [200] } },
          },
          {
            // Unversioned (a data folder without manifest.json): the network when there is one.
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.endsWith('/data/products.json'),
            handler: 'NetworkFirst',
            options: { cacheName: DATASET_CACHE, cacheableResponse: { statuses: [200] } },
          },
          {
            // Requested with CORS (crossOrigin), so these are real responses,
            // not opaque ones Chrome would count as ~7 MB each against the quota.
            urlPattern: /^https:\/\/images\.openfoodfacts\.org\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'off-images',
              expiration: { maxEntries: 400, maxAgeSeconds: 30 * DAY },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            // Tiles the user has looked at, never prefetched (OSM tile policy).
            urlPattern: /^https:\/\/tile\.openstreetmap\.org\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 500, maxAgeSeconds: 7 * DAY },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
  },
})
