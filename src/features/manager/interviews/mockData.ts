/*
  MG-03 면담 목록 목업. API 연동 전까지 화면을 검증하기 위한 고정 데이터 + mock API다.
  실 데이터가 붙으면 이 파일은 지운다.

  값은 목업 docs/plan/v2/wireframe/manager/interviews.html의 9개 케이스 장면(#list·
  #done·#void·#exclude·#past·#empty·#pending·#first)을 그대로 옮긴다. 위험 배지 3종
  (무효 응시·지속 저점·단계 하락)은 `features/manager/trainees/mockData.ts`의 기존
  `RoundBadgeKind`(DECLINE·LOW_PERSISTENT·ACE 등)와 뜻이 대응하지만, 이 레포에 역할
  간 mock cross-import 전례가 없어(projects/mockData.ts 머리말과 같은 이유) 값 자체는
  이 파일에 독립적으로 둔다.

  ⚠ 판단 기록 — 이 파일이 정한 것(정의서·와이어에 없음)

  · **회차를 5개로 뒀다**(`features/manager/projects/mockData.ts`가 미프 1~5차를 쓰는
    것과 같은 폭) — 와이어 9개 장면을 전부 재현하려면 최소 5개 상태가 필요하다:
    1차(관찰 배지, #first) · 2차(전부 종결·제외, #past) · 3차(진행 중, #list 기본) ·
    4차(결과 전, #pending) · 5차(대상 0명, #empty).
  · **`MOCK_TODAY = '2026-07-27'`.** 와이어 상단 경고줄 "미프 3차 면담이 6일째 안
    끝났습니다 · 7/21 리포트 발행"과 `#exclude` 장면의 "7/27 제외 · 박지현"이 같은
    오늘을 가리킨다 — 역산하면 7/21 + 6일 = 7/27. `features/manager/projects/
    mockData.ts`의 `MOCK_TODAY`(7/18)와 값이 다른데, 그 파일과 이 파일은 서로 다른
    장면을 그리는 독립된 목이라 같은 "오늘"일 이유가 없다(사용자가 실제로 두 화면을
    같은 순간에 렌더 비교하기 전까지는 맞출 필요가 없다).
  · **등재일을 케이스마다 두지 않고 회차 하나로 둔다**(`InterviewRound.publishedAt`) —
    정의서 §3 "대기는 개인별이 아니라 회차 경과다": 리포트가 회차 단위로 일괄
    발행되므로 위험 판정도 그 순간 한꺼번에 켜져 회차 안에서 전부 같은 값이다. 케이스
    마다 등재일을 반복해 두지 않는다(같은 값을 두 번 두지 않는다).
  · **정렬은 사용자가 못 고른다**(정의서 §3 "이미 급한 순으로 온다"). 그래서
    `InterviewFilters`에 실제 `Select`가 아니라 고정 문구만 둔다(E7 — 누를 수 없는
    컨트롤은 장식이니 안 그린다) — **정렬 규칙 자체는 렌더 확인 후 사용자 지시로
    한 번 바뀌었다**(아래).
  · **⚠ 정렬 규칙 2차 반영(사용자 지시, 렌더 확인 후)** — 처음엔 정의서 §3 "위험
    유형 → 2단 이하 개수"만 썼는데, 사용자가 위험 유형 필터·반 필터를 새로 추가하며
    "기본값은 상태(예정, 종결) 그다음 반 오름차순"으로 바꿔달라고 지시했다. 이제
    `sortCases`는 ① **무효 응시(9-4 "못하는 것보다 안 하는 것이 더 급하다")는
    상태·반과 무관하게 항상 최상단** — 이 원칙은 이번 지시가 부정한 적이 없고,
    위험 유형 필터로 걸러 보는 것과 별개로 "필터 없이 봐도 눈에 띄어야 한다"는
    근거가 여전히 유효해 프론트 판단으로 남겼다. ② 그다음 상태(예정·제외를 먼저,
    종결을 나중) → ③ 반 오름차순(A·B·C) → ④ 이름 가나다순(동점 결정성). 위험
    유형별 순위(`riskRank`)·2단 이하 개수 내림차순(`riskCount`)은 더는 정렬에
    안 쓰지만, **위험 유형 필터 옵션 개수 표시**에 여전히 쓰여서 남겨뒀다.
  · **무효 응시 "그대로 두기"** — 정의서 "그대로 두면 이 결과가 남습니다"를 그대로
    반영했다. 실제 채점 결과가 없어(무효라 채점 전이었으니) 위험 유형을 다시 계산할
    수 없다 — `voidEvidence`를 지워 재확인 대상에서 빼고, 판정 근거·마지막 활동을
    "확인 완료"로 바꾼다. 배지 자체("무효 응시")는 그대로 둔다 — 나중에 실제 채점이
    끝나면 그 결과가 이 케이스를 대체할 것이다(그 흐름은 이 화면 밖).
*/

