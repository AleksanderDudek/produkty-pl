import { formatPrice } from '../lib/format.ts'
import type { Price } from '../lib/types.ts'

export function PriceTag({ price, className = '' }: { price: Price; className?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-1 ${className}`}>
      <span className={`font-semibold ${price.discounted ? 'text-red-700' : 'text-stone-900'}`}>
        {formatPrice(price.value)}
      </span>
      {price.perKg && <span className="text-xs text-stone-500">/kg</span>}
      {price.regularValue !== null && (
        <span className="text-xs text-stone-400 line-through">{formatPrice(price.regularValue)}</span>
      )}
    </span>
  )
}
