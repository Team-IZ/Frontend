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
    수 없다 — 재확인 대상에서 빼고 판정 근거·마지막 활동을 "확인 완료"로 바꾸는 건
    `voidConfirmed`(MG04-4)가 갖는다. `voidEvidence` 자체는 지우지 않는다 — MG-04
    브리프가 무효 응시 케이스를 열 때마다 "시스템이 본 것"을 계속 보여줘야 해서다.
    배지 자체("무효 응시")는 그대로 둔다 — 나중에 실제 채점이 끝나면 그 결과가 이
    케이스를 대체할 것이다(그 흐름은 이 화면 밖).
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
   * 무효 응시일 때만. 이 값 자체는 "그대로 두기"를 골라도 안 지워진다 — MG-04
   * 브리프가 "시스템이 본 것"을 보여줄 때 언제든 다시 읽어야 해서다(재확인 대상
   * 여부는 아래 `voidConfirmed`가 별도로 갖는다. 이전엔 이 필드를 지워 "확인
   * 완료"를 표현했는데, 그러면 브리프를 다시 열었을 때 보여줄 값이 없어져 MG04-4로
   * 갈라냈다).
   */
  voidEvidence?: {
    unanswered: number
    totalQuestions: number
    copied: boolean
    durationMin: number
  }
  /**
   * 무효 응시 확인(§6 "그대로 두기")을 마쳤는가 — MG-03 목록의 "무효 확인" 게이트·
   * "확인 완료" 표시가 이 값을 본다. `voidEvidence`와 분리한 이유는 위 주석 참고.
   */
  voidConfirmed?: boolean
  /**
   * 종결(DONE)일 때만 — 면담일 + 다음에 할 것(없으면 null). `causes`·`why`는
   * 브리프를 다시 열었을 때 이전에 고른 원인·적은 상세 사유를 복원하기 위한
   * 값이다(종결 후에도 브리프를 다시 열 수 있다 — 아래 `saveInterviewBrief`
   * 판단 기록 참고).
   */
  interview?: { date: string; nextAction: string | null; causes?: CauseKey[]; why?: string }
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
        // MG-04 브리프 ①의 "지난 면담에서 정한 것" 예시(정의서·와이어 그대로)가
        // 이 케이스를 인용한다 — nextAction을 null로 두면 인용할 값이 없다.
        interview: { date: '2026-06-22', nextAction: '담당 기능 흐름 그려오기' },
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
 * "이 회차 결과가 지워집니다 · 위험 판정도 남지 않습니다"). `KEEP`은 `voidEvidence`를
 * 지우지 않는다(MG04-4) — MG-04 브리프가 "그대로 둔" 뒤에도 "시스템이 본 것"을 계속
 * 보여줘야 해서다. 대신 `voidConfirmed`만 세워 MG-03의 "무효 확인" 게이트·"확인
 * 완료" 표시를 가른다.
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
    c.voidConfirmed = true
  }
  return delay(undefined)
}

