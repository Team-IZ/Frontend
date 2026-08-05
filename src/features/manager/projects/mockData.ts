/*
  MG-07 프로젝트 목록 · MG-08 프로젝트 상세(매니저) — 공유 목업 데이터.

  값은 목업 docs/plan/v2/wireframe/manager/projects.html에서 그대로 옮긴다. OP-03
  (operator/projects)과 표는 닮았지만 **답하는 질문이 다르다**(정의서 "OP-03과
  통일하지 않은 것") — 상태(예정/진행 중/종료 3종, OP의 PREP·READY 구분 없음) ·
  진행 열(파이프라인 현재 단계 하나) · 조치 열(반 이름 + 미제출·분석 실패·면담)이
  전부 이 화면 자체 계약이라 OP-03 타입을 재사용하지 않는다 — 이 레포에 역할 간
  mock cross-import 전례가 없다(auth 제외, auth는 신원이라 예외).

  ⚠ 판단 기록 — 이 파일이 정한 것 (기획 문서에 없음)
  · 담당 반 인원: A반 26 · B반 26 · C반 23 = 75명(목업 "담당 A·B·C반 · 75명" ·
    "C반만 · 23명" 두 장면에서 역산). 나머지 분배는 프론트가 정했다.
  · 미프 3차 반별 응시 실수: 위 인원 분배로 **합계 58/71**이 정확히 나오도록
    맞췄다(목업 장면 숫자와 일치).
  · **미프 5차를 추가했다.** 목업 `#notready` 장면(다음 회차 미준비 · 6개)은 기본
    `#list` 장면(5개)과 항목 수가 다르다 — 손그림 와이어는 장면마다 따로 그려도
    되지만 실제 화면은 **하나의 데이터셋**이어야 필터 결과가 항상 맞는다. 미프 5차
    (교안조차 안 붙은 예정 회차)를 데이터셋에 넣어 상태 필터 `예정`이 실제로 2건
    (미프5차·미프4차)을 돌려주게 했다 — 기본 목록 개수는 5개가 된다.
  · 조치 열의 "팀" 단위(`A반 미제출 2팀`)는 목업 문구를 그대로 따랐다 — 미프가
    개인 제출인지 팀 제출인지는 정의서에 없다(OP-04 쪽 `totalTeams`도 같은 사정,
    "이 숫자는 기획에 없다"). 제출/분석/응시 실수와 조치 문구를 같은 필드로
    역산하지 않고 **독립된 값**으로 둔다 — 실제 서버라면 서로 다른 집계 쿼리라
    산수가 딱 맞물릴 필요가 없다.

  ⚠ 2차 반영 — 팀장님이 새로 짠 OP-03 렌더 화면(컬럼: 프로젝트·상태·기간·
  교안·검증개념3건 / 필터: 검색·상태·교안·|·정렬)에 맞춰 컬럼·필터 순서를
  다시 맞췄다.

  ⚠ 3차 반영 — 사용자 지시로 OP-03과 마저 맞췄다. 정렬·반 필터는 4차에서 다시
  한 번 바뀐다(아래).

  ⚠ 4차 반영 — 사용자 피드백(렌더 확인 후).
  · **반 필터가 되돌아왔다.** "프로젝트에 포함된 반을 표시"하는 열(상태·기간 사이)
    + 필터(상태 옆)로. 3차에서 뺐던 걸 다시 넣은 것 — 이번엔 목록을 좁히는
    용도가 아니라 **그 회차에 실제로 반 데이터가 있는지**(예정 회차는 아직 없다)를
    보여주는 열이라 `project.classes`를 그대로 읽는다.
  · **"제출 마감" → "프로젝트 기간".** 시작~마감 전체 범위 + 남은 일수(OP-03
    `PeriodCell`과 같은 모양 — `dueLabel`도 그대로 들여왔다). `startAt`은 이제
    정렬만이 아니라 **화면에도 나온다.**
  · **응시 진행의 "뒤처진 반" 보조문구(`C반이 12/23`)를 없앴다** — 사용자가
    불필요하다고 판단. `progressCell`의 반환 모양도 그만큼 단순해졌다.
  · **응시 실수(`58/71`)의 분자에 5단 색을 입힌다** — 0/25/50/75/100% 경계로 색이
    바뀐다. 새 색 토큰을 만들지 않고 **이미 있는 `reach-0~4`**(MG-05 개념 도달
    5단 스케일)를 재사용했다 — 뜻은 다르지만(개념 도달 단계 vs 응시율) 시각적으로
    똑같은 "5단 그라데이션"이 필요해서다. 새 토큰을 추가하면 `doc:design` 갱신이
    또 필요해진다.
  · **"교안 연결 안 됨"·"미설정"을 경고색으로.** OP-03 톤을 그대로 따랐다 — 3차
    반영 때 "확정 권한이 없으면 경고를 안 띄운다"던 정의서 판단을 이번에도
    뒤집는다(사용자가 명시적으로 OP-03 스타일을 요구). **검증 개념 미확정도
    OP-03처럼 `⚠ 미확정 · 후보 N건에서 3건`으로** — `conceptCandidateCount`를
    새로 추가했다(OP-03 `Project.conceptCandidateCount`와 같은 자리, 값은 그
    교안이 실제로 가르치는 항목 수를 손으로 맞췄다).
  · **정렬 3종 → 2종.** "준비 필요 순"·"시작 임박 순"을 없애고 **프로젝트 시작
    순 · 마감 임박 순**만 남겼다. "마감 임박 순"은 **아직 안 지난 회차를 마감
    이른 순으로 먼저 보여주고, 이미 지난 회차는 뒤에 시작 순으로 이어붙인다** —
    사용자가 명시한 순서라 `compareProjects`에 그 규칙 그대로 넣었다(`isOverdue`
    분기 참고). "지났다"의 기준일은 `MOCK_TODAY`(미프 3차가 마감 직후·응시 창
    진행 중이 되는 시점으로 잡았다 — 그래야 RUNNING 회차의 마감이 "지남"으로
    보이는 게 자연스럽다).
  · **교안 필터 드롭다운 폭 버그.** `SelectContent`가 트리거 폭(`--anchor-width`)에
    맞춰 열려서, "전체"처럼 짧은 값이 선택된 채로 열면 긴 옵션(`Streamlit 실습
    v1`)이 잘렸다. 공용 `Select` 컴포넌트를 고치면 앱 전체 셀렉트에 영향이 가므로
    건드리지 않고, 이 필터의 트리거 최소 폭만 넉넉하게 늘렸다(`ProjectFilters.tsx`).

  ⚠ 5차 반영 — 필터 트리거 전부 고정폭으로(`ProjectFilters.tsx`, `min-w-*` →
  `w-*`, 트리거 기본 클래스가 `w-fit`이라 최소폭만 주면 선택값 길이에 따라 칸
  자체가 커졌다 줄었다 했다).

  ⚠ 6차 반영 — **프로젝트 기간의 시작일에도 시간을 더했다** — OP-03 `PeriodCell`은
  시작일을 `.slice(0, 5)`로 잘라 날짜만 보여주지만(마감만 시:분까지), 사용자가
  시작일도 마감과 같은 정밀도로 보길 원해 그 자름을 없앴다(`ProjectRowCells.tsx`).
  OP-03과 다시 갈라지는 지점이라 여기 남긴다. 표 헤더 폭도 늘어난 글자 수만큼
  넓혔다(`w-32` → `w-40`, `ProjectListScreen.tsx`). 남은 일수("N일 남음"/"지남")
  줄도 위 날짜 범위보다 짧아 어긋나 보여 가운데 정렬했다(`ProjectRowCells.tsx`).
*/

