import { RoundBadge } from './RoundBadge'
import type { RoundBadgeKind } from '../mockData'

/*
  ① 상태 배지 — 위험 2종(단계 하락·지속 저점)일 때만. 이모지 카드·서술형 문구·
  "면담 시작" 버튼은 버렸다(MG-06 §3, §7) — 이 화면은 조회 전용이라 액션이 없고,
  에이스 배지는 명부(MG-05) 소관이라 여기 안 그린다. 남은 건 RoundBadge와 같은
  배지를 헤더에서도 쓴다는 것뿐이라 얇다.
*/
export function SignalHero({
  kind,
}: {
  kind: Extract<RoundBadgeKind, 'DECLINE' | 'LOW_PERSISTENT'> | null
}) {
  if (!kind) return null
  return <RoundBadge kind={kind} />
}
