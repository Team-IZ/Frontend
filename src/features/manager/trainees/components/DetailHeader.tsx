import { Link } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SignalHero } from './SignalHero'
import type { RoundBadgeKind } from '../mockData'

/*
  헤더 — 남는 건 이름·위험 배지·판정식뿐이다(MG-06 §3). 계정 상태·참여 프로젝트·팀은
  뺐다 — 팀은 사람이 아니라 회차 줄의 속성이라 타임라인 쪽으로 옮겼다(§3 "팀을 사람
  옆에 박지 않는다").
*/
export function DetailHeader({
  name,
  className,
  riskKind,
  why,
}: {
  name: string
  className: string
  riskKind: Extract<RoundBadgeKind, 'DECLINE' | 'LOW_PERSISTENT'> | null
  why?: string
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <Button
        variant="ghost"
        size="sm"
        aria-label="교육생 목록으로 돌아가기"
        nativeButton={false}
        render={<Link to="/manager/trainees" />}
        className="p-1.5"
      >
        <ArrowLeft className="size-5" />
      </Button>
      <div className="flex flex-1 flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-xl leading-tight font-bold tracking-[-0.01em]">{name}</h1>
        <SignalHero kind={riskKind} />
        <span className="text-sm text-fg-muted">7기 · {className}</span>
        {why && <span className="ml-auto text-xs text-fg-subtle">{why}</span>}
      </div>
    </div>
  )
}
