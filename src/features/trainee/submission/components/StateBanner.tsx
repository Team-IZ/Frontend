import type { LucideIcon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert'
import type { StateTone, StateWeight } from '../labels'

const TONE_VARIANT: Record<StateTone, 'info' | 'success' | 'warning' | 'danger'> = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
}

type Props = {
  tone: StateTone
  weight: StateWeight
  icon: LucideIcon
  title: string
  description: string
  sub?: string
}

/*
  weight === 'card' → 목업의 `.state` 카드(Alert). weight === 'inline' → 색 배경 없는
  얇은 한 줄 — 참고만 하면 되는 진행/과거 사실에 경고 카드와 같은 무게를 주지 않는다
  (labels.ts 머리 주석 참고).
*/
export default function StateBanner({ tone, weight, icon: Icon, title, description, sub }: Props) {
  if (weight === 'inline') {
    return (
      <div className="flex items-start gap-2.5 border-b border-border pb-4 text-sm">
        <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
        <div>
          <p className="text-fg">{title}</p>
          <p className="mt-0.5 text-fg-subtle">{description}</p>
          {sub && <p className="mt-1 text-xs text-fg-subtle">{sub}</p>}
        </div>
      </div>
    )
  }

  return (
    <Alert variant={TONE_VARIANT[tone]}>
      <Icon aria-hidden="true" className="size-5" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{description}</p>
        {sub && <p className="mt-1 text-xs text-fg-subtle">{sub}</p>}
      </AlertDescription>
    </Alert>
  )
}