/** 매니저에게는 예정/진행 중/종료 3종만 있다 — 준비 상태(PREP·READY)는 OP-03 소관 */
export type ProjectStatus = 'PLANNED' | 'RUNNING' | 'DONE'

export type ClassName = 'A반' | 'B반' | 'C반'

/** 반별 원자 값 — MG-08 제출 현황 탭이 이 레코드를 그대로 반별 표로 편다 */
export type ClassProgress = {
  className: ClassName
  /** 그 반 인원 */
  total: number
  attendable: number
  attended: number
  /** 진행 중 회차 — 미제출 "팀" 수. 0이면 조치에 안 나타난다 */
  unsubmittedTeams: number
  /** 진행 중 회차 — 분석 실패 "팀" 수 */
  analysisFailedTeams: number
  /** 종료된 회차 — 면담 대기·진행 인원 */
  interviewCount: number
}

export type Project = {
  id: string
  name: string
  status: ProjectStatus
  /**
   * 연결 교안 — "이름 버전" 문자열 목록(OP-03 CurriculumSummary와 같은 세로 나열).
   * 빈 배열 = "아직 안 붙었다"는 뜻이라 다른 문구가 붙는다(§notready 케이스).
   */
  curricula: string[]
  /** 검증 개념 3건. null = 미확정 */
  concepts: string[] | null
  /**
   * 연결한 교안이 가르치는 항목 수(OP-03 `conceptCandidateCount`와 같은 자리) —
   * 미확정일 때 "후보 N건에서 3건"에 쓴다. 교안이 없으면 0.
   */
  conceptCandidateCount: number
  /** 시작 ISO. 미설정이면 null(§notready 케이스 · 미프 5차) */
  startAt: string | null
  /** 제출 마감 ISO. 미설정이면 null */
  dueAt: string | null
  /** 담당 반 스코프의 반별 데이터. 예정 회차는 빈 배열(아직 아무 일도 없다) */
  classes: ClassProgress[]
}