export type RoundId = '1' | '2' | '3' | '4' | '5'

export const ROUND_OPTIONS: { value: RoundId; label: string }[] = [
  { value: '1', label: '미프 1차' },
  { value: '2', label: '미프 2차' },
  { value: '3', label: '미프 3차' },
  { value: '4', label: '미프 4차' },
  { value: '5', label: '미프 5차' },
]

export const ROUND_LABEL: Record<RoundId, string> = Object.fromEntries(
  ROUND_OPTIONS.map((o) => [o.value, o.label]),
) as Record<RoundId, string>

export const MOCK_TODAY = '2026-07-27'
const CURRENT_MANAGER = '박지현'

/** 담당 반 — `features/manager/projects/mockData.ts`의 담당 A·B·C반과 같은 스코프 */
export type ClassName = 'A반' | 'B반' | 'C반'
export const CLASS_OPTIONS: ClassName[] = ['A반', 'B반', 'C반']

export type InterviewCaseStatus = 'PLANNED' | 'DONE' | 'EXCLUDED'
export const STATUS_LABEL: Record<InterviewCaseStatus, string> = {
  PLANNED: '예정',
  DONE: '종결',
  EXCLUDED: '제외',
}

/** 위험 유형 3종(9-2) + 1차 전용 `관찰`(9-5 — 비교할 직전 회차가 없어 유형이 안 붙는다) */
export type CaseRisk =
  | { type: 'INVALID' }
  | { type: 'LOW_PERSISTENT'; lowCount: number; streak: number }
  | { type: 'DECLINE'; from: number; to: number }
  | { type: 'OBSERVE'; lowCount: number }

export const RISK_LABEL: Record<CaseRisk['type'], string> = {
  INVALID: '무효 응시',
  LOW_PERSISTENT: '지속 저점',
  DECLINE: '단계 하락',
  OBSERVE: '관찰',
}

export type InterviewCase = {
  id: string
  traineeId: string
  name: string
  className: string
  status: InterviewCaseStatus
  risk: CaseRisk
  /**
   * 무효 응시일 때만. 매니저가 아직 판정하지 않았으면 값이 있다 — 확인(그대로 두기·
   * 무효로 처리) 후에는 지워진다(무효로 처리는 케이스 자체가 목록에서 사라지고,
   * 그대로 두기는 이 필드만 지운다. 위 파일 머리말 판단 기록 참고).
   */
  voidEvidence?: {
    unanswered: number
    totalQuestions: number
    copied: boolean
    durationMin: number
  }
  /** 종결(DONE)일 때만 — 면담일 + 다음에 할 것(없으면 null) */
  interview?: { date: string; nextAction: string | null }
  /** 제외(EXCLUDED)일 때만 */
  excludedAt?: string
  excludedBy?: string
}

export type InterviewRound = {
  id: RoundId
  /** 이해도 확인 결과가 아직 안 나왔다 — 위험 판정 자체가 없다(#pending) */
  resultStatus: 'PENDING' | 'READY'
  /** 1차 — 비교할 직전 회차가 없어 위험 유형이 안 붙는다(9-5, #first) */
  isFirstRound: boolean
  /** 리포트 발행일 — 회차 안 전 케이스의 등재일과 같다(위 판단 기록) */
  publishedAt?: string
  cases: InterviewCase[]
}

const byId = (id: string) => (c: InterviewCase) => c.id === id

