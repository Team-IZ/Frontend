import type { RoundBadgeKind, RoundRecord } from '../mockData'

/*
  도달 단계(0~4단) 표현 — TraineeListScreen(MG-05)과 TraineeDetailScreen(MG-06)이
  같은 스케일·같은 배지 판정을 쓴다(MG-06 §3 "표기는 MG-05와 같다"). 두 화면이
  각자 이 로직을 베끼면 회차 데이터 갱신 시 하나만 고쳐 어긋난다 — 여기 하나만 둔다.

  ⚠ `REACH_STYLE`·`NA_PATTERN`은 `@/components/common/reach`로 승격했다(세 번째
  도메인인 heatmap이 필요해지면서, 그 파일 머리말 참고) — 여기서는 재수출만 한다.
  이 파일에 남은 `roundBadgeKind`·`riskBadgeKind`는 `RoundRecord`(도메인 타입)에
  의존해서 공용으로 못 올린다.
*/
export { REACH_STYLE, NA_PATTERN } from '@/components/common/reach'

/** 그 회차 배지 종류 — 응시상태 3종은 record.status를, ATTENDED는 record.badge를 그대로 쓴다 */
export function roundBadgeKind(record: RoundRecord | undefined): RoundBadgeKind | null {
  if (!record) return null
  if (record.status !== 'ATTENDED') return record.status
  return record.badge ?? null
}

/**
 * 위험 2종(단계 하락·지속 저점)만 남긴다 — 우수·응시상태 3종은 명부(MG-05) 소관이라
 * MG-06 헤더·회차 줄 어디에도 그리지 않는다(MG-06 §7 "에이스 배지는 명부에 있다").
 */
export function riskBadgeKind(
  record: RoundRecord | undefined,
): Extract<RoundBadgeKind, 'DECLINE' | 'LOW_PERSISTENT'> | null {
  const kind = roundBadgeKind(record)
  return kind === 'DECLINE' || kind === 'LOW_PERSISTENT' ? kind : null
}
