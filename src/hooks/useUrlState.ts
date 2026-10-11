import { useCallback, useEffect, useRef, useState } from 'react'

export type Patch<S> = Partial<S> | ((current: S) => Partial<S>)
export type Update<S> = (patch: Patch<S>, options?: { push?: boolean }) => void

/** Marks a history entry this app pushed for an open detail. */
const DETAIL_ENTRY = 'produkty-pl:detail'

/**
 * A page's state, kept in the query string. Ordinary changes REPLACE the
 * history entry (typing must not fill Back with keystrokes); `push` adds one,
 * which is how opening a product makes Back close it. `reconcile` lets a page
 * derive fields from a change (the product list returns to page 1 when its
 * filters change).
 */
export function useUrlState<S>(
  read: (params: URLSearchParams) => S,
  write: (state: S) => URLSearchParams,
  reconcile: (current: S, changes: Partial<S>, next: S) => S = (_c, _ch, next) => next,
): [S, Update<S>, (fallback: Partial<S>) => void] {
  const [state, setState] = useState(() => read(new URLSearchParams(window.location.search)))
  const pushNext = useRef(false)
  const codec = useRef({ read, write, reconcile })
  useEffect(() => {
    codec.current = { read, write, reconcile }
  })

  useEffect(() => {
    const onPopState = () => setState(codec.current.read(new URLSearchParams(window.location.search)))
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // The URL is written from state, never inside a state updater: React may
  // run updaters twice.
  useEffect(() => {
    const query = codec.current.write(state).toString()
    const url = query ? `?${query}` : window.location.pathname
    const current = window.location.search || window.location.pathname
    if (url === current) return
    if (pushNext.current) window.history.pushState(DETAIL_ENTRY, '', url)
    else window.history.replaceState(window.history.state, '', url)
    pushNext.current = false
  }, [state])

  const update = useCallback<Update<S>>((patch, options) => {
    if (options?.push) pushNext.current = true
    setState((current) => {
      const changes = typeof patch === 'function' ? patch(current) : patch
      return codec.current.reconcile(current, changes, { ...current, ...changes })
    })
  }, [])

  const closeEntry = useCallback((fallback: Partial<S>) => {
    // Leave the way we came in when we pushed the entry; otherwise (a shared
    // link opened straight onto a detail) just apply the fallback.
    if (window.history.state === DETAIL_ENTRY) window.history.back()
    else update(fallback)
  }, [update])

  return [state, update, closeEntry]
}