const ROUNDS: Record<RoundId, InterviewRound> = {
  // 1차 — 관찰 배지만, 위험 유형 없음(#first)
  '1': {
    id: '1',
    resultStatus: 'READY',
    isFirstRound: true,
    publishedAt: '2026-05-22',
    cases: [
      {
        id: 'iv-1-1',
        traineeId: 't-lee-seojun',
        name: '이서준',
        className: 'A반',
        status: 'PLANNED',
        risk: { type: 'OBSERVE', lowCount: 3 },
      },
      {
        id: 'iv-1-2',
        traineeId: 't-choi-yuna',
        name: '최유나',
        className: 'C반',
        status: 'PLANNED',
        risk: { type: 'OBSERVE', lowCount: 2 },
      },
    ],
  },
  // 2차 — 전부 종결·제외, 회고용(#past)
  '2': {
    id: '2',
    resultStatus: 'READY',
    isFirstRound: false,
    publishedAt: '2026-06-15',
    cases: [
      {
        id: 'iv-2-1',
        traineeId: 't-lee-seojun',
        name: '이서준',
        className: 'A반',
        status: 'DONE',
        risk: { type: 'LOW_PERSISTENT', lowCount: 3, streak: 2 },
        interview: { date: '2026-06-22', nextAction: '교안 1장 다시 읽기' },
      },
      {
        id: 'iv-2-2',
        traineeId: 't-kim-minjun',
        name: '김민준',
        className: 'A반',
        status: 'DONE',
        risk: { type: 'DECLINE', from: 0, to: 2 },
        interview: { date: '2026-06-22', nextAction: null },
      },
      {
        id: 'iv-2-3',
        traineeId: 't-choi-yuna',
        name: '최유나',
        className: 'C반',
        status: 'EXCLUDED',
        risk: { type: 'LOW_PERSISTENT', lowCount: 2, streak: 2 },
        excludedAt: '2026-06-21',
        excludedBy: CURRENT_MANAGER,
      },
    ],
  },
  // 3차 — 진행 중, 기본 장면(#list·#done·#void·#exclude가 전부 이 데이터 하나를 공유)
  '3': {
    id: '3',
    resultStatus: 'READY',
    isFirstRound: false,
    publishedAt: '2026-07-21',
    cases: [
      {
        id: 'iv-3-1',
        traineeId: 't-oh-serim',
        name: '오세림',
        className: 'C반',
        status: 'PLANNED',
        risk: { type: 'INVALID' },
        voidEvidence: { unanswered: 2, totalQuestions: 3, copied: true, durationMin: 4 },
      },
      {
        id: 'iv-3-2',
        traineeId: 't-choi-yuna',
        name: '최유나',
        className: 'C반',
        status: 'PLANNED',
        risk: { type: 'LOW_PERSISTENT', lowCount: 3, streak: 2 },
      },
      {
        id: 'iv-3-3',
        traineeId: 't-lee-seojun',
        name: '이서준',
        className: 'A반',
        status: 'PLANNED',
        risk: { type: 'LOW_PERSISTENT', lowCount: 2, streak: 2 },
      },
      {
        id: 'iv-3-4',
        traineeId: 't-kim-minjun',
        name: '김민준',
        className: 'A반',
        status: 'PLANNED',
        risk: { type: 'DECLINE', from: 1, to: 2 },
      },
      {
        id: 'iv-3-5',
        traineeId: 't-han-jiwoo',
        name: '한지우',
        className: 'B반',
        status: 'PLANNED',
        risk: { type: 'DECLINE', from: 0, to: 2 },
      },
      {
        id: 'iv-3-6',
        traineeId: 't-park-dohyun',
        name: '박도현',
        className: 'B반',
        status: 'DONE',
        risk: { type: 'DECLINE', from: 1, to: 2 },
        interview: { date: '2026-07-24', nextAction: '흐름 그려오기' },
      },
      {
        id: 'iv-3-7',
        traineeId: 't-kang-yunseo',
        name: '강윤서',
        className: 'B반',
        status: 'DONE',
        risk: { type: 'LOW_PERSISTENT', lowCount: 2, streak: 2 },
        interview: { date: '2026-07-23', nextAction: '교안 2장 다시 읽기' },
      },
      {
        id: 'iv-3-8',
        traineeId: 't-jung-haneul',
        name: '정하늘',
        className: 'A반',
        status: 'DONE',
        risk: { type: 'LOW_PERSISTENT', lowCount: 2, streak: 2 },
        interview: { date: '2026-07-22', nextAction: '팀에 먼저 물어보기' },
      },
      {
        id: 'iv-3-9',
        traineeId: 't-seo-jihun',
        name: '서지훈',
        className: 'C반',
        status: 'DONE',
        risk: { type: 'DECLINE', from: 1, to: 2 },
        interview: { date: '2026-07-22', nextAction: null },
      },
    ],
  },
  // 4차 — 회차 결과 자체가 아직 없다(#pending)
  '4': { id: '4', resultStatus: 'PENDING', isFirstRound: false, cases: [] },
  // 5차 — 결과는 나왔지만 위험 대상이 없다(#empty)
  '5': {
    id: '5',
    resultStatus: 'READY',
    isFirstRound: false,
    publishedAt: '2026-07-27',
    cases: [],
  },
}

