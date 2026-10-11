import { useEffect, useState } from 'react'
import { isManifest, manifestUrl, productsUrl } from '../lib/dataset-url.ts'
import { indexProducts } from '../lib/search.ts'
import type { Dataset, IndexedProduct } from '../lib/types.ts'

export type DatasetState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; dataset: Dataset; products: IndexedProduct[] }

const BASE = import.meta.env.BASE_URL
const VERSION_KEY = 'produkty-pl:data-version'

export const MISSING_DATA_MESSAGE =
  'Brak pliku z danymi. Uruchom w katalogu projektu: pnpm data (albo pnpm data:prepare).'

/** The URL the dataset was last loaded from: the update prompt warms the cache with it. */
let loadedFrom: string | null = null
export function loadedDatasetUrl(): string | null {
  return loadedFrom
}

/** Fired on window once the dataset has loaded (its URL in `detail`). */
export const DATASET_LOADED_EVENT = 'produkty-pl:dataset-loaded'

function rememberedVersion(): string | null {
  try {
    return window.localStorage.getItem(VERSION_KEY)
  } catch {
    return null
  }
}

function rememberVersion(version: string): void {
  try {
    window.localStorage.setItem(VERSION_KEY, version)
  } catch {
    // Not remembered: offline, the unversioned URL is tried instead.
  }
}

/**
 * The version named by data/manifest.json; offline, the one last seen here,
 * which is the one the service worker has cached. null: none known (an older
 * data folder without a manifest, or never loaded), and the plain URL is used.
 */
async function currentVersion(signal: AbortSignal): Promise<string | null> {
  try {
    const response = await fetch(manifestUrl(BASE), { signal, cache: 'no-cache' })
    const body: unknown = response.ok && response.headers.get('content-type')?.includes('json') ? await response.json() : null
    if (isManifest(body)) {
      rememberVersion(body.version)
      return body.version
    }
  } catch (error) {
    if (signal.aborted) throw error
  }
  return rememberedVersion()
}

export function useDataset(): DatasetState {
  const [state, setState] = useState<DatasetState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const url = productsUrl(BASE, await currentVersion(controller.signal))
        const response = await fetch(url, { signal: controller.signal })
        // The dev server answers a missing file with index.html and a 200, so
        // the content type, not the status, is what says the file is absent.
        const isJson = response.headers.get('content-type')?.includes('json')
        if (response.status === 404 || !isJson) {
          setState({ status: 'error', message: MISSING_DATA_MESSAGE })
          return
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const dataset = (await response.json()) as Dataset
        loadedFrom = url
        window.dispatchEvent(new CustomEvent(DATASET_LOADED_EVENT, { detail: url }))
        setState({
          status: 'ready',
          dataset,
          products: indexProducts(dataset.products, dataset.dictionaries.brands),
        })
      } catch (error) {
        if (controller.signal.aborted) return
        setState({ status: 'error', message: `Nie udało się wczytać danych: ${String(error)}` })
      }
    }
    void load()
    return () => controller.abort()
  }, [])

  return state
}