// ── MG-04 면담 브리프 목업 ──────────────────────────────────
/*
  값은 목업 docs/plan/v2/wireframe/manager/interview-brief.html의 장면(#brief·
  #one·#multi·#group·#first·#void·#confirm·#savefail)을 그대로 옮긴다.

  ⚠ 판단 기록 — 정의서·와이어에 없어 이 파일이 정한 것

  · **"첫 면담"은 회차가 아니라 학생 단위다.** 와이어 #first 장면은 라벨상
    "미프 2차"이지만, 이 저장소엔 그 회차가 없다 — 대신 "이 학생에게 이전
    **면담**(DONE) 기록이 있는가"로 재정의해 판정한다(`findPriorInterview`).
    한지우(`iv-3-5`)는 3차에서 처음 등장하고 이전 DONE 기록이 없어 자연히
    "첫 면담" 장면과 같은 조건이 된다 — 회차 번호를 억지로 맞추지 않았다.
  · **① 여는 말은 위험 유형이 아니라 "이전 면담 여부"로 갈린다.** 한지우의
    위험 유형은 DECLINE(0→2)이라 비교 숫자가 있는데도, 와이어 #first는 비교
    없는 문장("3개 중 2개에서 멈췄어요")을 쓴다 — 헤더 배지의 "0 → 2"는 그대로
    두고(원본 데이터 그대로), ①의 문장만 이전 면담 유무로 고른다.
  · **지속 저점(LOW_PERSISTENT)의 "지난 회차" 숫자** — 이 위험 유형은 from이
    없다(계속 같은 지점에서 멈춘다는 뜻이라). 비교 문장을 쓸 때는 지난·이번
    모두 같은 `lowCount`를 넣는다(이서준 `iv-3-3`) — 그래도 "무엇이 달라졌는지"
    질문 자체는 여전히 유효하다(숫자가 아니라 이유가 바뀌었는지 묻는 것).
  · **막힌 개념 목록은 이번 파일에 새로 둔다**(`CASE_CONCEPTS`) — 정의서 §4
    "막힌 개념 · 채점 근거"는 세션 데이터를 읽는다고 했지만 이 레포에 세션-면담
    간 연동은 없다(session 목업은 검증 문제 데이터라 개념 단위가 아니다). 위험
    유형의 개수(2단 이하 N개)와 목록 길이가 어긋나지 않게 손으로 맞췄다.
  · **"Graph 구성"을 김민준 말고 최유나(`iv-3-2`)에게도 겹쳐 뒀다** — 반 문제로
    판정되려면(9-6) 원래 여러 학생이 같은 지점에서 막혀야 말이 된다. 한 명만
    막힌 개념을 "반 절반 이상"이라고 부르면 그 자체로 앞뒤가 안 맞는다.
  · **교안 위치("N장 P–Q쪽")는 `curriculum/mockData.ts`를 참조하지 않는다** —
    이 파일 머리말이 이미 정한 "역할 간 mock cross-import 전례 없음" 원칙을
    그대로 따른다. 값은 이 파일에서 독립적으로 붙인, 실제 페이지와 무관한
    표시용 문자열이다.
  · **"설명·표현 어려움"의 보낼 곳은 정의서·와이어 어디에도 없다** — 나머지
    6개 원인은 정의서 표 또는 와이어 장면 어딘가에 예시가 있는데 이것만 없다.
    "개념은 아는데 표현이 안 되는" 경우라 교안 재안내(개념 이해 부족)나 강사
    Q&A(기술 문제)로 보내는 게 맞지 않다고 판단, **매니저가 다음 면담에서 직접
    다시 설명해 보게 하는 것**으로 채웠다(전달만이 아니라 매니저 소관 — 면담
    진행 자체가 매니저 일이라서). 팀장님 확인 필요하면 알려달라고 다음 세션에
    남긴다.
  · **③ 미체크 상태의 안내 문구는 와이어 원문("③에서 고르면 보낼 곳이
    나타납니다")을 그대로 쓴다.** 정의서 6절의 paraphrase("고르지 않아도 저장할
    수 있어요…")는 별도 저장 시점 토스트가 아니라 이 placeholder가 이미 하는
    말과 같은 뜻이라 판단해, 저장을 막지 않는 것 자체로 충분하다고 보고 별도
    확인 문구를 더 만들지 않았다.
  · **"코드 매칭 0" 개념 제외·각주(정의서 6절)는 구현하지 않았다** — 이번
    7개 케이스 어디에도 해당하는 예시가 없어 검증할 방법이 없다. `ConceptRef`
    타입에 자리는 남겨 뒀다(`zeroMatch?`), 실제로 쓰는 케이스가 생기면 그때
    필터링 로직을 채운다.
  · **"저장 실패"(#savefail)는 mock이 실제로 실패시키지 않는다** — 이 파일의
    다른 mock API(`excludeCase`·`undoExclude`·`resolveVoid`)도 전부 항상
    성공한다. 화면 쪽 오류 처리 UI는 정의서·와이어대로 만들되, 강제로 실패를
    재현하는 장치는 이 레포 관례에 없어 새로 만들지 않았다.
*/

