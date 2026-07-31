import { Badge } from '@/components/ui/Badge'
import type { RoundBadgeKind } from '../mockData'

const LABEL: Record<RoundBadgeKind, string> = {
  DECLINE: '단계 하락',
  LOW_PERSISTENT: '지속 저점',
  ACE: '우수',
  ABSENT: '미응시',
  INVALID: '무효 응시',
  DROPPED: '중단',
}

/*
  와이어프레임 .rbadge 대조(docs/plan/v2/wireframe/manager/trainees.html) —
  down(단계 하락)은 danger가 아니라 warning, void(무효 응시)는 neutral이 아니라
  danger다. 감으로 고르면 이렇게 어긋난다.
*/
const VARIANT: Record<RoundBadgeKind, 'success' | 'warning' | 'danger' | 'neutral'> = {
  DECLINE: 'warning',
  LOW_PERSISTENT: 'danger',
  ACE: 'success',
  ABSENT: 'neutral',
  INVALID: 'danger',
  DROPPED: 'neutral',
}

/** 이번 회차 배지 — 위험 2종 · 우수 · 응시상태 3종(14-1) 중 하나. 일반(kind 없음)은 배지 없이 "—" */
export function RoundBadge({ kind }: { kind: RoundBadgeKind | null }) {
  if (!kind) return <span className="text-fg-subtle">—</span>
  return <Badge variant={VARIANT[kind]}>{LABEL[kind]}</Badge>
}
