import { useCallback, useEffect, useRef, useState } from 'react'

export type Route = 'products' | 'recipes' | 'nearby' | 'diet'

/** Vite's base, so the app also works when it is served from a sub-path. */
const BASE = import.meta.env.BASE_URL.replace(/\/+$/, '')
export const RECIPES_PATH = `${BASE}/przepisy`
export const NEARBY_PATH = `${BASE}/w-poblizu`
export const DIET_PATH = `${BASE}/dieta`

export function routeOf(pathname: string): Route {
  const path = pathname.replace(/\/+$/, '')
  if (path === RECIPES_PATH) return 'recipes'
  if (path === NEARBY_PATH) return 'nearby'
  if (path === DIET_PATH) return 'diet'
  return 'products'
}

export function pathOf(route: Route): string {
  if (route === 'recipes') return RECIPES_PATH
  if (route === 'nearby') return NEARBY_PATH
  if (route === 'diet') return DIET_PATH
  return `${BASE}/`
}

/**
 * Two pages need no router library: the path picks the page, the query
 * string is each page's own state, Back and Forward re-read the path.
 * Switching tabs returns to the query each page was left with, so leaving the
 * product filters for a recipe does not throw them away.
 */
export function useRoute(): [Route, (route: Route) => void] {
  const [route, setRoute] = useState(() => routeOf(window.location.pathname))
  const lastSearch = useRef<Record<Route, string>>({ products: '', recipes: '', nearby: '', diet: '' })

  useEffect(() => {
    const onPopState = () => setRoute(routeOf(window.location.pathname))
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = useCallback((next: Route) => {
    const current = routeOf(window.location.pathname)
    if (current !== next) {
      lastSearch.current[current] = window.location.search
      window.history.pushState(null, '', pathOf(next) + lastSearch.current[next])
    }
    setRoute(next)
    window.scrollTo({ top: 0 })
  }, [])

  return [route, navigate]
}
