import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { DATASET } from '../test/fixtures.ts'
import { loadedDatasetUrl, useDataset } from './useDataset.ts'

const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } })

beforeEach(() => window.localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

test('the dataset is requested under the version the manifest names, and the version is remembered', async () => {
  const fetchMock = vi.fn(async (url: string) => (String(url).endsWith('manifest.json') ? json({ version: 'abc123', generatedAt: 'x' }) : json(DATASET)))
  vi.stubGlobal('fetch', fetchMock)
  const { result } = renderHook(() => useDataset())
  await waitFor(() => expect(result.current.status).toBe('ready'))
  expect(fetchMock.mock.calls.map((c) => c[0])).toEqual(['/data/manifest.json', '/data/products.json?v=abc123'])
  expect(window.localStorage.getItem('produkty-pl:data-version')).toBe('abc123')
  expect(loadedDatasetUrl()).toBe('/data/products.json?v=abc123')
})

test('offline, the version last seen here is used: it is the one the service worker holds', async () => {
  window.localStorage.setItem('produkty-pl:data-version', 'old42')
  const fetchMock = vi.fn(async (url: string) => {
    if (String(url).endsWith('manifest.json')) throw new TypeError('Failed to fetch')
    return json(DATASET)
  })
  vi.stubGlobal('fetch', fetchMock)
  const { result } = renderHook(() => useDataset())
  await waitFor(() => expect(result.current.status).toBe('ready'))
  expect(fetchMock.mock.calls.at(-1)![0]).toBe('/data/products.json?v=old42')
})

test('without a manifest (an older data folder), the plain URL still works', async () => {
  const fetchMock = vi.fn(async (url: string) =>
    String(url).endsWith('manifest.json') ? new Response('<html>', { headers: { 'content-type': 'text/html' } }) : json(DATASET))
  vi.stubGlobal('fetch', fetchMock)
  const { result } = renderHook(() => useDataset())
  await waitFor(() => expect(result.current.status).toBe('ready'))
  expect(fetchMock.mock.calls.at(-1)![0]).toBe('/data/products.json')
})
