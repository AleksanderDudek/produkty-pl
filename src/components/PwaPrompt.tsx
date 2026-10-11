import { Download, RefreshCw, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { DATASET_LOADED_EVENT, loadedDatasetUrl } from '../hooks/useDataset.ts'
import { DATASET_CACHE } from '../lib/dataset-url.ts'

/** Chrome's install event; not in the DOM typings. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const card = 'pointer-events-auto flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm shadow-lg'

/**
 * The service worker's lifecycle, said in a corner:
 * - a new version waits for "Odśwież" (never applied on its own),
 * - "works offline" once, the first time everything is cached,
 * - "Zainstaluj" where the browser offers installation (Chromium).
 */
export function PwaPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [workerReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError: (error: unknown) => console.warn('[produkty-pl] service worker registration failed', error),
  })
  // "Works offline" only once it is TRUE: on the first visit the dataset was
  // fetched before the worker existed, so nothing cached it. It is put in the
  // worker's cache here, and the message waits for that.
  const [offlineReady, setOfflineReady] = useState(false)
  useEffect(() => {
    if (!workerReady) return
    let cancelled = false
    const warm = (url: string) =>
      caches
        .open(DATASET_CACHE)
        .then(async (cache) => (await cache.match(url)) ?? cache.add(url))
        .then(() => !cancelled && setOfflineReady(true))
        .catch(() => {
          // Storage full or the network gone mid-way: say nothing rather than something false.
        })
    // The worker usually installs before 23 MB of data has arrived: then wait for it.
    const onLoaded = (event: Event) => void warm((event as CustomEvent<string>).detail)
    const url = loadedDatasetUrl()
    if (url) void warm(url)
    else window.addEventListener(DATASET_LOADED_EVENT, onLoaded, { once: true })
    return () => {
      cancelled = true
      window.removeEventListener(DATASET_LOADED_EVENT, onLoaded)
    }
  }, [workerReady])
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setInstallEvent(null)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  useEffect(() => {
    if (!offlineReady) return
    const timer = setTimeout(() => setOfflineReady(false), 5000)
    return () => clearTimeout(timer)
  }, [offlineReady, setOfflineReady])

  if (!needRefresh && !offlineReady && !installEvent) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4" role="status">
      {needRefresh && (
        <div className={card}>
          <span>Jest nowa wersja aplikacji.</span>
          <button
            type="button"
            onClick={() => void updateServiceWorker(true)}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white"
          >
            <RefreshCw className="size-4" aria-hidden /> Odśwież
          </button>
          <button type="button" onClick={() => setNeedRefresh(false)} aria-label="Później" className="text-stone-400 hover:text-stone-700">
            <X className="size-4" aria-hidden />
          </button>
        </div>
      )}
      {offlineReady && <div className={card}>Aplikacja działa teraz także bez internetu.</div>}
      {installEvent && !needRefresh && (
        <div className={card}>
          <span>Dodaj Produkty PL do ekranu głównego.</span>
          <button
            type="button"
            onClick={async () => {
              await installEvent.prompt()
              setInstallEvent(null)
            }}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white"
          >
            <Download className="size-4" aria-hidden /> Zainstaluj
          </button>
          <button type="button" onClick={() => setInstallEvent(null)} aria-label="Nie teraz" className="text-stone-400 hover:text-stone-700">
            <X className="size-4" aria-hidden />
          </button>
        </div>
      )}
    </div>
  )
}