/** 매니저는 3종만 본다 — 준비 중/준비됨 구분은 확정 권한이 있는 OP-03 쪽 개념이다 */
export const STATUS_LABEL: Record<ProjectStatus, string> = {
  PLANNED: '예정',
  RUNNING: '진행 중',
  DONE: '종료',
}

/** 담당 반 스코프 — 매니저 박지현, 7기 A·B·C반 */
export const MANAGED_CLASSES: { name: ClassName; total: number }[] = [
  { name: 'A반', total: 26 },
  { name: 'B반', total: 26 },
  { name: 'C반', total: 23 },
]
export const SCOPE_TOTAL = MANAGED_CLASSES.reduce((n, c) => n + c.total, 0)
export const COHORT_NAME = '7기'

export const PROJECTS: Project[] = [
  {
    // 다음 회차 미준비 케이스 전용 — 교안조차 안 붙었다(§notready)
    id: 'mif-5',
    name: '미프 5차',
    status: 'PLANNED',
    curricula: [],
    concepts: null,
    conceptCandidateCount: 0,
    startAt: null,
    dueAt: null,
    classes: [],
  },
  {
    id: 'mif-4',
    name: '미프 4차',
    status: 'PLANNED',
    curricula: ['AI_LLMOps v2'],
    concepts: null,
    // AI_LLMOps v2가 실제로 가르치는 항목 5건(HITL 흐름·정의·Supervisor·Critic·Snapshot) 중 3건 확정 대기
    conceptCandidateCount: 5,
    startAt: '2026-07-17T09:00',
    dueAt: '2026-07-23T18:00',
    classes: [],
  },
  {
    id: 'mif-3',
    name: '미프 3차',
    status: 'RUNNING',
    curricula: ['AI_LLMOps v2', 'Streamlit 실습 v1'],
    concepts: ['HITL Trigger', 'Graph 구성', 'State 관리'],
    conceptCandidateCount: 6,
    startAt: '2026-07-02T09:00',
    dueAt: '2026-07-16T18:00',
    classes: [
      {
        className: 'A반',
        total: 26,
        attendable: 26,
        attended: 26,
        unsubmittedTeams: 2,
        analysisFailedTeams: 0,
        interviewCount: 0,
      },
      {
        className: 'B반',
        total: 26,
        attendable: 22,
        attended: 20,
        unsubmittedTeams: 0,
        analysisFailedTeams: 0,
        interviewCount: 0,
      },
      {
        className: 'C반',
        total: 23,
        attendable: 23,
        attended: 12,
        unsubmittedTeams: 0,
        analysisFailedTeams: 1,
        interviewCount: 0,
      },
    ],
  },
  {
    id: 'mif-2',
    name: '미프 2차',
    status: 'DONE',
    curricula: ['AI_LLMOps v2'],
    concepts: ['인증 흐름', '트랜잭션', '캐시 전략'],
    conceptCandidateCount: 5,
    startAt: '2026-06-04T09:00',
    dueAt: '2026-06-18T18:00',
    classes: [
      {
        className: 'A반',
        total: 26,
        attendable: 26,
        attended: 26,
        unsubmittedTeams: 0,
        analysisFailedTeams: 0,
        interviewCount: 2,
      },
      {
        className: 'B반',
        total: 26,
        attendable: 26,
        attended: 26,
        unsubmittedTeams: 0,
        analysisFailedTeams: 0,
        interviewCount: 0,
      },
      {
        className: 'C반',
        total: 23,
        attendable: 23,
        attended: 23,
        unsubmittedTeams: 0,
        analysisFailedTeams: 0,
        interviewCount: 2,
      },
    ],
  },
  {
    id: 'mif-1',
    name: '미프 1차',
    status: 'DONE',
    curricula: ['AI_LLMOps v2'],
    concepts: ['REST 설계', '예외 처리', 'DTO 분리'],
    conceptCandidateCount: 5,
    startAt: '2026-05-07T09:00',
    dueAt: '2026-05-21T18:00',
    classes: [
      {
        className: 'A반',
        total: 26,
        attendable: 26,
        attended: 26,
        unsubmittedTeams: 0,
        analysisFailedTeams: 0,
        interviewCount: 0,
      },
      {
        className: 'B반',
        total: 26,
        attendable: 26,
        attended: 26,
        unsubmittedTeams: 0,
        analysisFailedTeams: 0,
        interviewCount: 0,
      },
      {
        className: 'C반',
        total: 23,
        attendable: 23,
        attended: 23,
        unsubmittedTeams: 0,
        analysisFailedTeams: 0,
        interviewCount: 0,
      },
    ],
  },
]

