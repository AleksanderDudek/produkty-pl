import { ChefHat, MapPin, Salad, ShoppingBasket } from 'lucide-react'
import type { ReactNode } from 'react'
import { pathOf, type Route } from '../hooks/useRoute.ts'

interface Props {
  route: Route
  onNavigate: (route: Route) => void
  /** The page's own controls, under the title row. */
  children?: ReactNode
}

// On a phone the four tabs stack icon over a short label, like an app's tab
// bar, so they fit one line; the full label is the link's name.
const TABS: { route: Route; label: string; short: string; Icon: typeof ShoppingBasket }[] = [
  { route: 'products', label: 'Produkty', short: 'Produkty', Icon: ShoppingBasket },
  { route: 'recipes', label: 'Przepisy białkowe', short: 'Przepisy', Icon: ChefHat },
  { route: 'nearby', label: 'W pobliżu', short: 'W pobliżu', Icon: MapPin },
  { route: 'diet', label: 'Dieta', short: 'Dieta', Icon: Salad },
]

export function AppHeader({ route, onNavigate, children }: Props) {
  return (
    <header className="z-20 border-b border-stone-200 bg-white/95 backdrop-blur lg:sticky lg:top-0">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-lg font-bold whitespace-nowrap text-emerald-800">Produkty PL</span>
          <nav aria-label="Sekcje" className="flex flex-wrap gap-0.5 sm:gap-1">
            {TABS.map(({ route: target, label, short, Icon }) => (
              <a
                key={target}
                href={pathOf(target)}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
                  e.preventDefault()
                  onNavigate(target)
                }}
                aria-current={route === target ? 'page' : undefined}
                aria-label={label}
                className={`inline-flex min-w-16 flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-[11px] font-medium sm:min-w-0 sm:flex-row sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-sm ${
                  route === target ? 'bg-emerald-100 text-emerald-900' : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                <Icon className="size-4" aria-hidden />
                <span className="sm:hidden">{short}</span>
                <span className="hidden sm:inline">{label}</span>
              </a>
            ))}
          </nav>
        </div>
        {children}
      </div>
    </header>
  )
}
