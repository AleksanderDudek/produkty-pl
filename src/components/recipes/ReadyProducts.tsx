import { useState } from 'react'
import { formatNumber } from '../../lib/format.ts'
import type { Dictionaries } from '../../lib/types.ts'
import type { ReadyGroup } from '../../recipes/ready.ts'
import { ProductCard } from '../ProductCard.tsx'

const VISIBLE = 6
const STEP = 24

function Group({ group, dict, onOpen }: { group: ReadyGroup; dict: Dictionaries; onOpen: (code: string) => void }) {
  // Grows in steps, so every product the heading counts can be reached.
  const [visible, setVisible] = useState(VISIBLE)
  const shown = group.items.slice(0, visible)
  const hidden = group.items.length - shown.length

  return (
    <section aria-labelledby={`ready-${group.id}`} className="flex flex-col gap-2">
      <h3 id={`ready-${group.id}`} className="text-base font-semibold text-stone-800">
        {group.label} <span className="text-sm font-normal text-stone-400">({formatNumber(group.items.length, 0)})</span>
      </h3>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {shown.map((p) => (
          <li key={p.code}>
            <ProductCard product={p} dict={dict} onOpen={onOpen} headingLevel={4} />
          </li>
        ))}
      </ul>
      <div className="flex gap-4">
        {hidden > 0 && (
          <button type="button" onClick={() => setVisible((v) => v + STEP)} className="text-sm font-medium text-emerald-700 hover:underline">
            Pokaż więcej ({formatNumber(Math.min(hidden, STEP), 0)} z {formatNumber(hidden, 0)})
          </button>
        )}
        {visible > VISIBLE && (
          <button type="button" onClick={() => setVisible(VISIBLE)} className="text-sm text-stone-500 hover:underline">
            Zwiń
          </button>
        )}
      </div>
    </section>
  )
}

/** Products that already obey the rule per 100 g: open and eat. */
export function ReadyProducts({ groups, dict, onOpen }: { groups: ReadyGroup[]; dict: Dictionaries; onOpen: (code: string) => void }) {
  if (groups.length === 0) {
    return <p className="text-sm text-stone-500">Brak gotowych produktów spełniających zasadę w tym sklepie.</p>
  }
  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => <Group key={group.id} group={group} dict={dict} onOpen={onOpen} />)}
    </div>
  )
}
