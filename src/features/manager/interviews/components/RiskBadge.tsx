import Badge from '@/components/ui/Badge'
import type { InterviewCase, RiskType } from '../_/api/types'

/*
  목업 `.rbadge.void`·`.rbadge.low`(둘 다 danger) · `.rbadge.down`(warning) ·
  `.rbadge.obs`(neutral, 1차 전용 "관찰")를 그대로 옮긴다. `무효 응시`·`지속 저점`이
  같은 색인 이유는 목업 자체가 그렇다 — 둘 다 "결과를 못 믿는다"는 뜻의 급함이다.

  **값은 서버가 준다** — 목이 지은 이름이 그대로 왔다(30차 대조). `OBSERVE`는 스펙
  값 목록에는 없는데 `riskCounts`에는 키로 있어서 살려 뒀다.
*/
const LABEL: Record<string, string> = {
  INVALID: '무효 응시',
  LOW_PERSISTENT: '지속 저점',
  DECLINE: '단계 하락',
  OBSERVE: '관찰',
}

const VARIANT: Record<string, 'danger' | 'warning' | 'neutral'> = {
  INVALID: 'danger',
  LOW_PERSISTENT: 'danger',
  DECLINE: 'warning',
  OBSERVE: 'neutral',
}

/** 모르는 코드가 와도 죽지 않는다 — 코드를 그대로 그리고 중립으로 둔다 */
export default function RiskBadge({ riskType }: { riskType: RiskType }) {
  return <Badge variant={VARIANT[riskType] ?? 'neutral'}>{LABEL[riskType] ?? riskType}</Badge>
}

/**
 * 판정 근거 열 — **서버가 만든 문장을 그대로 그린다**(`riskSummary`).
 *
 * 목은 `{ lowCount, streak }` 같은 숫자를 받아 화면이 `2단 이하 3 · 2회 연속`을
 * 조립했는데, 서버가 완성된 문장을 준다. 화면이 다시 조립하면 같은 규칙이 두 곳에
 * 생기고, 위험 유형이 늘 때마다 화면이 따라가야 한다(api-boundary §1-②).
 *
 * 무효 응시만 예외다 — 확인을 마쳤는지가 문장이 아니라 **상태**라서 여기서 가른다.
 */
export function RiskReason({ caseItem: c }: { caseItem: InterviewCase }) {
  if (c.riskType === 'INVALID') {
    return <span className="text-fg-subtle">{c.voidConfirmed ? '— 확인 완료' : '— 채점 전'}</span>
  }
  return <span className="text-fg-muted tabular-nums">{c.riskSummary}</span>
}
