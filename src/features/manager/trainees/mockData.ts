/*
  MG-05 교육생 명부 목업. API 연동 전까지 화면을 검증하기 위한 고정 배열이다.
  실 데이터가 붙으면 이 파일은 지운다.

  MG-06(교육생 상세, 이슈 #47) 타임라인 데이터가 아래 이어붙었다 — 회차 격자는 위
  TraineeRow.rounds가 유일한 정보원이고, 그 사이에 있었던 사건(세션·재응시·
  리포트 발행·면담)만 TraineeDetailOverlay로 따로 둔다(같은 값을 두 번 두지 않는다).
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

  /*
   * MG-04(면담 브리프) 세션에서 추가 — `features/manager/interviews/mockData.ts`가
   * 쓰는 `traineeId`(t-kim-minjun 등, 이 파일과 독립적으로 만들어진 값)가 위 t-1~
   * t-12 어디에도 없어 "전체 이력"·이름 클릭이 전부 D-1(조회 권한 없음) 화면으로
   * 막히던 문제를 사용자 확인 후 고쳤다. 기존 12명은 손대지 않고, 면담 화면이
   * 실제로 참조하는 9명만 **같은 id·이름**으로 새로 추가한다 — 두 화면이 이제
   * 같은 사람을 가리킨다. `rounds`·타임라인 오버레이는 채우지 않았다(면담 목업이
   * 요구하는 범위 밖 — `getTraineeDetailOverlay`가 오버레이 없는 id는 빈 타임라인
   * "아직 응시한 회차가 없습니다"로 이미 정상 처리한다, §6).
   */
  {
    id: 't-lee-seojun',
    name: '이서준',
    email: 'seojun.lee@ex.com',
    className: 'A반',
    accountStatus: 'ACTIVE',
  },
  {
    id: 't-choi-yuna',
    name: '최유나',
    email: 'yuna@ex.com',
    className: 'C반',
    accountStatus: 'ACTIVE',
  },
  {
    id: 't-kim-minjun',
    name: '김민준',
    email: 'minjun.kim@ex.com',
    className: 'A반',
    accountStatus: 'ACTIVE',
  },
  {
    id: 't-oh-serim',
    name: '오세림',
    email: 'serim@ex.com',
    className: 'C반',
    accountStatus: 'ACTIVE',
  },
  {
    id: 't-han-jiwoo',
    name: '한지우',
    email: 'jiwoo.han@ex.com',
    className: 'B반',
    accountStatus: 'ACTIVE',
  },
  {
    id: 't-park-dohyun',
    name: '박도현',
    email: 'dohyun.park@ex.com',
    className: 'B반',
    accountStatus: 'ACTIVE',
  },
  {
    id: 't-kang-yunseo',
    name: '강윤서',
    email: 'yunseo@ex.com',
    className: 'B반',
    accountStatus: 'ACTIVE',
  },
  {
    id: 't-jung-haneul',
    name: '정하늘',
    email: 'haneul@ex.com',
    className: 'A반',
    accountStatus: 'ACTIVE',
  },
  {
    id: 't-seo-jihun',
    name: '서지훈',
    email: 'jihun@ex.com',
    className: 'C반',
    accountStatus: 'ACTIVE',
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

/*
  이슈 #47(MG-06 v2)로 SC-M06의 3탭(종합·세션·면담) + 5축 점수 모델을 전면 폐기하고
  단일 타임라인으로 바꾼다. 점수·축·세션 질답 전문은 없다(정의서 §7 "v1에서 버린
  것") — 회차 격자는 위 TraineeRow.rounds를 그대로 재사용하고(같은 값을 두 번 두지
  않는다), 아래는 그 사이에 있었던 사건(세션·재응시·리포트 발행·면담)만 다룬다.
*/

export type TimelineEventBase = { id: string; sortAt: string; dateLabel: string }

/**
 * 세션 이벤트 — 개념별 근거 한 줄. 축별 도달/미달은 만들지 않는다(§4 "1단이면
 * 나머지가 자동으로 결정된다"). 도달 단계 자체는 그 회차 TraineeRow.rounds[roundId]
 * .levels에서 그대로 가져온다 — 세션이 그 값을 만든 사건이니 중복 저장하지 않는다.
 */
export type SessionEvent = TimelineEventBase & {
  kind: 'SESSION'
  roundId: RoundId
  /** ROUND_CONCEPTS[roundId]와 같은 순서(3개). null = 그 개념은 이 세션이 다루지 않음(레벨도 ―) */
  evidences: ({ hint?: string; note: string } | null)[]
}

/** 재응시 — 도달이 바뀐 사건(changed)이거나 창이 미응시로 닫힌 사건(closed) */
export type RetryEvent = TimelineEventBase & {
  kind: 'RETRY'
  label: string
  changed: boolean
  closed: boolean
  tag?: string
}

/** 리포트 발행 — 재응시 창의 기산점(발행 +3일). 몇 건 지정됐는지만 본다 */
export type ReportEvent = TimelineEventBase & { kind: 'REPORT'; detail: string }

/**
 * 면담 — 기록 3칸(무엇 때문/어디로/다음에 할 것), 읽기 전용(§8 "면담 기록 작성은
 * MG-04"). recorded:false는 브리프에서 저장하지 않은 경우 — "기록 없음"(§6).
 * nextAction.confirmedAt 없음 = ⚠ 약속 미확인. 확인 처리 액션은 없다 — 다음 면담이
 * 열리면 해소된다(§3).
 */
export type InterviewEvent = TimelineEventBase &
  (
    | {
        kind: 'INTERVIEW'
        recorded: true
        summary: string
        whatHappened: string
        whereSent: string
        nextAction: { text: string; confirmedAt?: string }
      }
    | { kind: 'INTERVIEW'; recorded: false }
  )

export type TimelineEvent = SessionEvent | RetryEvent | ReportEvent | InterviewEvent

export type TimelineRoundGroup = {
  roundId: RoundId
  /** 팀은 프로젝트(=회차)마다 재편성되는 유동값이라 사람이 아니라 회차 줄에 붙인다(§3) */
  team: string
  dateRange: string
  events: TimelineEvent[]
}

export type TraineeDetailOverlay = {
  /** 헤더 판정식 — 위험 배지가 있을 때만(§3 "헤더에 남는 것: 이름·위험 배지·판정식") */
  signalWhy?: string
  /** 최신 회차가 배열 앞. 회차가 늘면 오래된 쪽부터 접는다(§4) */
  timeline: TimelineRoundGroup[]
}

const PARK_JIMIN_OVERLAY: TraineeDetailOverlay = {
  signalWhy: '2단 이하 0개 → 2개',
  timeline: [
    {
      roundId: '3',
      team: '1팀',
      dateRange: '07.12 – 07.21',
      events: [
        {
          kind: 'SESSION',
          id: 'pjm-3-s1',
          sortAt: '2026-07-12',
          dateLabel: '07.12',
          roundId: '3',
          evidences: [
            {
              hint: '재진술 2회',
              note: '무엇을 하는 코드인지는 말했지만 왜 사람 확인을 그 자리에 뒀는지는 설명하지 못했습니다. 재진술 2회 후에도 같았어요.',
            },
            {
              hint: '재진술 1회',
              note: '노드가 있다는 것은 알았지만 순서를 정하는 이유는 말하지 못했습니다.',
            },
            {
              hint: '자력',
              note: '동시 요청이 들어오면 상태가 꼬일 수 있는 지점까지 스스로 짚었습니다.',
            },
          ],
        },
        {
          kind: 'REPORT',
          id: 'pjm-3-r1',
          sortAt: '2026-07-15',
          dateLabel: '07.15',
          detail: '재응시 2건 지정',
        },
        {
          kind: 'RETRY',
          id: 'pjm-3-t1',
          sortAt: '2026-07-18',
          dateLabel: '07.18',
          label: 'HITL Trigger 0단 → 1단',
          changed: true,
          closed: false,
        },
        {
          kind: 'RETRY',
          id: 'pjm-3-t2',
          sortAt: '2026-07-19',
          dateLabel: '07.19',
          label: 'Graph 구성 미응시',
          changed: false,
          closed: true,
          tag: '1건',
        },
        {
          kind: 'INTERVIEW',
          id: 'pjm-3-i1',
          sortAt: '2026-07-21',
          dateLabel: '07.21',
          recorded: true,
          summary: '구현 시간 부족 → 재응시 창 안내',
          whatHappened: '과제 3개가 겹쳐 미프에 쓸 시간이 부족했다고 함',
          whereSent: '재응시 창 안내 · 다음 회차 일정 확인',
          nextAction: { text: 'HITL Trigger 흐름 그려오기' },
        },
      ],
    },
    {
      roundId: '2',
      team: '3팀',
      dateRange: '06.14 – 06.22',
      events: [
        {
          kind: 'SESSION',
          id: 'pjm-2-s1',
          sortAt: '2026-06-14',
          dateLabel: '06.14',
          roundId: '2',
          evidences: [
            { hint: '자력', note: '기존 방식과 새 방식을 견주며 왜 바꿨는지까지 말했습니다.' },
            { hint: '자력', note: '엔드포인트 분리 기준을 스스로 설명했습니다.' },
            { hint: '자력', note: '실패 케이스 3개를 스스로 나열했습니다.' },
          ],
        },
        {
          kind: 'REPORT',
          id: 'pjm-2-r1',
          sortAt: '2026-06-17',
          dateLabel: '06.17',
          detail: '재응시 1건 지정',
        },
        {
          kind: 'RETRY',
          id: 'pjm-2-t1',
          sortAt: '2026-06-20',
          dateLabel: '06.20',
          label: 'Graph 구성 2단 → 3단',
          changed: true,
          closed: false,
        },
      ],
    },
    { roundId: '1', team: '2팀', dateRange: '05.16 – 05.22', events: [] },
  ],
}

const LEE_HAEUN_OVERLAY: TraineeDetailOverlay = {
  signalWhy: '2단 이하 3개 · 회복 없이 지속',
  timeline: [
    {
      roundId: '3',
      team: '1팀',
      dateRange: '07.12 – 07.26',
      events: [
        {
          kind: 'SESSION',
          id: 'lhe-3-s1',
          sortAt: '2026-07-12',
          dateLabel: '07.12',
          roundId: '3',
          evidences: [
            {
              hint: '재진술 2회',
              note: '토큰이 있다는 것은 알았지만 왜 검증 로직을 그 위치에 뒀는지 설명하지 못했습니다.',
            },
            { hint: '재진술 2회', note: '노드가 여러 개인 이유를 끝내 말하지 못했습니다.' },
            { hint: '재진술 1회', note: '동시 요청 상황은 알았지만 어디가 깨지는지는 몰랐습니다.' },
          ],
        },
        {
          kind: 'REPORT',
          id: 'lhe-3-r1',
          sortAt: '2026-07-15',
          dateLabel: '07.15',
          detail: '재응시 2건 지정',
        },
        {
          kind: 'RETRY',
          id: 'lhe-3-t1',
          sortAt: '2026-07-19',
          dateLabel: '07.19',
          label: '두 건 모두 2단 유지',
          changed: false,
          closed: false,
          tag: '변화 없음',
        },
        {
          kind: 'INTERVIEW',
          id: 'lhe-3-i1',
          sortAt: '2026-07-26',
          dateLabel: '07.26',
          recorded: true,
          summary: '설명·표현 어려움 → 리포트 다시 읽기',
          whatHappened: '아는 것 같은데 말로 설명하는 게 어렵다고 함',
          whereSent: '리포트 다시 읽기 · 다음 세션 전 재확인',
          nextAction: { text: 'HITL Trigger 흐름 그려오기', confirmedAt: '07.26' },
        },
      ],
    },
    {
      roundId: '2',
      team: '4팀',
      dateRange: '06.14 – 06.22',
      events: [
        {
          kind: 'SESSION',
          id: 'lhe-2-s1',
          sortAt: '2026-06-14',
          dateLabel: '06.14',
          roundId: '2',
          evidences: [
            { hint: '자력', note: '기본 흐름은 스스로 설명했습니다.' },
            { hint: '재진술 1회', note: '트랜잭션 경계를 정하는 기준은 반쯤 말했습니다.' },
            { hint: '자력', note: '캐시 무효화 시점을 스스로 짚었습니다.' },
          ],
        },
        {
          kind: 'INTERVIEW',
          id: 'lhe-2-i1',
          sortAt: '2026-06-22',
          dateLabel: '06.22',
          recorded: false,
        },
      ],
    },
    { roundId: '1', team: '2팀', dateRange: '05.16 – 05.22', events: [] },
  ],
}

const KANG_MINJUN_OVERLAY: TraineeDetailOverlay = {
  timeline: [
    {
      roundId: '3',
      team: '1팀',
      dateRange: '07.12 – 07.15',
      events: [
        {
          kind: 'SESSION',
          id: 'kmj-3-s1',
          sortAt: '2026-07-12',
          dateLabel: '07.12',
          roundId: '3',
          evidences: [
            { hint: '자력', note: '트리거 조건을 스스로 설명했습니다.' },
            { hint: '재진술 1회', note: '노드 순서를 정한 이유는 반쯤 말했습니다.' },
            { hint: '자력', note: '상태 충돌 시나리오를 스스로 짚었습니다.' },
          ],
        },
        {
          kind: 'REPORT',
          id: 'kmj-3-r1',
          sortAt: '2026-07-15',
          dateLabel: '07.15',
          detail: 'Graph 구성 재응시 1건 지정',
        },
      ],
    },
    { roundId: '2', team: '2팀', dateRange: '06.14 – 06.17', events: [] },
  ],
}

const TRAINEE_DETAIL_OVERLAY: Record<string, TraineeDetailOverlay> = {
  't-7': PARK_JIMIN_OVERLAY,
  't-6': LEE_HAEUN_OVERLAY,
  't-1': KANG_MINJUN_OVERLAY,
}

/**
 * 오버레이가 없는 교육생(초대 대기 등 회차 데이터 자체가 없는 경우)은 빈 타임라인 —
 * "아직 응시한 회차가 없습니다"(§6)로 표현된다. 회차 격자는 여기가 아니라 위
 * TraineeRow.rounds가 진원이다.
 */
export function getTraineeDetailOverlay(id: string): TraineeDetailOverlay {
  return TRAINEE_DETAIL_OVERLAY[id] ?? { timeline: [] }
}
