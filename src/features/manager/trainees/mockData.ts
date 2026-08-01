/*
  MG-05 교육생 명부 목업. API 연동 전까지 화면을 검증하기 위한 고정 배열이다.
  실 데이터가 붙으면 이 파일은 지운다.

  MG-06(교육생 상세)이 쓰던 축 점수·세션·개입 카드 데이터는 여기 없다 — v2 상세는
  타임라인 하나로 재설계되어(구조가 다름) 이 목록 전용 목업과 같이 두지 않는다.
  features-v1/trainees/mockData.ts에는 아직 남아있다(MG-06 이식 전까지).
*/
export type AccountStatus = 'ACTIVE' | 'INVITED' | 'INACTIVE'

export type RoundId = '1' | '2' | '3'

export const ROUND_OPTIONS: { value: RoundId; label: string }[] = [
  { value: '1', label: '미프 1차' },
  { value: '2', label: '미프 2차' },
  { value: '3', label: '미프 3차' },
]

/** 그 회차의 검증 개념 3건 — 회차마다 다르다(MG-02). 히트맵의 같은 순서와 맞는다 */
export const ROUND_CONCEPTS: Record<RoundId, [string, string, string]> = {
  '1': ['인증 흐름', 'API 설계', '에러 처리'],
  '2': ['상태 관리', 'API 설계', '테스트 전략'],
  '3': ['HITL Trigger', 'Graph 구성', 'State 관리'],
}

/** 개념 도달 단계(0~4). null = ▨ 문항 없음(코드에 그 개념이 없어 못 물었다, MG-02) */
export type ConceptLevel = 0 | 1 | 2 | 3 | 4 | null

export type RoundBadgeKind = 'DECLINE' | 'LOW_PERSISTENT' | 'ACE' | 'ABSENT' | 'INVALID' | 'DROPPED'

/** 응시상태 3종(14-1: 미응시·무효 응시·중단)은 원인·처방이 달라 값을 나눈다 */
export type RoundRecord =
  | {
      status: 'ATTENDED'
      levels: [ConceptLevel, ConceptLevel, ConceptLevel]
      /** 위험 유형(9-2) 또는 우수(9-3). 없으면 일반 */
      badge?: 'DECLINE' | 'LOW_PERSISTENT' | 'ACE'
    }
  | { status: 'ABSENT' }
  | { status: 'INVALID' }
  | { status: 'DROPPED'; note: string }

export type TraineeRow = {
  id: string
  name: string
  email: string
  className: string
  accountStatus: AccountStatus
  /** 비활성 사유·일자. INACTIVE일 때만 값이 있다 */
  inactiveReason?: string
  inactiveAt?: string
  /** 회차별 응시·도달 기록. 그 회차 키가 없으면 "아직 없음"(초대 대기 등 데이터 자체가 없는 경우) */
  rounds?: Partial<Record<RoundId, RoundRecord>>
}

