import { RoundBadge } from './RoundBadge'
import type { RoundBadgeKind } from '../_/api/types'

/*
  ① 상태 배지 — 헤더의 위험 표시. 이모지 카드·서술형 문구·"면담 시작" 버튼은
  버렸다(MG-06 §3, §7) — 이 화면은 조회 전용이라 액션이 없다.

  ⚠ **우수는 여기 안 그린다**(§7 "에이스 배지는 명부 소관"). 서버 `riskTypeCode`는
  위험 축만 담으므로 그대로 넘겨도 우수가 새어 들어오지 않는다 — 목일 때는 배지
  종류를 화면이 걸러야 했다.
*/
export function SignalHero({ kind }: { kind: RoundBadgeKind | null }) {
  if (!kind || kind === 'ACE') return null
  return <RoundBadge kind={kind} />
}