// ── 파생값 ──────────────────────────────────────────────────
// M/D 짧은 표기 — 와이어의 "7/21" 그대로. 자정 UTC 이슈를 피하려 로컬 파싱 고정.
export function shortDateLabel(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${m}/${d}`
}

function diffDays(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00`)
  const b = new Date(`${to}T00:00:00`)
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

/** 위험 유형 순위 — 무효 응시 > 지속 저점/관찰 > 단계 하락. 정렬엔 안 쓰고 필터 옵션 순서에만 쓴다(위 판단 기록) */
function riskRank(risk: CaseRisk['type']): number {
  if (risk === 'INVALID') return 0
  if (risk === 'DECLINE') return 2
  return 1 // LOW_PERSISTENT · OBSERVE
}

/** 위험 유형 필터 옵션 — riskRank 순서 그대로(무효 응시 > 지속 저점/관찰 > 단계 하락) */
export const RISK_TYPE_OPTIONS: CaseRisk['type'][] = (
  Object.keys(RISK_LABEL) as CaseRisk['type'][]
).sort((a, b) => riskRank(a) - riskRank(b))

const classRank = (className: string) => {
  const i = CLASS_OPTIONS.indexOf(className as ClassName)
  return i === -1 ? CLASS_OPTIONS.length : i
}

const statusRank = (status: InterviewCaseStatus) => (status === 'DONE' ? 1 : 0)

/**
 * 정렬 — "이미 급한 순으로 온다"(정의서 §3, 사용자가 못 고른다). 규칙은 파일
 * 머리말 "정렬 규칙 2차 반영" 참고 — ① 무효 응시 항상 최상단 → ② 상태(예정·제외
 * 먼저, 종결 나중) → ③ 반 오름차순 → ④ 이름 가나다순.
 */
export function sortCases(cases: InterviewCase[]): InterviewCase[] {
  const invalid = cases.filter((c) => c.risk.type === 'INVALID')
  const rest = cases.filter((c) => c.risk.type !== 'INVALID')

  const byRest = (a: InterviewCase, b: InterviewCase) =>
    statusRank(a.status) - statusRank(b.status) ||
    classRank(a.className) - classRank(b.className) ||
    a.name.localeCompare(b.name, 'ko')

  invalid.sort(byRest)
  rest.sort(byRest)

  return [...invalid, ...rest]
}

// ── 조회(mock API) ──────────────────────────────────────────
// 백엔드 연동 시 이 블록만 fetch로 바꾼다.

const LATENCY_MS = 250
const delay = <T>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS))

export type InterviewQuery = {
  round: RoundId
  search?: string
  /** 'ALL' | InterviewCaseStatus */
  status?: string
  riskType?: CaseRisk['type']
  classFilter?: ClassName
}

export type InterviewCounts = Record<InterviewCaseStatus, number>