export type CauseKey =
  | 'CONCEPT_GAP'
  | 'OUT_OF_SCOPE'
  | 'TIME_SHORTAGE'
  | 'EXPRESSION'
  | 'DIFFICULTY_UP'
  | 'TEAM_DEPENDENCE'
  | 'CONDITION'

/** ③ 들은 것 — 정의서 §3, 순서 고정 */
export const CAUSE_OPTIONS: { key: CauseKey; label: string }[] = [
  { key: 'CONCEPT_GAP', label: '개념 이해 부족' },
  { key: 'OUT_OF_SCOPE', label: '담당 범위 밖' },
  { key: 'TIME_SHORTAGE', label: '구현 시간 부족' },
  { key: 'EXPRESSION', label: '설명·표현 어려움' },
  { key: 'DIFFICULTY_UP', label: '난이도 상승' },
  { key: 'TEAM_DEPENDENCE', label: '팀 의존' },
  { key: 'CONDITION', label: '컨디션·심리' },
]
export const CAUSE_LABEL: Record<CauseKey, string> = Object.fromEntries(
  CAUSE_OPTIONS.map((o) => [o.key, o.label]),
) as Record<CauseKey, string>

/** ② 질문 — 고정, 사용자가 못 고른다(정의서 §7 "② 질문 고르기 — 하지 않는다") */
export const BRIEF_QUESTIONS = [
  '이전 프로젝트와 비교해서 가장 달랐던 점이 뭐였어요?',
  '이번에 어떤 역할을 맡았어요?',
  '만들면서 제일 자신 없던 부분은요?',
  '답하기 어려웠던 게 코드 때문이었어요, 설명하는 방식 때문이었어요?',
]
/** 무효 응시 전용 질문 3개(정의서 6-2) */
export const VOID_BRIEF_QUESTIONS = [
  '그날 컨디션이나 일정에 무슨 일이 있었어요?',
  '화면을 열었을 때 어디서부터 막혔어요?',
  '다시 볼 시간을 언제로 잡으면 좋을까요?',
]

export type DestOwner = 'MANAGER' | 'PASS'

/** ④ 보낼 곳 한 줄. `owner`가 없으면 라우팅 액션이 아니라 안내 정보 줄(난이도 상승 공지문) */
export type DestLine = {
  /** 원인 라벨을 이 줄에 보여줄지 — 한 원인이 줄을 여럿 쓰면 첫 줄에만 true */
  showLabel: boolean
  text: string
  /** text 안에서 굵게 표시할 부분 문자열(정확히 일치하는 첫 구간만) */
  bold?: string
  owner?: DestOwner
  href?: string
}

export type ConceptRef = {
  name: string
  /** 교안 인용 문구 — "N장 P–Q쪽"(이 파일 안에서만 쓰는 표시용 값, 위 판단 기록 참고) */
  curriculumRef?: string
  /** 반 문제로 이미 판정됐으면(9-6) — 개인 사유·개념 이해 부족 목적지에서 빠지고 배너로 대체 */
  groupIssue?: { classLabel: string }
  /** 코드 매칭 0(정의서 6절) — 이번 케이스엔 없어 미사용, 자리만 남긴다 */
  zeroMatch?: boolean
}

/**
 * 케이스별 막힌 개념 — 위 판단 기록 참고. 처음엔 브리프가 열리는 PLANNED 7개
 * 케이스만 채웠는데, 종결 후 브리프 재오픈(MG04-2)으로 2차 DONE 케이스(`iv-2-1`·
 * `iv-2-2`)도 브리프를 열 수 있게 되며 "이야기할 개념"이 비어 보이는 문제가
 * 생겨(사용자 지적) 그 둘도 채웠다. `iv-2-3`(최유나, 제외 상태)은 브리프 버튼
 * 자체가 없어 빠졌다.
 */
