/*
  DASH-17 교육생 리스트 목업. API 연동 전까지 화면을 검증하기 위한 고정 배열이다.
  실 데이터가 붙으면 이 파일은 지운다.

  이슈 #45(MG-05 v2)로 D104의 "회차·측정 정보 없음" 판단이 뒤집혔다 — v1은 상세가
  통로였지만 v2 상세(MG-06)는 타임라인 하나로 얇아져 명부가 회차별 개념 도달·이번
  회차 배지·우수 누적을 직접 진다. 팀·제출 현황은 여전히 여기 없다(MG-08 소관).
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

/*
  SC-M06 개별 상세 목업. 화면 정의서(§4)는 5축(자기수정 포함)을 명시하지만,
  이슈 #40 "하지 않는 것"에 따라 이번 배치는 4축(자기수정 제외)만 다룬다.
  AxisTable·FocusAxisChart 등 축을 참조하는 모든 컴포넌트가 이 4축 기준을 따른다.
*/
export type AxisKey = 'understanding' | 'design' | 'alternatives' | 'counterargument'

export const AXIS_ORDER: AxisKey[] = ['understanding', 'design', 'alternatives', 'counterargument']

export const AXIS_LABELS: Record<AxisKey, string> = {
  understanding: '코드이해',
  design: '설계논리',
  alternatives: '대안비교',
  counterargument: '반례대응',
}

/** 결측 회차는 null — 스파크라인·추이 차트 모두 보간 없이 끊는다(T-2, D-2) */
export type AxisPoint = number | null

export type AxisData = {
  score: number
  /** 직전 회차 대비. 표본 부족(회차<2)이면 null → "—"(B4) */
  delta: number | null
  cohortAvg: number | null
  /** index 0 = 1회차 */
  history: AxisPoint[]
  highlight?: 'bad' | 'good'
}

export type SessionTurn = {
  question: string
  answer: string
  evidenceNote: string
}

export type SessionDataPoint = {
  id: string
  topic: string
  ref: string
  depthReached: ('L1' | 'L2' | 'L3')[]
  brokeAt?: 'L1' | 'L2' | 'L3'
  understanding: 'solid' | 'partial' | 'surface'
  turn?: SessionTurn
}

export type SessionRound = {
  round: number
  questionBudget: number
  durationMin: number
  dataPoints: SessionDataPoint[]
}

/**
 * 면담·관찰 기록 카드. 스코프 축소: 멘토링 유형 제외(이슈 #40) — 정의서엔
 * 면담/멘토링/관찰이 있으나 여긴 면담/관찰만 다룬다. "일반 메모"라는 별도 개념은
 * 없다 — 시그널과 무관한 관찰도 그냥 관찰 카드 하나로 같은 목록에 들어간다.
 */
export type RecordKind = '면담' | '관찰'

export type RecordCard = {
  id: string
  kind: RecordKind
  content: string
  author: string
  /** 관찰은 작성일 하나만 쓴다 */
  startedAt: string
  /**
   * 정렬 전용 ISO 날짜(YYYY-MM-DD). startedAt은 "MM.DD" 형식이라 연도가 없어
   * 문자열 비교만으로 정렬하면 연말·연초 기록의 순서가 뒤집힌다.
   */
  sortAt: string
  /** 면담이 완료됐을 때만 */
  endedAt?: string
  /** 면담에만 존재 — 관찰엔 진행/완료 구분이 없다 */
  status?: 'progress' | 'done'
  /** 근거 시그널 — 면담이 시그널에서 시작된 경우만, 없으면 생략 */
  basisNote?: string
  /** 완료 후 판정된 효과. 있으면 표시 */
  effect?: string
  /** 마지막 수정일(표시용, "MM.DD"). 있으면 카드에 "(수정됨) MM.DD"가 붙는다 */
  editedAt?: string
}

export type TraineeDetail = {
  id: string
  name: string
  cohort: string
  className: string
  accountStatus: AccountStatus
  /** 참여 프로젝트(팀은 프로젝트 종속값이라 단수로 두지 않는다·D105) */
  projects: { name: string; team: string }[]
  round: number
  /** ① 상태 배지 — 위험/에이스일 때만. 일반은 null(렌더 자체 생략) */
  signal: 'risk' | 'ace' | null
  signalHeadline?: string
  signalSub?: string
  /** ③ 포커스 축 그래프 대상 — ①이 있을 때만 */
  focusAxis?: AxisKey
  /** ② 데이터 신뢰도 경고 — 문제 있을 때만(G-4 등) */
  confidenceWarning?: string
  /** ⑤ 세션 참여 팩트 — 모든 학생 항상 */
  sessionFact: { attended: boolean; lastSessionAt: string; durationMin: number }
  /** ⑥ 5축 통합표 — 모든 학생 항상, 유일한 5축(여긴 4축) 정보원 */
  axes: Record<AxisKey, AxisData>
  /** 5축 표 헤더 옆 요약 문구(선택) */
  axisHeadNote?: { text: string; tone: 'success' | 'danger' | 'neutral' }
  /** ⑦ 귀속 신호 카드 — 편차·저조·지속 3조건 동시 충족 시만(B5) */
  attribution?: {
    project: string
    team: string
    rawLines: string
    rawFiles: string
  } | null
  sessions: SessionRound[]
  records: RecordCard[]
}

