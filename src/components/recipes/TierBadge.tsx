import { CookingPot, Timer, Zap } from 'lucide-react'
import { TIER_LABELS, type TimeTier } from '../../recipes/tiers.ts'

const ICONS = { szybkie: Zap, chwila: Timer, dluzej: CookingPot } as const

/** The tier's icon; the quick tier's lightning bolt is filled, so it reads at a glance. */
export function TierIcon({ tier }: { tier: TimeTier }) {
  const Icon = ICONS[tier]
  return <Icon className={`size-3.5 ${tier === 'szybkie' ? 'fill-amber-400 text-amber-600' : ''}`} aria-hidden />
}

/**
 * Which time tier a recipe is in. The quick tier is the one people come for
 * in a hurry, so it is the one that stands out (amber, a lightning bolt);
 * the others are a quiet label.
 */
export function TierBadge({ tier }: { tier: TimeTier }) {
  const quick = tier === 'szybkie'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
        quick ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-300' : 'bg-stone-100 text-stone-700'
      }`}
    >
      <TierIcon tier={tier} />
      {TIER_LABELS[tier]}
    </span>
  )
}