const CASE_CONCEPTS: Record<string, ConceptRef[]> = {
  'iv-2-1': [
    { name: 'HITL 개념 정의', curriculumRef: 'AI_LLMOps · 1장 12–18쪽' },
    { name: 'HITL이 필요한 이유', curriculumRef: 'AI_LLMOps · 1장 19–24쪽' },
    { name: '승인 UI 패턴', curriculumRef: 'AI_LLMOps · 4장 66–70쪽' },
  ],
  'iv-2-2': [
    { name: '역할 기반 설계', curriculumRef: 'AI_LLMOps · 3장 30–36쪽' },
    { name: '중단과 재개', curriculumRef: 'AI_LLMOps · 2장 55–59쪽' },
  ],
  'iv-1-1': [
    { name: 'HITL 개념 정의', curriculumRef: 'AI_LLMOps · 1장 12–18쪽' },
    { name: 'HITL이 필요한 이유', curriculumRef: 'AI_LLMOps · 1장 19–24쪽' },
    { name: '중단과 재개', curriculumRef: 'AI_LLMOps · 2장 55–59쪽' },
  ],
  'iv-1-2': [
    { name: '역할 기반 설계', curriculumRef: 'AI_LLMOps · 3장 30–36쪽' },
    { name: '승인 UI 패턴', curriculumRef: 'AI_LLMOps · 4장 66–70쪽' },
  ],
  'iv-3-2': [
    { name: 'Graph 구성', groupIssue: { classLabel: 'A반 23명 중 12명이 2단 이하' } },
    { name: '체크포인트 저장', curriculumRef: 'AI_LLMOps · 6장 95–101쪽' },
    { name: '승인 UI 패턴', curriculumRef: 'AI_LLMOps · 4장 66–70쪽' },
  ],
  'iv-3-3': [
    { name: 'AgentState 필드 설계', curriculumRef: 'AI_LLMOps · 2장 50–54쪽' },
    { name: '중단과 재개', curriculumRef: 'AI_LLMOps · 2장 55–59쪽' },
  ],
  'iv-3-4': [
    { name: 'Graph 구성', groupIssue: { classLabel: 'A반 23명 중 12명이 2단 이하' } },
    { name: 'HITL Trigger', curriculumRef: 'AI_LLMOps · 3장 36–46쪽' },
  ],
  'iv-3-5': [
    { name: '인증 흐름', curriculumRef: 'AI_LLMOps · 5장 78–84쪽' },
    { name: '트랜잭션', curriculumRef: 'AI_LLMOps · 5장 85–91쪽' },
  ],
}

export type BriefData = {
  caseId: string
  traineeId: string
  roundId: RoundId
  roundLabel: string
  name: string
  className: string
  risk: CaseRisk
  isVoid: boolean
  voidEvidence?: InterviewCase['voidEvidence']
  hasPriorInterview: boolean
  priorInterview?: { dateLabel: string; nextAction: string }
  concepts: ConceptRef[]
  /**
   * 이 케이스 자신의 저장된 기록 — 종결(DONE) 후 브리프를 다시 열었을 때 이전에
   * 고른 원인·적은 상세 사유·추후 계획을 복원한다(아래 `saveInterviewBrief`
   * 판단 기록 참고). PLANNED로 처음 여는 브리프는 항상 없다.
   */
  savedRecord?: { causes: CauseKey[]; why: string; nextAction: string }
}

export const talkingConcepts = (b: BriefData): ConceptRef[] =>
  b.concepts.filter((c) => !c.groupIssue && !c.zeroMatch)
export const groupIssueConcepts = (b: BriefData): ConceptRef[] =>
  b.concepts.filter((c) => !!c.groupIssue)

