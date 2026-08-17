import { Badge } from '@/components/ui/Badge'
import type { RoundBadgeKind } from '../_/api/types'

const LABEL: Record<RoundBadgeKind, string> = {
  STAGE_DECLINE: '단계 하락',
  PERSISTENT_LOW: '지속 저점',
  ACE: '우수',
  NOT_ATTENDED: '미응시',
  INVALID_ATTEMPT: '무효 응시',
  SESSION_INCOMPLETE: '중단',
  /* 서버에만 있던 2종 — 목에는 자리가 없었다(스펙 §roundPrimaryStatusCode) */
  LOW_PARTICIPATION: '저기여',
  CONTRIBUTION_UNDERSTANDING_GAP: '기여·이해도 괴리',
}

/*
  와이어프레임 .rbadge 대조(docs/plan/v2/wireframe/manager/trainees.html) —
  down(단계 하락)은 danger가 아니라 warning, void(무효 응시)는 neutral이 아니라
  danger다. 감으로 고르면 이렇게 어긋난다.

  새로 온 2종은 서버 우선순위(저기여 → 기여·이해도 괴리 → 단계 하락 → 지속 저점)에서
  단계 하락보다 **앞**이라 그보다 약하게 읽히면 안 된다 — 둘 다 warning으로 둔다.
*/
const VARIANT: Record<RoundBadgeKind, 'success' | 'warning' | 'danger' | 'neutral'> = {
  STAGE_DECLINE: 'warning',
  PERSISTENT_LOW: 'danger',
  ACE: 'success',
  NOT_ATTENDED: 'neutral',
  INVALID_ATTEMPT: 'danger',
  SESSION_INCOMPLETE: 'neutral',
  LOW_PARTICIPATION: 'warning',
  CONTRIBUTION_UNDERSTANDING_GAP: 'warning',
}

/** 이번 회차 배지 — 서버가 고른 단일 코드 하나. 걸린 것이 없으면(정상) 배지 없이 "—" */
export function RoundBadge({ kind }: { kind: RoundBadgeKind | null }) {
  /*
    서버가 코드를 늘려도 화면이 죽지 않는다 — 모르는 코드는 코드 그대로 그리고
    중립으로 둔다. 목록 한 줄이 비는 것보다 낫고, 눈에 띄어 요청서로 이어진다.
  */
  if (!kind) return <span className="text-fg-subtle">—</span>
  return <Badge variant={VARIANT[kind] ?? 'neutral'}>{LABEL[kind] ?? kind}</Badge>
}
