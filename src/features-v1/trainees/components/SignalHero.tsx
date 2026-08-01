import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'

/*
  ① 상태 배지 — 위험 또는 에이스일 때만. 일반은 이 블록 자체가 렌더되지 않는다
  (빈 카드가 아니라 렌더 생략, D107).
*/
export function SignalHero({
  variant,
  headline,
  sub,
  onCreateIntervention,
}: {
  variant: 'risk' | 'ace'
  headline: string
  sub: string
  onCreateIntervention?: () => void
}) {
  const isRisk = variant === 'risk'

  return (
    <div
      className={cn(
        'mb-4 flex items-center gap-4 rounded-lg border px-5 py-4',
        isRisk ? 'border-danger-border bg-danger-soft' : 'border-success-border bg-success-soft',
      )}
    >
      <span className="text-xl" aria-hidden="true">
        {isRisk ? '⚠️' : '★'}
      </span>
      <div className="flex-1">
        <p className={cn('text-sm font-bold', isRisk ? 'text-danger' : 'text-success')}>
          {headline}
        </p>
        <p className="mt-0.5 text-xs text-fg-muted">{sub}</p>
      </div>
      {isRisk && (
        <Button variant="danger" size="sm" onClick={onCreateIntervention}>
          면담 시작 →
        </Button>
      )}
    </div>
  )
}