/**
 * ① 여는 말에 쓸 값 — **위험 유형 4종 × 고정 문장**(MG04-6, 사용자 지시로 다시 씀).
 * 전엔 "이전 면담 유무"로 비교/비비교 문장을 갈랐는데, 사용자가 "다들 어색하고
 * 똑같다"고 지적해 위험 유형별로 자연스러운 문장을 따로 만들었다 — 문장 자체는
 * `InterviewBriefScreen.tsx`의 `renderOpeningLine`이 갖고, 여기는 거기 꽂을
 * 숫자만 계산한다(LLM 0회 원칙 유지 — 새로 쓴 문장은 화면 쪽 고정 템플릿뿐).
 */
export type OpeningLine =
  | { kind: 'VOID' }
  | { kind: 'DECLINE'; prev: number; now: number }
  | { kind: 'LOW_PERSISTENT'; lowCount: number; streak: number }
  | { kind: 'OBSERVE'; lowCount: number }

export function openingLine(b: BriefData): OpeningLine {
  const risk = b.risk
  // `risk.type`으로 직접 좁힌다 — `b.isVoid`로 갈라도 값은 같지만, 그러면
  // TS가 나머지 분기에서 `risk`가 `INVALID`를 배제한 걸 못 좁혀 컴파일 에러가 난다.
  if (risk.type === 'INVALID') return { kind: 'VOID' }
  if (risk.type === 'DECLINE') return { kind: 'DECLINE', prev: risk.from, now: risk.to }
  if (risk.type === 'LOW_PERSISTENT') {
    return { kind: 'LOW_PERSISTENT', lowCount: risk.lowCount, streak: risk.streak }
  }
  return { kind: 'OBSERVE', lowCount: risk.lowCount }
}

function findCaseLocation(caseId: string): { roundId: RoundId; item: InterviewCase } | null {
  for (const roundId of Object.keys(ROUNDS) as RoundId[]) {
    const item = ROUNDS[roundId].cases.find(byId(caseId))
    if (item) return { roundId, item }
  }
  return null
}

/** 이 학생의 가장 최근 DONE 면담(현재 회차보다 이전) — "첫 면담" 여부와 지난 약속 인용에 쓴다 */
function findPriorInterview(
  traineeId: string,
  beforeRoundId: RoundId,
): { dateLabel: string; nextAction: string } | null {
  const before = Number(beforeRoundId)
  let found: InterviewCase | null = null
  let foundRoundNum = -1
  for (const roundId of Object.keys(ROUNDS) as RoundId[]) {
    const roundNum = Number(roundId)
    if (roundNum >= before) continue
    const match = ROUNDS[roundId].cases.find(
      (c) => c.traineeId === traineeId && c.status === 'DONE',
    )
    if (match && roundNum > foundRoundNum) {
      found = match
      foundRoundNum = roundNum
    }
  }
  if (!found?.interview?.nextAction) return null
  return { dateLabel: shortDateLabel(found.interview.date), nextAction: found.interview.nextAction }
}

/** `GET /interviews/{id}/brief` */
export function getInterviewBrief(caseId: string): Promise<BriefData | null> {
  const loc = findCaseLocation(caseId)
  if (!loc) return delay(null)
  const { roundId, item } = loc
  const isVoid = item.risk.type === 'INVALID'
  const prior = isVoid ? null : findPriorInterview(item.traineeId, roundId)
  return delay({
    caseId,
    traineeId: item.traineeId,
    roundId,
    roundLabel: ROUND_LABEL[roundId],
    name: item.name,
    className: item.className,
    risk: item.risk,
    isVoid,
    voidEvidence: item.voidEvidence,
    hasPriorInterview: prior !== null,
    priorInterview: prior ?? undefined,
    concepts: isVoid ? [] : (CASE_CONCEPTS[caseId] ?? []),
    savedRecord: item.interview
      ? {
          causes: item.interview.causes ?? [],
          why: item.interview.why ?? '',
          nextAction: item.interview.nextAction ?? '',
        }
      : undefined,
  })
}