export const TRAINEES: TraineeRow[] = [
  {
    id: 't-1',
    name: '강민준',
    email: 'minjun@ex.com',
    className: 'A반',
    accountStatus: 'ACTIVE',
    rounds: {
      '1': { status: 'ATTENDED', levels: [3, 3, 4] },
      '2': { status: 'ATTENDED', levels: [4, 3, 4] },
      '3': { status: 'ATTENDED', levels: [3, 4, 3] },
    },
  },
  {
    id: 't-2',
    name: '김서연',
    email: 'seoyeon@ex.com',
    className: 'A반',
    accountStatus: 'ACTIVE',
    rounds: {
      '1': { status: 'ATTENDED', levels: [4, 4, 3], badge: 'ACE' },
      '2': { status: 'ATTENDED', levels: [4, 3, 4], badge: 'ACE' },
      '3': { status: 'ATTENDED', levels: [4, 4, 4], badge: 'ACE' },
    },
  },
  { id: 't-3', name: '서지우', email: 'jiwoo@ex.com', className: 'B반', accountStatus: 'INVITED' },
  {
    id: 't-4',
    name: '한도현',
    email: 'dohyun@ex.com',
    className: 'A반',
    accountStatus: 'ACTIVE',
    rounds: {
      '1': { status: 'ATTENDED', levels: [3, 2, 4] },
      '2': { status: 'ATTENDED', levels: [2, 3, 3] },
      '3': { status: 'ABSENT' },
    },
  },
  {
    id: 't-5',
    name: '오세훈',
    email: 'sehun@ex.com',
    className: 'C반',
    accountStatus: 'INACTIVE',
    inactiveReason: '이탈',
    inactiveAt: '08.02',
    rounds: {
      '1': { status: 'ATTENDED', levels: [2, 1, 3] },
      '2': { status: 'ATTENDED', levels: [3, 2, 2] },
      '3': { status: 'DROPPED', note: '세션 중단 · 07-14' },
    },
  },
  {
    id: 't-6',
    name: '이하은',
    email: 'haeun@ex.com',
    className: 'B반',
    accountStatus: 'ACTIVE',
    rounds: {
      '1': { status: 'ATTENDED', levels: [4, 4, 3], badge: 'ACE' },
      '2': { status: 'ATTENDED', levels: [3, 3, 4] },
      '3': { status: 'ATTENDED', levels: [2, 1, 2], badge: 'LOW_PERSISTENT' },
    },
  },
  {
    id: 't-7',
    name: '박지민',
    email: 'jimin@ex.com',
    className: 'C반',
    accountStatus: 'ACTIVE',
    rounds: {
      '1': { status: 'ATTENDED', levels: [3, 3, 3] },
      '2': { status: 'ATTENDED', levels: [4, 3, 3] },
      '3': { status: 'ATTENDED', levels: [0, 1, 3], badge: 'DECLINE' },
    },
  },
  {
    id: 't-8',
    name: '최윤서',
    email: 'yoonseo@ex.com',
    className: 'B반',
    accountStatus: 'ACTIVE',
    rounds: {
      '1': { status: 'ATTENDED', levels: [3, 3, 3] },
      '2': { status: 'ATTENDED', levels: [3, 4, 3] },
      '3': { status: 'INVALID' },
    },
  },
  { id: 't-9', name: '정우진', email: 'woojin@ex.com', className: 'A반', accountStatus: 'INVITED' },
  {
    id: 't-10',
    name: '신아린',
    email: 'arin@ex.com',
    className: 'C반',
    accountStatus: 'INACTIVE',
    inactiveReason: '휴식',
    inactiveAt: '07.20',
  },
  {
    id: 't-11',
    name: '윤도윤',
    email: 'doyoon@ex.com',
    className: 'B반',
    accountStatus: 'ACTIVE',
    rounds: {
      '1': { status: 'ATTENDED', levels: [3, 3, 3] },
      '2': { status: 'ATTENDED', levels: [3, 3, 4] },
      '3': { status: 'ATTENDED', levels: [4, 3, 3] },
    },
  },
  {
    id: 't-12',
    name: '임서준',
    email: 'seojun@ex.com',
    className: 'C반',
    accountStatus: 'ACTIVE',
    rounds: {
      '1': { status: 'ATTENDED', levels: [3, 3, 3] },
      '2': { status: 'ATTENDED', levels: [4, 4, 3] },
      '3': { status: 'ATTENDED', levels: [3, null, 4] },
    },
  },
]

/** 2단 이하 개수. 3(그 회차 검증 개념 수)은 고정 분모라 셀 수와 별개로 저장하지 않는다 */
export function countLowLevels(levels: ConceptLevel[]): number {
  return levels.filter((l) => l !== null && l <= 2).length
}

/** 우수 누적 — 회차 배지에서 파생한다(개념 아님, MG-05 §3). 이중 저장하지 않는다 */
export function aceSummary(trainee: TraineeRow): { count: number; rounds: RoundId[] } {
  const rounds = (Object.entries(trainee.rounds ?? {}) as [RoundId, RoundRecord][])
    .filter(([, r]) => r.status === 'ATTENDED' && r.badge === 'ACE')
    .map(([id]) => id)
    .sort((a, b) => Number(a) - Number(b))
  return { count: rounds.length, rounds }
}