export type InterviewListResult = {
  items: InterviewCase[]
  total: number
  /** 상태별 개수 — 검색·필터와 무관한 그 회차 전체 기준(OP-03·MG-07과 같은 이유) */
  counts: InterviewCounts
  /** 위험 유형별 개수 — 위와 같은 이유. 필터 옵션에 개수를 싣는다(`InterviewFilters`) */
  riskCounts: Record<CaseRisk['type'], number>
  round: {
    id: RoundId
    label: string
    resultStatus: InterviewRound['resultStatus']
    isFirstRound: boolean
    publishedAtLabel?: string
    /** 회차 경과일 — 상단 경고줄("N일째 안 끝났습니다")에 쓴다 */
    daysSincePublish?: number
  }
}

/**
 * `GET /interviews?round=` — 위험 판정이 켜져 자동 등재된 케이스 목록(정의서 §6
 * "대상은 자동 등재된다"). 검색·상태 필터는 서버가 처리한다는 전제(OP-03·MG-07과
 * 같은 경계 원칙) — 정렬은 필터와 무관하게 항상 `sortCases` 하나다(사용자가
 * 못 고른다).
 */
export function listInterviews(q: InterviewQuery): Promise<InterviewListResult> {
  const round = ROUNDS[q.round]
  const search = q.search?.trim().toLowerCase() ?? ''

  const counts: InterviewCounts = { PLANNED: 0, DONE: 0, EXCLUDED: 0 }
  const riskCounts: Record<CaseRisk['type'], number> = {
    INVALID: 0,
    LOW_PERSISTENT: 0,
    DECLINE: 0,
    OBSERVE: 0,
  }
  for (const c of round.cases) {
    counts[c.status]++
    riskCounts[c.risk.type]++
  }

  const filtered = round.cases.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search)) return false
    if (q.status && q.status !== 'ALL' && c.status !== q.status) return false
    if (q.riskType && c.risk.type !== q.riskType) return false
    if (q.classFilter && c.className !== q.classFilter) return false
    return true
  })
  const items = sortCases(filtered)

  return delay({
    items,
    total: items.length,
    counts,
    riskCounts,
    round: {
      id: round.id,
      label: ROUND_LABEL[round.id],
      resultStatus: round.resultStatus,
      isFirstRound: round.isFirstRound,
      publishedAtLabel: round.publishedAt ? shortDateLabel(round.publishedAt) : undefined,
      daysSincePublish: round.publishedAt ? diffDays(round.publishedAt, MOCK_TODAY) : undefined,
    },
  })
}

/** `PATCH /interviews/{id}` — 제외. 체크가 아니라 버튼(정의서 §3), 되돌릴 수 있다 */
export function excludeCase(roundId: RoundId, caseId: string): Promise<void> {
  const c = ROUNDS[roundId].cases.find(byId(caseId))
  if (c && c.status === 'PLANNED') {
    c.status = 'EXCLUDED'
    c.excludedAt = MOCK_TODAY
    c.excludedBy = CURRENT_MANAGER
  }
  return delay(undefined)
}

/** `PATCH /interviews/{id}` — 제외 되돌리기 */
export function undoExclude(roundId: RoundId, caseId: string): Promise<void> {
  const c = ROUNDS[roundId].cases.find(byId(caseId))
  if (c && c.status === 'EXCLUDED') {
    c.status = 'PLANNED'
    c.excludedAt = undefined
    c.excludedBy = undefined
  }
  return delay(undefined)
}

/**
 * `PATCH /interviews/{id}` — 무효 응시 확인. 자동 확정하지 않는다(9-4) — 사람이
 * 고른다. `INVALIDATE`는 결과 자체를 지우므로 케이스가 목록에서 사라진다(정의서
 * "이 회차 결과가 지워집니다 · 위험 판정도 남지 않습니다"). `KEEP`은 파일 머리말
 * 판단 기록 참고.
 */
export function resolveVoid(
  roundId: RoundId,
  caseId: string,
  action: 'INVALIDATE' | 'KEEP',
): Promise<void> {
  const round = ROUNDS[roundId]
  const c = round.cases.find(byId(caseId))
  if (!c) return delay(undefined)
  if (action === 'INVALIDATE') {
    round.cases = round.cases.filter((x) => x.id !== caseId)
  } else {
    c.voidEvidence = undefined
  }
  return delay(undefined)
}