const KANG_MINJUN: TraineeDetail = {
  id: 't-1',
  name: '강민준',
  cohort: '7기',
  className: 'A반',
  accountStatus: 'ACTIVE',
  projects: [
    { name: 'MSA 배포 실습', team: '팀A' },
    { name: 'API 서버', team: '팀C' },
  ],
  round: 2,
  signal: 'risk',
  signalHeadline: '반례대응이 2점으로 2회 연속 하락(4 → 2), 기수 평균 3.4보다 1.4점 낮습니다.',
  signalSub:
    '실패 케이스·엣지 대응이 약해지는 중. 다른 축은 상승세라 국소적 취약. 지금 면담 검토 권장(DASH-05 즉시).',
  focusAxis: 'counterargument',
  confidenceWarning: '커밋 이메일 미검증(AUTH-07) — 기여 관련 수치는 확정 전 검증 필요',
  sessionFact: { attended: true, lastSessionAt: '04.18', durationMin: 14 },
  axes: {
    understanding: { score: 4, delta: 0, cohortAvg: 3.4, history: [4, 4] },
    design: { score: 5, delta: 1, cohortAvg: 3.6, history: [4, 5] },
    alternatives: { score: 4, delta: 1, cohortAvg: 3.6, history: [3, 4] },
    counterargument: {
      score: 2,
      delta: -2,
      cohortAvg: 3.4,
      history: [4, 2],
      highlight: 'bad',
    },
  },
  attribution: {
    project: 'MSA 배포 실습',
    team: '팀A',
    rawLines: '실질 변경 라인 142(팀 평균 310)',
    rawFiles: '변경 파일 6(팀 평균 11) · 커밋 막판 집중, 자동생성·포맷팅 제외',
  },
  sessions: [
    {
      round: 1,
      questionBudget: 4,
      durationMin: 12,
      dataPoints: [
        {
          id: 's1-1',
          topic: '토큰 발급 기본 흐름',
          ref: 'auth/token.py:8',
          depthReached: ['L1', 'L2'],
          understanding: 'solid',
        },
        {
          id: 's1-2',
          topic: '비밀번호 해시 저장',
          ref: 'auth/user.py:14',
          depthReached: ['L1'],
          understanding: 'partial',
        },
      ],
    },
    {
      round: 2,
      questionBudget: 4,
      durationMin: 14,
      dataPoints: [
        {
          id: 's2-1',
          topic: '토큰 만료 예외 처리',
          ref: 'auth/token.py:20',
          depthReached: ['L1', 'L2', 'L3'],
          understanding: 'solid',
        },
        {
          id: 's2-2',
          topic: '인증 방식 대안 비교 (401 vs 미들웨어)',
          ref: 'auth/token.py:20-22',
          depthReached: ['L1', 'L2'],
          brokeAt: 'L2',
          understanding: 'surface',
          turn: {
            question: 'L2 — 401 반환 vs 미들웨어 일괄 처리, 트레이드오프는?',
            answer:
              '미들웨어가 더 편할 것 같은데 이유는 잘 모르겠어요. 그냥 한 군데서 처리하니까요.',
            evidenceNote:
              '대안비교 축 근거 · 원본 인용 · L2에서 근거 없이 표면적이라 여기서 중단(L3 미도달) · 취약 유형: 트레이드오프 미인지',
          },
        },
        {
          id: 's2-3',
          topic: 'DB 조회 실패 처리',
          ref: 'auth/token.py:21',
          depthReached: ['L1', 'L2'],
          understanding: 'partial',
        },
        {
          id: 's2-4',
          topic: '동시 요청·토큰 재사용',
          ref: 'auth/token.py:19',
          depthReached: ['L1', 'L2'],
          understanding: 'solid',
        },
      ],
    },
  ],
  records: [
    {
      id: 'r-1',
      kind: '면담',
      status: 'progress',
      startedAt: '04.12',
      sortAt: '2026-04-12',
      author: '박지현',
      basisNote: '위험 · 반례대응 4→2 (2회차)',
      content:
        '예외 처리 개념을 어려워함. 학습 페이스는 버겁지 않다고 하나, 막힐 때 질문을 잘 안 하는 편. 다음 회차 전 예외 처리 교안 함께 보기로.',
    },
    {
      id: 'r-2',
      kind: '관찰',
      startedAt: '03.28',
      sortAt: '2026-03-28',
      editedAt: '04.02',
      author: '박지현',
      content: '최근 커밋이 마감에 몰림. 번아웃 조짐은 아직 없어 보임.',
    },
  ],
}