/**
 * ④ 보낼 곳 — 원인 하나를 목적지 줄로 바꾼다. 원인 체크박스는 분류 라벨이 아니라
 * 라우팅 스위치다(정의서 §3). `CONCEPT_GAP`·`DIFFICULTY_UP`만 케이스 데이터를
 * 본다 — 나머지 5개는 고정 문구.
 */
export function destinationsFor(cause: CauseKey, brief: BriefData): DestLine[] {
  switch (cause) {
    case 'CONCEPT_GAP': {
      const concepts = talkingConcepts(brief)
      const lines: DestLine[] = concepts.map((c, i) => ({
        showLabel: i === 0,
        text: `교안 ${c.curriculumRef ?? 'AI_LLMOps'} 안내`,
        owner: 'MANAGER',
        href: '/manager/curriculum/cur-1',
      }))
      lines.push({ showLabel: lines.length === 0, text: '강사 Q&A 안내', owner: 'PASS' })
      return lines
    }
    case 'OUT_OF_SCOPE':
      return [
        {
          showLabel: true,
          text: '다음 프로젝트 역할 분담에서 조정',
          bold: '역할 분담',
          owner: 'MANAGER',
        },
      ]
    case 'TIME_SHORTAGE':
      return [
        {
          showLabel: true,
          text: '재응시 창 안내 · 다음 회차 일정 확인',
          bold: '재응시 창',
          owner: 'MANAGER',
        },
      ]
    case 'EXPRESSION':
      // 정의서·와이어에 예시가 없다 — 위 판단 기록 참고
      return [{ showLabel: true, text: '다음 면담에서 다시 설명해보게 하기', owner: 'MANAGER' }]
    case 'TEAM_DEPENDENCE':
      return [{ showLabel: true, text: '다음 팀 편성에서 고려', bold: '팀 편성', owner: 'MANAGER' }]
    case 'CONDITION':
      return [
        {
          showLabel: true,
          text: '기관 상담 채널로 연결',
          bold: '상담 채널',
          owner: 'PASS',
        },
      ]
    case 'DIFFICULTY_UP':
      // owner 없음 — 분류가 아니라 안내 정보 줄(9-6, 매니저가 세지 않게 한다)
      return [
        {
          showLabel: true,
          text: '반 절반 이상이면 개인 문제가 아님 — 기관에 보고',
          bold: '기관에 보고',
        },
      ]
  }
}

/**
 * `PATCH /interviews/{id}/brief` — 저장은 항상 종결(정의서 §5). mock은 항상
 * 성공한다(위 판단 기록).
 *
 * ⚠ **종결(DONE) 후에도 다시 저장할 수 있다** — 정의서·와이어엔 없는 흐름이다
 * (7절 "약속 이행 추적은 하지 않는다"가 재오픈까지 막는다는 뜻은 아니라고 판단).
 * 사용자 지시로 `InterviewListScreen`이 종결된 케이스에도 `[브리프 수정]`을 계속
 * 보여주므로, 여기서도 상태를 `PLANNED`로 좁히지 않고 `EXCLUDED`만 막는다 —
 * 제외는 별개의 종결 상태라 브리프로 되돌아오지 않는다(아래 `excludeCase` 판단
 * 기록과 같은 이유, 이 함수는 상태 전이를 만들지 않는다). 원인·상세 사유도 같이
 * 저장해 다음에 다시 열면 그대로 복원된다(`getInterviewBrief`의 `savedRecord`).
 */
export function saveInterviewBrief(
  caseId: string,
  payload: { causes: CauseKey[]; why: string; nextAction: string },
): Promise<void> {
  const loc = findCaseLocation(caseId)
  if (loc && loc.item.status !== 'EXCLUDED') {
    loc.item.status = 'DONE'
    loc.item.interview = {
      date: MOCK_TODAY,
      nextAction: payload.nextAction.trim() || null,
      causes: payload.causes,
      why: payload.why,
    }
  }
  return delay(undefined)
}
