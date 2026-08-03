import type { RoundBadgeKind, RoundRecord } from '../mockData'

/*
  도달 단계(0~4단) 표현 — TraineeListScreen(MG-05)과 TraineeDetailScreen(MG-06)이
  같은 스케일·같은 배지 판정을 쓴다(MG-06 §3 "표기는 MG-05와 같다"). 두 화면이
  각자 이 로직을 베끼면 회차 데이터 갱신 시 하나만 고쳐 어긋난다 — 여기 하나만 둔다.
*/

/** 도달 단계 배경색(0~4단) — 0·4단은 배경이 진해 흰 글자 */
export const REACH_STYLE: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'bg-reach-0 text-white',
  1: 'bg-reach-1 text-reach-fg',
  2: 'bg-reach-2 text-reach-fg',
  3: 'bg-reach-3 text-reach-fg',
  4: 'bg-reach-4 text-white',
}

/** 문항 없음(코드에 그 개념이 없어 못 물었다) 해치 무늬 — 회색 두 톤 반복 대각선 */
export const NA_PATTERN = {
  background:
    'repeating-linear-gradient(45deg, var(--color-reach-na-bg), var(--color-reach-na-bg) 4px, var(--color-border) 4px, var(--color-border) 8px)',
}

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