/** 이 기수에서 실제로 쓰이는 교안 목록 — 교안 필터 선택지(값은 PROJECTS에서 파생) */
export const CURRICULUM_OPTIONS: string[] = [...new Set(PROJECTS.flatMap((p) => p.curricula))]

// ── 표시 파생값 ──────────────────────────────────────────────

/** 표시용 "07-16 18:00". 저장은 ISO, 화면에서만 자른다(OP-03 formatDue와 같은 방식) */
export function formatDue(iso: string): string {
  return `${iso.slice(5, 10)} ${iso.slice(11, 16)}`
}

/*
  목업이 그려진 기준일. 미프 3차(RUNNING)가 마감 직후·응시 창 진행 중이 되는
  시점으로 잡았다(마감 07-16이 "지남"으로 보이면서도 응시 데이터는 이미 있어야
  RUNNING이 자연스럽다) — OP-03 `MOCK_TODAY`와 같은 방식(실제 `new Date()`를 쓰면
  값이 매일 달라져 대조가 안 된다).
*/
export const MOCK_TODAY = '2026-07-18'

/** 마감 임박 경고 기준(일). 기획에 없다 — OP-03 `DUE_SOON_DAYS`와 같은 값 */
export const DUE_SOON_DAYS = 7

const DAY_MS = 86_400_000
const dateOnly = (iso: string) => new Date(iso.slice(0, 10)).getTime()

export type DueLabel = { text: string; overdue: boolean; urgent: boolean }

/** 마감까지 남은 일수 — "5일 남음"·"지남"(OP-03 `dueLabel`을 그대로 들여옴) */
export function dueLabel(dueAt: string | null, now: string = MOCK_TODAY): DueLabel | null {
  if (!dueAt) return null
  const days = Math.round((dateOnly(dueAt) - dateOnly(now)) / DAY_MS)
  if (Number.isNaN(days)) return null
  return days < 0
    ? { text: '지남', overdue: true, urgent: false }
    : { text: `${days}일 남음`, overdue: false, urgent: days <= DUE_SOON_DAYS }
}

