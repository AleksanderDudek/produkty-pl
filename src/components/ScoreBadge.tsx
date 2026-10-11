import { ECO_COLORS, NOVA_COLORS, NUTRI_COLORS } from '../lib/grades.ts'
import { NOVA_LABELS, gradeLabel } from '../lib/labels.ts'
import type { EcoGrade, NovaGroup, NutriGrade } from '../lib/types.ts'

type Props =
  | { kind: 'nutriscore'; value: NutriGrade; size?: 'sm' | 'md' }
  | { kind: 'ecoscore'; value: EcoGrade; size?: 'sm' | 'md' }
  | { kind: 'nova'; value: NovaGroup; size?: 'sm' | 'md' }

const PREFIX = { nutriscore: 'Nutri-Score', ecoscore: 'Eco-Score', nova: 'NOVA' } as const

export function ScoreBadge(props: Props) {
  const { kind, size = 'sm' } = props
  const colors =
    props.kind === 'nutriscore' ? NUTRI_COLORS[props.value]
      : props.kind === 'ecoscore' ? ECO_COLORS[props.value]
        : NOVA_COLORS[props.value]
  const text = props.kind === 'nova' ? String(props.value) : gradeLabel(props.value)
  const title = props.kind === 'nova'
    ? `NOVA ${props.value}: ${NOVA_LABELS[props.value]}`
    : `${PREFIX[kind]} ${text}`

  return (
    <span
      role="img"
      title={title}
      aria-label={title}
      className={`inline-flex items-center gap-1 rounded-md font-semibold leading-none ${
        size === 'md' ? 'px-2 py-1.5 text-sm' : 'px-1.5 py-1 text-xs'
      }`}
      style={{ backgroundColor: colors.bg, color: colors.fg }}
    >
      <span className="font-normal opacity-90">{kind === 'nutriscore' ? 'NS' : kind === 'ecoscore' ? 'Eco' : 'NOVA'}</span>
      {text}
    </span>
  )
}
