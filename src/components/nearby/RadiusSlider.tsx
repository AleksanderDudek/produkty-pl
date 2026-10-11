import { RADIUS_STEPS, radiusLabel } from '../../nearby/radius.ts'

/**
 * The steps are not evenly spaced (500 m ... 10 km), so the slider moves
 * over their INDEX: each notch is one step, and 1 km sits where a thumb can
 * find it instead of in the first twentieth of the track.
 */
export function RadiusSlider({ radius, onChange }: { radius: number; onChange: (radius: number) => void }) {
  const index = Math.max(0, RADIUS_STEPS.indexOf(radius as (typeof RADIUS_STEPS)[number]))
  return (
    <label className="flex min-w-0 flex-1 basis-full items-center gap-3 text-sm sm:basis-auto">
      <span className="shrink-0 text-stone-600">Promień</span>
      <input
        type="range"
        min={0}
        max={RADIUS_STEPS.length - 1}
        step={1}
        value={index}
        onChange={(e) => onChange(RADIUS_STEPS[Number(e.target.value)])}
        aria-valuetext={radiusLabel(radius)}
        className="min-w-0 flex-1 accent-emerald-600"
      />
      <output className="w-14 shrink-0 text-right font-semibold tabular-nums text-emerald-800">{radiusLabel(radius)}</output>
    </label>
  )
}