/** 진행 열 — 예정은 아직 아무 일도 없고(§notready), 진행 중은 응시 실수, 종료는 발행 완료 */
export type ProgressCell =
  { kind: 'RUNNING'; attended: number; attendable: number } | { kind: 'DONE' }

export type ActionItem = { tone: 'warning' | 'danger' | 'todo'; text: string }

/** classFilter가 있으면 그 반 하나만, 없으면 담당 반 합계 — MG-08이 반 단위로 펼 때 쓴다 */
function scopedClasses(p: Project, classFilter: ClassName | null): ClassProgress[] {
  if (!classFilter) return p.classes
  return p.classes.filter((c) => c.className === classFilter)
}

/**
 * 진행 열 — 파이프라인 현재 단계 하나만(정의서 §3). 이 데이터셋의 예정 회차는
 * "아직 아무 일도 없음"이라 제출·분석 단계를 보일 자료가 없으므로 응시·리포트만 있다.
 */
export function progressCell(p: Project, classFilter: ClassName | null): ProgressCell | null {
  if (p.status === 'PLANNED') return null
  if (p.status === 'DONE') return { kind: 'DONE' }

  const cs = scopedClasses(p, classFilter)
  const attended = cs.reduce((n, c) => n + c.attended, 0)
  const attendable = cs.reduce((n, c) => n + c.attendable, 0)
  return { kind: 'RUNNING', attended, attendable }
}

/**
 * 응시 실수 강조 색 — 0/25/50/75/100% 경계로 5단(사용자 지시). 새 토큰을 만들지
 * 않고 이미 있는 `reach-0~4`(MG-05 개념 도달 5단 스케일)를 재사용한다 — 뜻은
 * 다르지만 "5단 그라데이션"이 필요한 자리는 같다.
 */
export function attendanceReachLevel(attended: number, attendable: number): 0 | 1 | 2 | 3 | 4 {
  if (attendable <= 0) return 0
  const ratio = attended / attendable
  if (ratio >= 1) return 4
  if (ratio >= 0.75) return 3
  if (ratio >= 0.5) return 2
  if (ratio >= 0.25) return 1
  return 0
}

/** 담당 반 스코프 문구 — 헤더(`담당 A·B·C반 · 75명`)와 반 필터 라벨이 같이 쓴다 */
export function scopeLabel(classes: ClassName[], totalByClass: Record<ClassName, number>): string {
  const total = classes.reduce((n, c) => n + totalByClass[c], 0)
  return `${classes.join('·')} · ${total}명`
}

/** 조치 열 — "무엇이 밀렸는지"(정의서 §3). 비어 있으면 정상(축하 문구를 넣지 않는다) */
export function actionItems(p: Project, classFilter: ClassName | null): ActionItem[] {
  const cs = scopedClasses(p, classFilter)
  const prefix = (c: ClassProgress) => (classFilter ? '' : `${c.className} `)

  if (p.status === 'RUNNING') {
    const items: ActionItem[] = []
    for (const c of cs) {
      if (c.unsubmittedTeams > 0) {
        items.push({ tone: 'warning', text: `${prefix(c)}미제출 ${c.unsubmittedTeams}팀` })
      }
      if (c.analysisFailedTeams > 0) {
        items.push({ tone: 'danger', text: `${prefix(c)}분석 실패 ${c.analysisFailedTeams}팀` })
      }
    }
    return items
  }
  if (p.status === 'DONE') {
    return cs
      .filter((c) => c.interviewCount > 0)
      .map((c) => ({ tone: 'todo' as const, text: `${prefix(c)}면담 ${c.interviewCount}명` }))
  }
  return []
}

// ── 정렬 ──────────────────────────────────────────────────────
// 프로젝트 시작 순 · 마감 임박 순 2종(사용자 지시, 4차 반영).

export type ProjectSort = 'START' | 'DUE'

