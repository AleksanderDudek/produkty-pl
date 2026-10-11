// Where the dataset lives and how a version is attached to it. Shared by the
// app (useDataset), the update prompt (warming the cache) and vite.config.ts
// (the service worker's caching rules), so the three cannot disagree.

/** Cache names used by the service worker. */
export const DATASET_CACHE = 'produkty-dataset'
export const DATASET_META_CACHE = 'produkty-dataset-meta'

/**
 * `data/manifest.json`, written by prepare-data: `{ version, generatedAt }`.
 * Small and fetched fresh, it names the version of the 23 MB `products.json`,
 * which is then requested as `products.json?v=<version>` and kept until the
 * version changes - instead of being downloaded again on every open.
 */
export interface DataManifest {
  version: string
  generatedAt: string
}

export function manifestUrl(base: string): string {
  return `${base}data/manifest.json`
}

export function productsUrl(base: string, version: string | null): string {
  return `${base}data/products.json${version ? `?v=${encodeURIComponent(version)}` : ''}`
}

export function isManifest(value: unknown): value is DataManifest {
  return typeof (value as DataManifest | null)?.version === 'string' && (value as DataManifest).version.length > 0
}
