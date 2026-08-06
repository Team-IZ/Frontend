import Badge from '@/components/ui/Badge'
import { RISK_LABEL, type CaseRisk } from '../mockData'

/*
  목업 `.rbadge.void`·`.rbadge.low`(둘 다 danger) · `.rbadge.down`(warning) ·
  `.rbadge.obs`(neutral, 1차 전용 "관찰")를 그대로 옮긴다. `무효 응시`·`지속 저점`이
  같은 색인 이유는 목업 자체가 그렇다 — 둘 다 "결과를 못 믿는다"는 뜻의 급함이다.
  라벨은 `mockData.ts`의 `RISK_LABEL`이 원천이다 — `InterviewFilters`(필터 옵션)와
  같은 값을 쓴다.
*/
const VARIANT: Record<CaseRisk['type'], 'danger' | 'warning' | 'neutral'> = {
  INVALID: 'danger',
  LOW_PERSISTENT: 'danger',
  DECLINE: 'warning',
  OBSERVE: 'neutral',
}

export default function RiskBadge({ risk }: { risk: CaseRisk }) {
  return <Badge variant={VARIANT[risk.type]}>{RISK_LABEL[risk.type]}</Badge>
}

/** 판정 근거 열 — 위험 유형마다 문구가 다르다(정의서 §3 뷰, 숫자만 굵게) */
export function RiskReason({ risk, voidResolved }: { risk: CaseRisk; voidResolved: boolean }) {
  if (risk.type === 'INVALID') {
    return <span className="text-fg-subtle">{voidResolved ? '— 확인 완료' : '— 채점 전'}</span>
  }
  if (risk.type === 'LOW_PERSISTENT') {
    return (
      <span className="text-fg-muted tabular-nums">
        2단 이하 <b className="text-fg font-bold">{risk.lowCount}</b> · {risk.streak}회 연속
      </span>
    )
  }
  if (risk.type === 'DECLINE') {
    return (
      <span className="text-fg-muted tabular-nums">
        2단 이하 <b className="text-fg font-bold">{risk.from}</b> →{' '}
        <b className="text-fg font-bold">{risk.to}</b>
      </span>
    )
  }
  return (
    <span className="text-fg-muted tabular-nums">
      2단 이하 <b className="text-fg font-bold">{risk.lowCount}</b>
    </span>
  )
}