/** 날짜 하나로 비교. `nullFirst`는 정렬마다 다르다(OP-03 rules.ts byField와 같은 이유) */
function byField(a: string | null, b: string | null, nullFirst = false): number {
  if (!a && !b) return 0
  if (!a) return nullFirst ? -1 : 1
  if (!b) return nullFirst ? 1 : -1
  return a.localeCompare(b)
}

/** 마감이 이미 지났나 — `dueLabel`과 기준일이 같다(MOCK_TODAY) */
function isOverdue(p: Project): boolean {
  return p.dueAt !== null && p.dueAt < MOCK_TODAY
}

/**
 * 마감 임박 순 — **아직 안 지난 회차를 마감 이른 순으로 먼저**, 그 뒤에 **이미
 * 지난 회차를 시작 순으로 이어붙인다**(사용자 지시 그대로). 지난 회차끼리는
 * 마감 순으로 늘어놔 봐야 전부 과거라 의미가 없고, 대신 "어느 게 더 오래된
 * 회차인가"(시작 순)가 실제로 쓸모 있는 축이라는 뜻으로 이해했다.
 */
function compareProjects(a: Project, b: Project, sort: ProjectSort): number {
  if (sort === 'START') return byField(a.startAt, b.startAt)
  const aOver = isOverdue(a)
  const bOver = isOverdue(b)
  if (aOver !== bOver) return aOver ? 1 : -1
  return aOver ? byField(a.startAt, b.startAt) : byField(a.dueAt, b.dueAt)
}

// ── 조회(mock API) ──────────────────────────────────────────
// 백엔드 연동 시 이 블록만 fetch로 바꾼다 — 화면·컴포넌트는 시그니처가 이미 실제 모양이다.

/** 목 지연 — 로딩 상태가 실제로 보이는지 개발 중 확인하려면 필요하다(OP-03과 같은 값) */
const LATENCY_MS = 250
const delay = <T>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS))

export type ProjectQuery = {
  search?: string
  classFilter?: ClassName
  curriculum?: string
  status?: ProjectStatus
  sort?: ProjectSort
}

export type ProjectListItem = {
  project: Project
  progress: ProgressCell | null
  actions: ActionItem[]
}

export type ProjectListResult = {
  items: ProjectListItem[]
  total: number
  /**
   * 상태별 개수 — **필터와 무관한 전체 모집단 기준**이다(OP-03 `ProjectPage.counts`와
   * 같은 이유). 상태 필터 옵션에 `전체 (6)`처럼 개수를 실어 "고르기 전에 분포를
   * 안다"를 준다.
   */
  counts: Record<ProjectStatus, number>
}

/**
 * `GET /cohorts/{cohortId}/manager/projects` — 담당 반 스코프의 회차 목록.
 *
 * 검색·필터·정렬은 서버가 처리한다(OP-03과 같은 경계 원칙). 반 필터는 **그 반
 * 데이터가 실제로 있는 회차만** 남긴다(예정 회차는 `classes`가 비어 있어 걸러진다)
 * — 진행·조치 값 자체를 반 단위로 다시 계산하지는 않는다(그건 MG-08 몫).
 * `PROJECTS_UNAVAILABLE`(케이스 표)은 실제 연동에서만 발생하는 경로라 목에서는
 * 일부러 던지지 않는다 — 화면의 실패 분기는 `useAsync`가 갖는다.
 */
export function listManagerProjects(q: ProjectQuery): Promise<ProjectListResult> {
  const search = q.search?.trim().toLowerCase() ?? ''

  const filtered = PROJECTS.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search)) return false
    if (q.classFilter && !p.classes.some((c) => c.className === q.classFilter)) return false
    if (q.curriculum && !p.curricula.includes(q.curriculum)) return false
    if (q.status && p.status !== q.status) return false
    return true
  })

  const sorted = [...filtered].sort((a, b) => compareProjects(a, b, q.sort ?? 'DUE'))

  const items = sorted.map((project) => ({
    project,
    progress: progressCell(project, null),
    actions: actionItems(project, null),
  }))

  const counts: Record<ProjectStatus, number> = { PLANNED: 0, RUNNING: 0, DONE: 0 }
  for (const p of PROJECTS) counts[p.status]++

  return delay({ items, total: items.length, counts })
}