const KIM_SEOYEON: TraineeDetail = {
  id: 't-2',
  name: '김서연',
  cohort: '7기',
  className: 'A반',
  accountStatus: 'ACTIVE',
  projects: [{ name: 'MSA 배포 실습', team: '팀A' }],
  round: 2,
  signal: 'ace',
  signalHeadline:
    '대안비교가 5점 만점 · 2회 연속 기수 최상위권입니다(기수 평균 3.6보다 1.4점 높음).',
  signalSub:
    '근거를 스스로 제시하는 설명력이 뛰어남. 다른 축도 전반 상위. 멘토 후보로 검토할 만함(DASH-12 · 자동 배치 아님).',
  focusAxis: 'alternatives',
  sessionFact: { attended: true, lastSessionAt: '04.17', durationMin: 11 },
  axes: {
    understanding: { score: 5, delta: 1, cohortAvg: 3.4, history: [4, 5] },
    design: { score: 5, delta: 0, cohortAvg: 3.6, history: [5, 5] },
    alternatives: {
      score: 5,
      delta: 1,
      cohortAvg: 3.6,
      history: [4, 5],
      highlight: 'good',
    },
    counterargument: { score: 4, delta: 1, cohortAvg: 3.4, history: [3, 4] },
  },
  axisHeadNote: { text: '전 축 기수 평균 이상', tone: 'success' },
  attribution: null,
  sessions: [
    {
      round: 2,
      questionBudget: 4,
      durationMin: 11,
      dataPoints: [
        {
          id: 'k2-1',
          topic: '캐시 무효화 전략 비교',
          ref: 'cache/invalidate.py:10',
          depthReached: ['L1', 'L2', 'L3'],
          understanding: 'solid',
        },
        {
          id: 'k2-2',
          topic: '분산 락 대안 비교',
          ref: 'lock/redis.py:5',
          depthReached: ['L1', 'L2', 'L3'],
          understanding: 'solid',
        },
      ],
    },
  ],
  records: [
    {
      id: 'r-1',
      kind: '관찰',
      startedAt: '04.05',
      sortAt: '2026-04-05',
      author: '박지현',
      content: '팀 내 리뷰를 자발적으로 이끎. 멘토 후보로 계속 관찰.',
    },
  ],
}

const LEE_HAEUN: TraineeDetail = {
  id: 't-6',
  name: '이하은',
  cohort: '7기',
  className: 'B반',
  accountStatus: 'ACTIVE',
  projects: [{ name: 'MSA 배포 실습', team: '팀A' }],
  round: 2,
  signal: null,
  sessionFact: { attended: true, lastSessionAt: '04.16', durationMin: 15 },
  axes: {
    understanding: { score: 4, delta: 0, cohortAvg: 3.4, history: [4, 4] },
    design: { score: 4, delta: 0, cohortAvg: 3.6, history: [4, 4] },
    alternatives: { score: 3, delta: 0, cohortAvg: 3.6, history: [3, 3] },
    counterargument: { score: 4, delta: 0, cohortAvg: 3.4, history: [4, 4] },
  },
  axisHeadNote: { text: '전 축 평균 ±0.6 이내', tone: 'neutral' },
  attribution: null,
  sessions: [
    {
      round: 2,
      questionBudget: 4,
      durationMin: 15,
      dataPoints: [
        {
          id: 'l2-1',
          topic: '입력값 검증 위치',
          ref: 'validate/input.py:7',
          depthReached: ['L1', 'L2'],
          understanding: 'partial',
        },
      ],
    },
  ],
  records: [],
}

const TRAINEE_DETAILS: Record<string, TraineeDetail> = {
  't-1': KANG_MINJUN,
  't-2': KIM_SEOYEON,
  't-6': LEE_HAEUN,
}

/**
 * 3예시(위험·에이스·일반) 외 나머지 교육생은 리스트 행 데이터로부터 "일반" 상태의
 * 기본 상세를 만든다 — 실 연동 전까지 어떤 id를 눌러도 상세가 뜨게 하기 위함이다.
 */
export function getTraineeDetail(id: string): TraineeDetail | undefined {
  const preset = TRAINEE_DETAILS[id]
  if (preset) return preset

  const row = TRAINEES.find((t) => t.id === id)
  if (!row) return undefined

  return {
    id: row.id,
    name: row.name,
    cohort: '7기',
    className: row.className,
    accountStatus: row.accountStatus,
    projects: [],
    round: 1,
    signal: null,
    sessionFact: { attended: false, lastSessionAt: '—', durationMin: 0 },
    axes: {
      understanding: { score: 3, delta: null, cohortAvg: 3.4, history: [3] },
      design: { score: 3, delta: null, cohortAvg: 3.6, history: [3] },
      alternatives: { score: 3, delta: null, cohortAvg: 3.6, history: [3] },
      counterargument: { score: 3, delta: null, cohortAvg: 3.4, history: [3] },
    },
    attribution: null,
    sessions: [],
    records: [],
  }
}
