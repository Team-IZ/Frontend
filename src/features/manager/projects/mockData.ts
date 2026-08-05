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
   * 빈 배열 = 교안 없음. 개념 자체가 구조적으로 없는 회차(빅프 등)는 `concepts`가
   * 항상 빈 배열이다, 아직 안 붙은 것뿐이면 다른 문구가 붙는다(§notready 케이스).
   */
  curricula: string[]
  /** 검증 개념 3건. null = 미확정(구조적으로 개념이 없는 회차는 빈 배열) */
  concepts: string[] | null
  /**
   * 연결한 교안이 가르치는 항목 수(OP-03 `conceptCandidateCount`와 같은 자리) —
   * 미확정일 때 "후보 N건에서 3건"에 쓴다. 교안이 없거나 개념 자체가 없으면 0.
   */
  conceptCandidateCount: number
  /** 시작 ISO. 미설정이면 null(§notready 케이스 · 미프 5차) */
  startAt: string | null
  /** 제출 마감 ISO. 미설정이면 null */
  dueAt: string | null
  /** 부가문구(빅프처럼 회차 번호 대신 붙는 설명) */
  note?: string
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
    id: 'bigp',
    name: '빅프',
    status: 'PLANNED',
    curricula: [],
    concepts: [],
    conceptCandidateCount: 0,
    startAt: '2026-08-01T09:00',
    dueAt: '2026-09-26T23:59',
    note: '총 3회 · 첫 동작 · +2주 · 마감',
    classes: [],
  },
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

/**
 * 교안·검증 개념이 구조적으로 없는 회차(예: 빅프)인지 — 예전엔 `kind === 'BIG'`으로
 * 갈랐지만, 미니/빅 프로젝트 구분을 없애면서(사용자 지시) `concepts`가 **미확정(null)이
 * 아니라 빈 배열**이라는 데이터 모양 자체로 판정한다. 미확정은 아직 안 정한 것이고,
 * 빈 배열은 애초에 정할 개념이 없다는 뜻이라 값이 다르다.
 */
export function hasNoCurriculum(p: Project): boolean {
  return p.concepts !== null && p.concepts.length === 0
}

/**
 * 이름 뒤에 붙는 조사 — 받침으로 갈린다(`한소율을`/`강지우를`). `을(를)`처럼 괄호로
 * 얼버무리면 읽는 사람이 괄호를 건너뛰며 읽어야 한다. OP-03 `labels.ts`의
 * `withParticle`과 같은 함수 — feature 간 교차 import가 안 돼(REACH_STYLE과 같은
 * 이유) 복제했다. 숫자·영문으로 끝나면 받침을 알 수 없으므로 받침 없음으로 둔다.
 */
export function withParticle(name: string, withBatchim: string, without: string): string {
  const last = name.trim().at(-1) ?? ''
  const code = last.charCodeAt(0)
  const isHangul = code >= 0xac00 && code <= 0xd7a3
  const hasBatchim = isHangul && (code - 0xac00) % 28 !== 0
  return `${name}${hasBatchim ? withBatchim : without}`
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

/**
 * 제출 마감이 이미 지났는가 — 리포트 발행 버튼이 마감 전 클릭을 경고하는 데 쓴다
 * (사용자 지시). 마감이 없는 프로젝트는 막을 이유가 없어 항상 true(경고 없음).
 */
export function deadlinePassed(dueAt: string | null, now: string = MOCK_TODAY): boolean {
  if (!dueAt) return true
  return dateOnly(dueAt) < dateOnly(now)
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

/*
  ════════════════════════════════════════════════════════════════
  MG-08 프로젝트 상세 — 팀 편성 · 제출 현황 · 결과
  ════════════════════════════════════════════════════════════════

  정의서(MG-08-project-detail.md) 그대로: 탭 순서가 회차 진행 순서(팀 편성 →
  제출 현황 → 결과), 구성 탭 없음(교안·검증개념·요구사항은 OP-04 소관, 헤더로만
  읽는다). 요구사항 이름 자체는 OP-04가 정의하는 값이라 이 화면 개발 범위
  밖이지만, 목업 데이터가 있어야 화면을 그릴 수 있어 프로젝트별로 3건씩
  직접 지어 넣었다(⚠ 실제 값 아님, OP-04 데이터와 연동되면 이 배열은 지운다).

  ⚠ 판단 기록
  · **6개 프로젝트에 팀 편성 5국면을 하나씩 나눠 배정했다** — 정의서가 정한
    국면 전환은 실제로는 한 회차가 시간에 따라 지나가는 것이지만, 목업은
    스냅샷이라 한 회차로 5국면을 다 보여줄 수 없다. bigp=편성 전 ·
    mif-5=전원 배정 · mif-4=편성 중 · mif-3=제출 시작됨 · mif-1·2=종료(잠김)로
    나눠서, MG-07 목록에서 아무 행이나 눌러도 서로 다른 국면을 볼 수 있게 했다.
    확정됨(④)은 mif-5에서 `팀 편성 완료`를 누르면 실제로 전이한다(국면들이
    전부 상호 배타적인 저장 상태가 아니라 액션으로 연결된 하나의 흐름이라는
    걸 보여주려는 의도).
  · **인원 75명(A·B·C반) 전체를 손으로 채우지 않았다.** MG-07 `PROJECTS`의
    반별 합계와 이 파일의 팀 편성 인원은 **독립된 값**이다(MG-07 자체 주석의
    "실제 서버라면 서로 다른 집계 쿼리라 산수가 딱 맞물릴 필요가 없다"와 같은
    이유) — 대표 인원 24명(`ROSTER`)만으로 팀 편성 전 화면을 반복해서
    보여준다. 정의서 §3 "25명·8팀 규모" 예시와 얼추 맞춘 크기다.
  · **결과 탭 개인 표기는 와이어프레임(`#page-result-person` 계열)을 그대로
    베꼈다.** 김민준 · HITL Trigger 조건 항목은 축별 근거 문장까지 와이어의
    글자 그대로다 — 나머지 사람·개념은 같은 모양을 프로그램으로 찍어낸다
    (`concept()` 헬퍼, MG-06 `getTraineeDetailOverlay` 폴백과 같은 절약).
  · **집단 미달·개인별 "막힘 N"·재응시 대상 개수는 손으로 세지 않고
    `buildProjectResult`가 사람 배열에서 계산한다** — 사람 수가 늘거나 값이
    바뀌어도 합계가 항상 맞는다(손 계산은 MG-07 초반 세션에서 반복적으로
    틀렸던 전례가 있다).
  · **A안(점수 비노출)을 기본으로 뒀다** — MG-06에서 이미 축별 점수를 버리고
    도달 단계 서술형으로 간 방향과 맞춰서다. B안 데이터(축별 0~5점)도
    같이 만들어 뒀으니(`AxisStepResult.score`) 렌더 확인 후 B안으로 정해지면
    `PersonResultPanel`에 토글만 추가하면 된다 — 데이터를 다시 만들 필요는
    없다.
  · **자동 배분은 "동일 도달단계 안에서만 순서를 흔드는" 시드 셔플 + 뱀
    배분 + 겹침 재추첨(최대 20회)으로 구현했다.** `Math.random`을 안 쓴
    이유는 매 렌더마다 결과가 바뀌면 사용자가 렌더 확인 중에 재현을 못 하기
    때문이다(시도 번호를 시드로 쓰는 결정적 셔플).
*/

export type TraineeId = string
export type ReachLevel = 0 | 1 | 2 | 3 | 4

/** 팀 편성·결과 화면이 공유하는 사람 한 명의 원자 정보 */
export type PersonRef = {
  id: TraineeId
  name: string
  /** 직전 회차 도달 단계 — 자동 배분(뱀 배분) 정렬 기준. 1차 프로젝트 등 기록이 없으면 null */
  prevReach: ReachLevel | null
  /** 직전 회차에 속했던 팀(겹침 재추첨 판정용). 없으면 null */
  prevTeamId: string | null
}

export type Team = { id: string; name: string; memberIds: TraineeId[] }

/**
 * 팀 편성 5국면(정의서 §3 표) — ① 편성 전 ② 편성 중 ③ 전원 배정 ④ 확정됨
 * ⑤ 제출 시작됨. `teams.length`·`unassigned.length`에서 파생되지만, ④↔⑤는
 * "제출이 실제로 시작됐는가"라는 배열만으로는 알 수 없는 사실이라 별도 필드로 둔다.
 */
export type TeamPhase = 'BEFORE' | 'FORMING' | 'READY' | 'LOCKED' | 'SUBMITTING'
export const TEAM_PHASE_LABEL: Record<TeamPhase, string> = {
  BEFORE: '편성 전',
  FORMING: '편성 중',
  READY: '전원 배정',
  LOCKED: '확정됨',
  SUBMITTING: '제출 시작됨',
}

/** 요구사항 판정 4종(정의서 §3 "요구사항 충족" 표) — `?`(확인 필요) 등급은 의도적으로 없다 */
export type RequirementStatus = 'MET' | 'UNUSED' | 'EMPTY' | 'NOMATCH'
/**
 * `evidence` — 파일:줄 근거(와이어 "LikeButton.tsx:8-24 · api/like.ts:12"). `detail`은
 * 매니저가 읽는 한 줄 설명, `evidence`는 그 판정이 어느 코드에서 나왔는지 — 둘 다
 * 있어야 "구현 근거"라는 이 화면의 목적이 선다(사용자 지시로 추가, 렌더 비교 후).
 */
export type RequirementResult = {
  name: string
  status: RequirementStatus
  detail: string
  evidence: string
}

export type AnalysisStatus = 'PENDING' | 'DONE' | 'FAILED'

/** 팀 단위 제출 — `submittedAt`이 null이면 그 팀은 아직 제출 전(미제출) */
export type TeamSubmission = {
  submittedAt: string | null
  repoUrl: string | null
  submitterName: string | null
  analysisStatus: AnalysisStatus | null
  requirements: RequirementResult[]
}

/**
 * 개인 응시 상태. `BLOCKED`는 "미응시"와 다르다 — 코드가 없거나(미제출)
 * 분석이 실패해 **응시 자체가 열리지 않은** 상태다(정의서 §3 "박도윤 —" 표기).
 */
export type AttendanceStatus = 'DONE' | 'AVAILABLE' | 'NOT_STARTED' | 'BLOCKED'
export type PersonAttendance = {
  status: AttendanceStatus
  deadlineLabel: string | null
  /** 실제로 응시를 마친 시각(`YYYY-MM-DDTHH:mm`) — `DONE`일 때만 값이 있다. 제출 현황
   *  표의 "제출" 열이 팀 행에선 제출 시각을, 개인 행에선 이 값을 보여준다(사용자 지시) */
  completedAt: string | null
}

export const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  DONE: '응시 완료',
  AVAILABLE: '응시 가능',
  NOT_STARTED: '미응시',
  BLOCKED: '—',
}

/** 팀 행의 요구사항 충족 표기 — "✓ 2 · ✗ 1"(정의서 §3, 순서에 의미 있는 ✓✓✗ 지양) */
export function requirementTally(reqs: RequirementResult[]): { met: number; unmet: number } {
  return {
    met: reqs.filter((r) => r.status === 'MET').length,
    unmet: reqs.filter((r) => r.status !== 'MET').length,
  }
}

// ── 결과 탭 — 개인 결과(5-2 표기, 4단 사다리) ──────────────────

/**
 * 도움 횟수 0~2회 — 화면 라벨은 이 값 단독이 아니라 `passed`와 합쳐 4범주(합격·
 * 합격(도움 N회)·불합격)로 만든다(`PersonResultPanel.tsx`의 `stepStatusLabel`,
 * 사용자 지시로 렌더 비교 다음 세션 반영). 그래서 여기엔 단순 라벨 상수를 두지
 * 않는다 — 도움 횟수만으로는 합격인지 불합격인지 알 수 없어서 반쪽짜리 라벨이 된다.
 */
export type HelpCount = 0 | 1 | 2

export type AxisStepId = 'CODE_UNDERSTAND' | 'DESIGN_LOGIC' | 'ALT_COMPARE' | 'COUNTER_CASE'
export const AXIS_STEP_ORDER: AxisStepId[] = [
  'CODE_UNDERSTAND',
  'DESIGN_LOGIC',
  'ALT_COMPARE',
  'COUNTER_CASE',
]
export const AXIS_STEP_LABEL: Record<AxisStepId, string> = {
  CODE_UNDERSTAND: '코드이해',
  DESIGN_LOGIC: '설계논리',
  ALT_COMPARE: '대안비교',
  COUNTER_CASE: '반례대응',
}

/** 단계 하나의 판정 — `score`는 B안(축별 점수 병기)에서만 쓴다(경계 3점) */
export type AxisStepResult = { passed: boolean; help: HelpCount; score: number; note: string }

export type ConceptOutcome = {
  concept: string
  /** false면 그 개념이 코드에 없어 못 물었다 — "못한 것"과 다르다(정의서 F3) */
  inCode: boolean
  /** 연속으로 통과한 단계 수(0~4) — "N단 도달" */
  reachLevel: ReachLevel
  /** 재응시 대상 개념인가(개념별로 붙는다, 사람 전체가 아니라) */
  retryTarget: boolean
  /** 실제로 물은 단계만 키가 있다 — 멈춘 뒤는 "미도달"이라 아예 없다(화면 라벨은 PersonResultPanel 참고) */
  steps: Partial<Record<AxisStepId, AxisStepResult>>
}

export type PersonResult = {
  person: PersonRef
  concepts: ConceptOutcome[]
  /** 재응시 발송 완료일. null이면 아직 안 보냈다(체크 해제로 대상에서 뺄 수 있다) */
  retrySentAt: string | null
  /** 발송할 때 매니저가 고른 기한(`YYYY-MM-DDTHH:mm`). retrySentAt과 함께 세팅된다 */
  retryDueAt: string | null
  /** 재응시를 실제로 마친 시각. null이면 발송은 됐어도 아직 안 봤다 — 트레이니 쪽 응시 기록(목업은 정적 시드) */
  retryTakenAt: string | null
}

/** 개인 표의 "막힘 N" 배지 — inCode인데 재응시 대상인 개념 수 */
export function stuckConceptCount(p: PersonResult): number {
  return p.concepts.filter((c) => c.inCode && c.retryTarget).length
}

/**
 * 재응시 발송 대상 개념 이름 — 반 전체 경고(`classWarnings`)에 이미 뜬 개념은 뺀다
 * (와이어 "Graph 구성은 목록에 없어요 — 반 절반이 막힌 개념이라 반 전체에 안내하는
 * 편이 맞습니다"). 개인 사유와 반 사유를 겹쳐 보여주지 않는다는 정의서 §3 원칙 그대로다.
 */
export function retryConceptNames(p: PersonResult, classWarnings: ClassWarning[]): string[] {
  const excluded = new Set(classWarnings.map((w) => w.concept))
  return p.concepts.filter((c) => c.retryTarget && !excluded.has(c.concept)).map((c) => c.concept)
}

export type RetryStatus = '재응시 가능' | '재응시 발송 완료' | '재응시 완료'

/**
 * 응시 여부 3분류 — 재응시 가능(아직 안 보냄) · 재응시 발송 완료(보냈지만 아직 안 봄) ·
 * 재응시 완료(다시 봄). `ResultTab`의 발송 현황 표와 `RetrySendDialog`의 체크리스트가
 * 이 함수 하나로 같은 값을 쓴다 — 전에는 다이얼로그가 "이미 다시 봤어요"를 따로
 * 하드코딩해서 발송만 되고 아직 안 본 사람한테도 "봤다"고 잘못 표시됐다(사용자 지적).
 */
export function retryStatus(p: PersonResult): RetryStatus {
  if (!p.retrySentAt) return '재응시 가능'
  return p.retryTakenAt ? '재응시 완료' : '재응시 발송 완료'
}

export type ConceptAggregate = {
  concept: string
  stuckCount: number
  notInCodeCount: number
  stuckNames: string[]
  notInCodeNames: string[]
}

/** 반 절반 이상이 한 개념에서 막히면(정의서 §3) — 개인 위험 사유에서 빼고 여기서만 경고한다 */
export type ClassWarning = { concept: string; ratioLabel: string }

export type ProjectResult = {
  reportPublished: boolean
  attendedCount: number
  totalCount: number
  /** 개념 1개 이상에서 2단 미달(불합격)인 사람 수 — "불합격 인원" 카드, 재응시 대상의 절반 */
  retryTargetCount: number
  /** 마감이 지나도록 응시를 시작조차 안 한 사람 수(`AttendanceStatus.NOT_STARTED`) — 재응시 대상의 나머지 절반.
   *  코드가 아직 분석되지 않아 응시 자체가 안 열린 `BLOCKED`는 포함하지 않는다(그건 독촉 대상이지 재응시 대상이 아니다) */
  notStartedCount: number
  classWarnings: ClassWarning[]
  conceptAggregates: ConceptAggregate[]
  people: PersonResult[]
}

export type ProjectDetail = {
  projectId: string
  teamPhase: TeamPhase
  /** 종료된 회차 — 독촉·자동 배분·팀 이동 등 편성 액션을 잠근다(과거 회차라 더 손댈 게 없다) */
  locked: boolean
  /** OP-04가 정의하는 값 — 이 화면은 읽기만 한다(§7 "안 하는 것") */
  requirementNames: string[]
  teams: Team[]
  unassigned: PersonRef[]
  /** 팀id → 제출. LOCKED 이상부터 의미 있다. 키가 없으면 그 팀은 미제출 */
  submissions: Partial<Record<string, TeamSubmission>>
  /** 개인id → 응시. SUBMITTING부터, 그것도 분석이 끝난 팀 소속만 채운다 */
  attendance: Partial<Record<TraineeId, PersonAttendance>>
  result: ProjectResult | null
}

// ── 대표 인원 24명 — 팀 편성 화면들이 공유한다(위 판단 기록 참고) ──

export const ROSTER: PersonRef[] = [
  { id: 't1', name: '김민준', prevReach: 3, prevTeamId: 'P1' },
  { id: 't2', name: '이서준', prevReach: 2, prevTeamId: 'P1' },
  { id: 't3', name: '정하늘', prevReach: 1, prevTeamId: 'P1' },
  { id: 't4', name: '박도윤', prevReach: 4, prevTeamId: 'P2' },
  { id: 't5', name: '최유나', prevReach: 0, prevTeamId: 'P2' },
  { id: 't6', name: '강지우', prevReach: 3, prevTeamId: 'P2' },
  { id: 't7', name: '윤서연', prevReach: 4, prevTeamId: 'P3' },
  { id: 't8', name: '임채원', prevReach: 2, prevTeamId: 'P3' },
  { id: 't9', name: '한소율', prevReach: 1, prevTeamId: 'P3' },
  { id: 't10', name: '오태양', prevReach: 3, prevTeamId: 'P4' },
  { id: 't11', name: '신다은', prevReach: 2, prevTeamId: 'P4' },
  { id: 't12', name: '조민재', prevReach: 0, prevTeamId: 'P4' },
  { id: 't13', name: '배주안', prevReach: 4, prevTeamId: 'P5' },
  { id: 't14', name: '황서아', prevReach: 1, prevTeamId: 'P5' },
  { id: 't15', name: '서예준', prevReach: 2, prevTeamId: 'P5' },
  { id: 't16', name: '문지호', prevReach: 3, prevTeamId: 'P6' },
  { id: 't17', name: '권나윤', prevReach: 0, prevTeamId: 'P6' },
  { id: 't18', name: '홍시우', prevReach: 2, prevTeamId: 'P6' },
  { id: 't19', name: '노은채', prevReach: 1, prevTeamId: 'P7' },
  { id: 't20', name: '백승민', prevReach: 3, prevTeamId: 'P7' },
  { id: 't21', name: '심하윤', prevReach: 4, prevTeamId: 'P7' },
  { id: 't22', name: '안도현', prevReach: 2, prevTeamId: 'P8' },
  { id: 't23', name: '유리안', prevReach: 1, prevTeamId: 'P8' },
  { id: 't24', name: '장서진', prevReach: 3, prevTeamId: 'P8' },
]

function byId(id: TraineeId): PersonRef {
  const p = ROSTER.find((r) => r.id === id)
  if (!p) throw new Error(`알 수 없는 교육생 id: ${id}`)
  return p
}

function pickTeam(id: string, name: string, memberIds: TraineeId[]): Team {
  return { id, name, memberIds }
}

// ── mif-3(제출 시작됨) 요구사항·제출·응시 ────────────────────────

const MIF3_REQUIREMENTS = ['HITL 트리거 함수 연결', 'Graph 노드 구성', 'State 갱신 로직']

const MIF3_TEAMS: Team[] = [
  pickTeam('mif3-1', '1팀', ['t6', 't7', 't8']),
  pickTeam('mif3-2', '2팀', ['t9', 't10', 't11']),
  pickTeam('mif3-3', '3팀', ['t1', 't2', 't3']),
  pickTeam('mif3-4', '4팀', ['t4', 't5']),
  pickTeam('mif3-5', '5팀', ['t12', 't13', 't14']),
  pickTeam('mif3-6', '6팀', ['t15', 't16', 't17']),
  pickTeam('mif3-7', '7팀', ['t18', 't19', 't20']),
  pickTeam('mif3-8', '8팀', ['t21', 't22', 't23', 't24']),
]

const MIF3_SUBMISSIONS: Partial<Record<string, TeamSubmission>> = {
  'mif3-1': {
    submittedAt: '2026-07-12T22:10',
    repoUrl: 'github.com/team-a/mif3-1',
    submitterName: '강지우',
    analysisStatus: 'DONE',
    requirements: [
      {
        name: MIF3_REQUIREMENTS[0],
        status: 'MET',
        detail: 'HITL 이벤트가 발생하면 트리거 함수가 실제로 호출됩니다',
        evidence: 'hitl/trigger.py:14-22 · graph/nodes.py:8',
      },
      {
        name: MIF3_REQUIREMENTS[1],
        status: 'MET',
        detail: '정의한 노드들이 그래프에 연결되어 실행됩니다',
        evidence: 'graph/builder.py:30-48',
      },
      {
        name: MIF3_REQUIREMENTS[2],
        status: 'MET',
        detail: '상태 값이 각 노드를 지날 때마다 갱신됩니다',
        evidence: 'graph/state.py:11-19',
      },
    ],
  },
  'mif3-2': {
    submittedAt: '2026-07-13T20:40',
    repoUrl: 'github.com/team-a/mif3-2',
    submitterName: '한소율',
    analysisStatus: 'DONE',
    requirements: [
      {
        name: MIF3_REQUIREMENTS[0],
        status: 'MET',
        detail: 'HITL 이벤트가 발생하면 트리거 함수가 실제로 호출됩니다',
        evidence: 'hitl/trigger.py:14-22 · graph/nodes.py:8',
      },
      {
        name: MIF3_REQUIREMENTS[1],
        status: 'MET',
        detail: '정의한 노드들이 그래프에 연결되어 실행됩니다',
        evidence: 'graph/builder.py:27-41',
      },
      {
        name: MIF3_REQUIREMENTS[2],
        status: 'UNUSED',
        detail: '자리는 만들었지만 쓰이지 않았어요',
        evidence: 'graph/state.py:9 · update_state를 부르는 곳이 없음',
      },
    ],
  },
  // 정의서 §3 예시("3팀 · 임채원이 제출 · ✓2 · ✗1")와 같은 모양
  'mif3-3': {
    submittedAt: '2026-07-13T23:55',
    repoUrl: 'github.com/team-a/mif3-3',
    submitterName: '김민준',
    analysisStatus: 'DONE',
    requirements: [
      {
        name: MIF3_REQUIREMENTS[0],
        status: 'MET',
        detail: 'HITL 이벤트가 발생하면 트리거 함수가 실제로 호출됩니다',
        evidence: 'hitl/trigger.py:16-25 · graph/nodes.py:8',
      },
      {
        name: MIF3_REQUIREMENTS[1],
        status: 'MET',
        detail: '정의한 노드들이 그래프에 연결되어 실행됩니다',
        evidence: 'graph/builder.py:22-35',
      },
      {
        name: MIF3_REQUIREMENTS[2],
        status: 'EMPTY',
        detail: '함수는 있지만 안이 비어 있어요',
        evidence: 'graph/state.py:11 · update_state() 본문 없음',
      },
    ],
  },
  'mif3-6': {
    submittedAt: '2026-07-14T09:15',
    repoUrl: 'github.com/team-b/mif3-6',
    submitterName: '서예준',
    analysisStatus: 'FAILED',
    requirements: [],
  },
  'mif3-7': {
    submittedAt: '2026-07-11T18:30',
    repoUrl: 'github.com/team-b/mif3-7',
    submitterName: '홍시우',
    analysisStatus: 'DONE',
    requirements: [
      {
        name: MIF3_REQUIREMENTS[0],
        status: 'MET',
        detail: 'HITL 이벤트가 발생하면 트리거 함수가 실제로 호출됩니다',
        evidence: 'hitl/trigger.py:10-18 · graph/nodes.py:6',
      },
      {
        name: MIF3_REQUIREMENTS[1],
        status: 'NOMATCH',
        detail: '관련된 코드를 찾지 못했어요',
        evidence: '—',
      },
      {
        name: MIF3_REQUIREMENTS[2],
        status: 'UNUSED',
        detail: '자리는 만들었지만 쓰이지 않았어요',
        evidence: 'graph/state.py:7 · update_state를 부르는 곳이 없음',
      },
    ],
  },
  'mif3-8': {
    submittedAt: '2026-07-15T10:05',
    repoUrl: 'github.com/team-c/mif3-8',
    submitterName: '심하윤',
    analysisStatus: 'DONE',
    requirements: [
      {
        name: MIF3_REQUIREMENTS[0],
        status: 'MET',
        detail: 'HITL 이벤트가 발생하면 트리거 함수가 실제로 호출됩니다',
        evidence: 'hitl/trigger.py:12-20 · graph/nodes.py:9',
      },
      {
        name: MIF3_REQUIREMENTS[1],
        status: 'MET',
        detail: '정의한 노드들이 그래프에 연결되어 실행됩니다',
        evidence: 'graph/builder.py:19-33',
      },
      {
        name: MIF3_REQUIREMENTS[2],
        status: 'MET',
        detail: '상태 값이 각 노드를 지날 때마다 갱신됩니다',
        evidence: 'graph/state.py:14-21',
      },
    ],
  },
  // mif3-4·mif3-5는 키가 없다 = 미제출(정의서 §3 "박도윤 —"·"최유나 —")
}

const MIF3_ATTENDANCE: Partial<Record<TraineeId, PersonAttendance>> = {
  // "D-2일"의 "일"을 뺐다 — "응시 가능 / D-2"처럼 "/"로 라벨과 갈라 쓰니 "일"이 군더더기였다
  // (사용자 지시). completedAt은 그 사람이 속한 팀의 제출 시각 이후 1~2일 안 값으로 채웠다 —
  // 제출 현황 표 "제출" 열이 개인 행에서 이 값을 쓴다(사용자 지시).
  t6: { status: 'DONE', deadlineLabel: null, completedAt: '2026-07-14T10:20' },
  t7: { status: 'DONE', deadlineLabel: null, completedAt: '2026-07-14T11:05' },
  t8: { status: 'DONE', deadlineLabel: null, completedAt: '2026-07-13T15:40' },
  t9: { status: 'DONE', deadlineLabel: null, completedAt: '2026-07-15T09:30' },
  t10: { status: 'AVAILABLE', deadlineLabel: 'D-2', completedAt: null },
  // NOT_STARTED도 deadlineLabel을 채운다 — 응시 창은 "팀의 코드 분석 완료 시점"에 함께
  // 열리므로(정의서 v2 §14 "응시 창 — 분석 완료로부터 기산") 같은 팀(2팀=t9·t10·t11)의
  // AVAILABLE 팀원과 마감이 같다. 전엔 null로 비워놔 독촉 문구에 쓸 "N일"을 낼 수 없었다.
  t11: { status: 'NOT_STARTED', deadlineLabel: 'D-2', completedAt: null },
  // 정의서 §3 예시(김민준 응시완료·이서준 응시가능·정하늘 미응시)의 기한 표기만 수정 —
  // "D-19h"는 실제로 안 쓰는 표기(다른 항목은 전부 "D-N" 일 단위). 하루 미만 남았을 땐
  // 일 단위로 뭉개지 않고 "N시간 남음"으로 쓴다(사용자 지시)
  t1: { status: 'DONE', deadlineLabel: null, completedAt: '2026-07-15T14:00' },
  t2: { status: 'AVAILABLE', deadlineLabel: '19시간 남음', completedAt: null },
  t3: { status: 'NOT_STARTED', deadlineLabel: '19시간 남음', completedAt: null }, // 3팀 팀원 t2와 같은 창
  t18: { status: 'DONE', deadlineLabel: null, completedAt: '2026-07-13T16:45' },
  t19: { status: 'AVAILABLE', deadlineLabel: 'D-1', completedAt: null },
  t20: { status: 'NOT_STARTED', deadlineLabel: 'D-1', completedAt: null }, // 7팀 팀원 t19와 같은 창
  t21: { status: 'DONE', deadlineLabel: null, completedAt: '2026-07-16T13:20' },
  t22: { status: 'DONE', deadlineLabel: null, completedAt: '2026-07-16T14:10' },
  t23: { status: 'AVAILABLE', deadlineLabel: 'D-3', completedAt: null },
  t24: { status: 'DONE', deadlineLabel: null, completedAt: '2026-07-17T09:50' },
  // t4·t5(미제출 팀)·t12~t17(미제출·분석실패 팀)은 키가 없다 = BLOCKED("—") — 응시 자체가
  // 안 열려 "응시 가능한 날짜가 N일 남았습니다"를 보낼 수 없다. 독촉 대상에서 뺀다(NudgeDialog).
}

// ── 결과 탭 데이터 생성기 — 사람 수만큼 찍어내고 집계는 프로그램이 센다 ──

const GENERIC_NOTE: Record<AxisStepId, string> = {
  CODE_UNDERSTAND: '요소들이 어떻게 이어지는지 설명했다',
  DESIGN_LOGIC: '고려사항을 선택과 연결지어 설명했다',
  ALT_COMPARE: '다른 방식과 비교해 근거를 댔다',
  COUNTER_CASE: '예외 상황에서의 동작을 답했다',
}
/** 미달(멈춤) 문구 — DESIGN_LOGIC은 정의서 §3 예시 문장 그대로 */
const GENERIC_STOP_NOTE: Record<AxisStepId, string> = {
  CODE_UNDERSTAND: '요소들이 어떻게 이어지는지 설명하지 못했다',
  DESIGN_LOGIC: '고려사항을 나열했으나 선택과 연결되지 않았다',
  ALT_COMPARE: '다른 방식과 비교하지 못했다',
  COUNTER_CASE: '예외 상황에서의 동작을 답하지 못했다',
}

/** B안 축별 점수 — 경계 3점(통과 0회도움=5 ~ 미달 2회도움=0) */
function scoreFor(passed: boolean, help: HelpCount): number {
  if (passed) return help === 0 ? 5 : help === 1 ? 4 : 3
  return help === 0 ? 2 : help === 1 ? 1 : 0
}

/** 개념 하나 찍어내기 — reach단계까지 통과, 그다음 한 단계만 멈추고 나머지는 미도달 */
function concept(
  name: string,
  inCode: boolean,
  reach: ReachLevel,
  passHelp: HelpCount = 0,
  stopHelp: HelpCount = 2,
): ConceptOutcome {
  const steps: Partial<Record<AxisStepId, AxisStepResult>> = {}
  if (inCode) {
    AXIS_STEP_ORDER.forEach((id, i) => {
      if (i < reach) {
        steps[id] = {
          passed: true,
          help: passHelp,
          score: scoreFor(true, passHelp),
          note: GENERIC_NOTE[id],
        }
      } else if (i === reach) {
        steps[id] = {
          passed: false,
          help: stopHelp,
          score: scoreFor(false, stopHelp),
          note: GENERIC_STOP_NOTE[id],
        }
      }
    })
  }
  return {
    concept: name,
    inCode,
    reachLevel: inCode ? reach : 0,
    // 재응시 대상 = 2단(설계논리) 도달 실패. 2단까지 갔으면(3·4단 미도달이어도) 대상 아님(사용자 지시)
    retryTarget: inCode && reach < 2,
    steps,
  }
}

function person(
  id: TraineeId,
  concepts: ConceptOutcome[],
  retrySentAt: string | null = null,
  retryDueAt: string | null = null,
  retryTakenAt: string | null = null,
): PersonResult {
  return { person: byId(id), concepts, retrySentAt, retryDueAt, retryTakenAt }
}

/** 집단 미달·"막힘 N"·재응시 대상 개수를 사람 배열에서 직접 센다(손 계산 금지) */
function buildProjectResult(
  people: PersonResult[],
  reportPublished: boolean,
  attendance: Partial<Record<TraineeId, PersonAttendance>> = {},
): ProjectResult {
  const conceptNames = [...new Set(people.flatMap((p) => p.concepts.map((c) => c.concept)))]

  const conceptAggregates: ConceptAggregate[] = conceptNames.map((conceptName) => {
    const stuckNames: string[] = []
    const notInCodeNames: string[] = []
    for (const p of people) {
      const c = p.concepts.find((x) => x.concept === conceptName)
      if (!c) continue
      if (!c.inCode) notInCodeNames.push(p.person.name)
      else if (c.retryTarget) stuckNames.push(p.person.name)
    }
    return {
      concept: conceptName,
      stuckCount: stuckNames.length,
      notInCodeCount: notInCodeNames.length,
      stuckNames,
      notInCodeNames,
    }
  })

  const classWarnings: ClassWarning[] = conceptAggregates
    .filter((a) => people.length > 0 && a.stuckCount / people.length >= 0.5)
    .map((a) => ({
      concept: a.concept,
      ratioLabel: `${a.stuckCount}/${people.length}명(${Math.round((a.stuckCount / people.length) * 100)}%)`,
    }))

  const retryTargetCount = people.filter((p) => p.concepts.some((c) => c.retryTarget)).length
  const notStartedCount = Object.values(attendance).filter(
    (a) => a?.status === 'NOT_STARTED',
  ).length

  return {
    reportPublished,
    attendedCount: people.length,
    totalCount: people.length,
    retryTargetCount,
    notStartedCount,
    classWarnings,
    conceptAggregates,
    people,
  }
}

// mif-3 결과 — 마감은 지났지만(MOCK_TODAY 기준) 아직 발행 전. 응시 완료 9명만 결과가 있다.
const MIF3_CONCEPTS = { hitl: 'HITL Trigger', graph: 'Graph 구성', state: 'State 관리' }

const MIF3_RESULT = buildProjectResult(
  [
    // 정의서 §3 개인 결과 예시(김민준·HITL Trigger 조건)를 글자 그대로 재현
    person('t1', [
      {
        concept: MIF3_CONCEPTS.hitl,
        inCode: true,
        reachLevel: 1,
        retryTarget: true,
        steps: {
          CODE_UNDERSTAND: {
            passed: true,
            help: 0,
            score: 5,
            note: '요소들이 어떻게 이어지는지 설명했다. "state를 받아서 True/False로 알려주는 함수"라며 반환값과 호출부의 관계를 짚었다.',
          },
          DESIGN_LOGIC: {
            passed: false,
            help: 2,
            score: 0,
            note: '고려사항을 나열했으나 선택과 연결되지 않았다. 두 번 다시 설명한 뒤에도 교안의 세 번째 조건을 왜 뺐는지는 "잘 기억이 안 납니다"로 끝났다.',
          },
        },
      },
      concept(MIF3_CONCEPTS.graph, true, 2, 0, 2),
      concept(MIF3_CONCEPTS.state, true, 4),
    ]),
    person('t6', [
      concept(MIF3_CONCEPTS.hitl, true, 4),
      concept(MIF3_CONCEPTS.graph, true, 4),
      concept(MIF3_CONCEPTS.state, true, 4),
    ]),
    person('t7', [
      concept(MIF3_CONCEPTS.hitl, true, 2, 0, 1),
      concept(MIF3_CONCEPTS.graph, true, 4),
      concept(MIF3_CONCEPTS.state, true, 4),
    ]),
    // t8·t9 — 재응시 발송·응시 표(ResultTab) 렌더 확인용 시드. t8은 발송+응시 완료,
    // t9는 발송만 되고 아직 미응시, t1(김민준)은 미발송으로 남겨 발송 흐름도 테스트할 수 있게 둔다.
    person(
      't8',
      [
        concept(MIF3_CONCEPTS.hitl, true, 1, 0, 2),
        concept(MIF3_CONCEPTS.graph, true, 1, 0, 1),
        concept(MIF3_CONCEPTS.state, true, 4),
      ],
      '2026-07-16',
      '2026-07-19T18:00',
      '2026-07-18T21:40',
    ),
    person(
      't9',
      [
        concept(MIF3_CONCEPTS.hitl, true, 0, 0, 1),
        concept(MIF3_CONCEPTS.graph, true, 4),
        concept(MIF3_CONCEPTS.state, true, 4),
      ],
      '2026-07-16',
      '2026-07-19T18:00',
    ),
    person('t18', [
      concept(MIF3_CONCEPTS.hitl, false, 0),
      concept(MIF3_CONCEPTS.graph, true, 3, 1, 1),
      concept(MIF3_CONCEPTS.state, true, 4),
    ]),
    person('t21', [
      concept(MIF3_CONCEPTS.hitl, true, 4),
      concept(MIF3_CONCEPTS.graph, true, 4),
      concept(MIF3_CONCEPTS.state, true, 3, 0, 1),
    ]),
    person('t22', [
      concept(MIF3_CONCEPTS.hitl, true, 2, 2, 2),
      concept(MIF3_CONCEPTS.graph, true, 3, 1, 1),
      concept(MIF3_CONCEPTS.state, true, 4),
    ]),
    person('t24', [
      concept(MIF3_CONCEPTS.hitl, true, 4),
      concept(MIF3_CONCEPTS.graph, true, 2, 0, 2),
      concept(MIF3_CONCEPTS.state, true, 4),
    ]),
  ],
  false,
  MIF3_ATTENDANCE,
)

// ── mif-4(편성 중) · mif-5(전원 배정) · bigp(편성 전) ────────────

const MIF4_TEAMS: Team[] = [
  pickTeam('mif4-1', '1팀', ['t1', 't2', 't3']),
  pickTeam('mif4-2', '2팀', ['t4', 't5', 't6']),
  pickTeam('mif4-3', '3팀', ['t7', 't8', 't9']),
  pickTeam('mif4-4', '4팀', ['t10', 't11', 't12']),
  pickTeam('mif4-5', '5팀', ['t13', 't14', 't15']),
]
const MIF4_UNASSIGNED = ['t16', 't17', 't18', 't19', 't20', 't21', 't22', 't23', 't24'].map(byId)

const MIF5_TEAMS: Team[] = [
  pickTeam('mif5-1', '1팀', ['t1', 't2', 't3']),
  pickTeam('mif5-2', '2팀', ['t4', 't5', 't6']),
  pickTeam('mif5-3', '3팀', ['t7', 't8', 't9']),
  pickTeam('mif5-4', '4팀', ['t10', 't11', 't12']),
  pickTeam('mif5-5', '5팀', ['t13', 't14', 't15']),
  pickTeam('mif5-6', '6팀', ['t16', 't17', 't18']),
  pickTeam('mif5-7', '7팀', ['t19', 't20', 't21']),
  pickTeam('mif5-8', '8팀', ['t22', 't23', 't24']),
]

// ── mif-2 · mif-1(종료 · 결과 발행 완료) ──────────────────────

const MIF2_CONCEPTS = { auth: '인증 흐름', tx: '트랜잭션', cache: '캐시 전략' }
const MIF2_RESULT = buildProjectResult(
  [
    person('t1', [
      concept(MIF2_CONCEPTS.auth, true, 4),
      concept(MIF2_CONCEPTS.tx, true, 4),
      concept(MIF2_CONCEPTS.cache, true, 4),
    ]),
    person('t2', [
      concept(MIF2_CONCEPTS.auth, true, 3, 0, 1),
      concept(MIF2_CONCEPTS.tx, true, 1, 0, 2),
      concept(MIF2_CONCEPTS.cache, true, 4),
    ]),
    person(
      't3',
      [
        concept(MIF2_CONCEPTS.auth, true, 2, 0, 1),
        concept(MIF2_CONCEPTS.tx, true, 1, 0, 2),
        concept(MIF2_CONCEPTS.cache, true, 3, 1, 1),
      ],
      '2026-06-20',
    ),
    person('t4', [
      concept(MIF2_CONCEPTS.auth, true, 4),
      concept(MIF2_CONCEPTS.tx, false, 0),
      concept(MIF2_CONCEPTS.cache, true, 4),
    ]),
    person('t5', [
      concept(MIF2_CONCEPTS.auth, true, 3, 0, 1),
      concept(MIF2_CONCEPTS.tx, true, 1, 0, 2),
      concept(MIF2_CONCEPTS.cache, true, 2, 0, 1),
    ]),
    person(
      't6',
      [
        concept(MIF2_CONCEPTS.auth, true, 4),
        concept(MIF2_CONCEPTS.tx, true, 1, 0, 2),
        concept(MIF2_CONCEPTS.cache, true, 3, 1, 1),
      ],
      '2026-06-20',
    ),
    person('t7', [
      concept(MIF2_CONCEPTS.auth, true, 4),
      concept(MIF2_CONCEPTS.tx, true, 2, 0, 2),
      concept(MIF2_CONCEPTS.cache, false, 0),
    ]),
    person('t8', [
      concept(MIF2_CONCEPTS.auth, true, 2, 0, 2),
      concept(MIF2_CONCEPTS.tx, true, 4),
      concept(MIF2_CONCEPTS.cache, true, 3, 1, 1),
    ]),
  ],
  true,
)

const MIF1_CONCEPTS = { rest: 'REST 설계', exc: '예외 처리', dto: 'DTO 분리' }
const MIF1_RESULT = buildProjectResult(
  [
    person('t1', [
      concept(MIF1_CONCEPTS.rest, true, 4),
      concept(MIF1_CONCEPTS.exc, true, 4),
      concept(MIF1_CONCEPTS.dto, true, 4),
    ]),
    person('t2', [
      concept(MIF1_CONCEPTS.rest, true, 3, 0, 1),
      concept(MIF1_CONCEPTS.exc, true, 4),
      concept(MIF1_CONCEPTS.dto, true, 4),
    ]),
    person('t3', [
      concept(MIF1_CONCEPTS.rest, true, 4),
      concept(MIF1_CONCEPTS.exc, true, 4),
      concept(MIF1_CONCEPTS.dto, true, 4),
    ]),
    person('t4', [
      concept(MIF1_CONCEPTS.rest, true, 4),
      concept(MIF1_CONCEPTS.exc, true, 4),
      concept(MIF1_CONCEPTS.dto, true, 2, 0, 1),
    ]),
  ],
  true,
)

// ── 프로젝트별 상세 저장소(mock DB) ──────────────────────────

const PROJECT_DETAILS: Record<string, ProjectDetail> = {
  bigp: {
    projectId: 'bigp',
    teamPhase: 'BEFORE',
    locked: false,
    requirementNames: [],
    teams: [],
    unassigned: ROSTER,
    submissions: {},
    attendance: {},
    result: null,
  },
  'mif-5': {
    projectId: 'mif-5',
    teamPhase: 'READY',
    locked: false,
    requirementNames: [],
    teams: MIF5_TEAMS,
    unassigned: [],
    submissions: {},
    attendance: {},
    result: null,
  },
  'mif-4': {
    projectId: 'mif-4',
    teamPhase: 'FORMING',
    locked: false,
    requirementNames: [],
    teams: MIF4_TEAMS,
    unassigned: MIF4_UNASSIGNED,
    submissions: {},
    attendance: {},
    result: null,
  },
  'mif-3': {
    projectId: 'mif-3',
    teamPhase: 'SUBMITTING',
    locked: false,
    requirementNames: MIF3_REQUIREMENTS,
    teams: MIF3_TEAMS,
    unassigned: [],
    submissions: MIF3_SUBMISSIONS,
    attendance: MIF3_ATTENDANCE,
    result: MIF3_RESULT,
  },
  'mif-2': {
    projectId: 'mif-2',
    teamPhase: 'SUBMITTING',
    locked: true,
    requirementNames: ['인증 토큰 검증', '트랜잭션 롤백 처리', '캐시 무효화 로직'],
    teams: [pickTeam('mif2-1', '1팀', ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8'])],
    unassigned: [],
    submissions: {},
    attendance: {},
    result: MIF2_RESULT,
  },
  'mif-1': {
    projectId: 'mif-1',
    teamPhase: 'SUBMITTING',
    locked: true,
    requirementNames: ['REST 리소스 분리', '예외 핸들러 등록', 'DTO 매핑'],
    teams: [pickTeam('mif1-1', '1팀', ['t1', 't2', 't3', 't4'])],
    unassigned: [],
    submissions: {},
    attendance: {},
    result: MIF1_RESULT,
  },
}

// ── 자동 배분 — 뱀 배분 + 겹침 재추첨(최대 20회) ─────────────────
// ⚠ 렌더 비교 반영 — 와이어프레임 "자동 배분 모달"(팀 크기 범위 · 섞는 방법 ·
// 지난 회차 겹침 회피)을 그대로 옵션화했다. 이전엔 버튼 하나로 바로 실행했지만,
// 모달에서 고른 값이 실제 배분 로직에 반영돼야 의미가 있다.

/** 팀 크기 범위 선택지 — `max`만 배분 계산에 쓰고 `min`은 안내 문구에만 쓴다 */
export type TeamSizeRange = { min: number; max: number; label: string }
export const TEAM_SIZE_RANGES: TeamSizeRange[] = [
  { min: 2, max: 3, label: '2~3명' },
  { min: 3, max: 4, label: '3~4명' },
  { min: 4, max: 5, label: '4~5명' },
]

export type AutoAssignOptions = {
  maxSize: number
  /** 무작위(false) vs 실력 섞기(true, 직전 회차 도달 단계 기준 뱀 배분) */
  mixByReach: boolean
  /** 지난 회차와 2명 이상 겹치면 다시 뽑을지 — 꺼두면 첫 결과를 그대로 쓴다 */
  avoidOverlap: boolean
}

/** 실력 섞기 없이 그냥 섞는다(무작위) — 시드 기반 결정적 셔플(Math.random 금지, 이유는 위 판단 기록) */
function plainShuffle(people: PersonRef[], seed: number): PersonRef[] {
  const arr = [...people]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (seed + i * 7 + 13) % (i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/** 같은 도달단계 그룹 안에서만 순서를 흔든다 — 실력 섞기 원칙은 유지, 배정 순서만 바뀐다 */
function shuffleWithinReachTiers(people: PersonRef[], seed: number): PersonRef[] {
  const tiers = new Map<number, PersonRef[]>()
  for (const p of people) {
    const key = p.prevReach ?? -1
    if (!tiers.has(key)) tiers.set(key, [])
    tiers.get(key)!.push(p)
  }
  const result: PersonRef[] = []
  for (const [, group] of [...tiers.entries()].sort((a, b) => b[0] - a[0])) {
    const offset = group.length === 0 ? 0 : seed % group.length
    result.push(...group.slice(offset), ...group.slice(0, offset))
  }
  return result
}

function snakeGroup(people: PersonRef[], teamCount: number): PersonRef[][] {
  const teams: PersonRef[][] = Array.from({ length: teamCount }, () => [])
  let dir = 1
  let idx = 0
  for (const p of people) {
    teams[idx].push(p)
    idx += dir
    if (idx === teamCount) {
      idx = teamCount - 1
      dir = -1
    } else if (idx < 0) {
      idx = 0
      dir = 1
    }
  }
  return teams
}

/** `maxSize` 하나로 팀 수를 정한다 — `ceil(n/max)`팀이면 각 팀이 max를 못 넘는다(정의서 "범위로 고른다") */
function teamCountFor(n: number, maxSize: number): number {
  return Math.max(1, Math.ceil(n / Math.max(1, maxSize)))
}

/**
 * 자동 배분 모달의 실시간 미리보기 — "N명이 M팀으로 나뉩니다 · 3명 X팀 · 4명 Y팀"
 * 실제 배분 전에 크기 범위만으로 몇 팀이 되는지 보여준다(API 호출 없이 클라이언트에서 계산).
 */
export function planAutoAssign(
  n: number,
  maxSize: number,
): { teamCount: number; sizes: { size: number; count: number }[] } {
  const teamCount = teamCountFor(n, maxSize)
  const base = Math.floor(n / teamCount)
  const extra = n % teamCount
  const sizes: { size: number; count: number }[] = []
  if (teamCount - extra > 0) sizes.push({ size: base, count: teamCount - extra })
  if (extra > 0) sizes.push({ size: base + 1, count: extra })
  return { teamCount, sizes }
}

/** 팀 안에 직전 회차 같은 팀(`prevTeamId`)이 2명 이상 겹치면 그 팀만 문제(정의서 §5) */
function hasBadOverlap(team: PersonRef[]): boolean {
  const counts = new Map<string, number>()
  for (const p of team) {
    if (!p.prevTeamId) continue
    counts.set(p.prevTeamId, (counts.get(p.prevTeamId) ?? 0) + 1)
  }
  return [...counts.values()].some((c) => c >= 2)
}

/** 뱀 배분, 옵션에 따라 최대 20회 재추첨 — 넘기면 겹침이 남은 채로 두고 그 팀을 알린다 */
function autoAssign(
  people: PersonRef[],
  options: AutoAssignOptions,
): { teams: PersonRef[][]; conflicted: number[] } {
  const teamCount = teamCountFor(people.length, options.maxSize)
  const reshuffle = options.mixByReach ? shuffleWithinReachTiers : plainShuffle
  const attempts = options.avoidOverlap ? 20 : 1

  let best: PersonRef[][] = snakeGroup(people, teamCount)
  for (let attempt = 0; attempt < attempts; attempt++) {
    const candidate = snakeGroup(reshuffle(people, attempt), teamCount)
    if (!options.avoidOverlap) {
      best = candidate
      break
    }
    const conflicts = candidate.filter(hasBadOverlap).length
    if (conflicts === 0) {
      best = candidate
      break
    }
    if (attempt === 0 || conflicts < best.filter(hasBadOverlap).length) best = candidate
  }
  const conflicted = options.avoidOverlap
    ? best.map((t, i) => (hasBadOverlap(t) ? i : -1)).filter((i) => i >= 0)
    : []
  return { teams: best, conflicted }
}

// ── 조회·조작(mock API) ──────────────────────────────────────

export function getProjectDetail(id: string): Promise<ProjectDetail | null> {
  return delay(PROJECT_DETAILS[id] ?? null)
}

/** ③ 전원 배정 → ④ 확정됨. 되돌리기는 제출 전(④)까지만(정의서 §3) */
export function confirmTeamFormation(id: string): Promise<void> {
  const d = PROJECT_DETAILS[id]
  if (d && d.teamPhase === 'READY') d.teamPhase = 'LOCKED'
  return delay(undefined)
}

/** ④ 확정됨 → ③ 전원 배정. ⑤(제출 시작)부터는 이 버튼 자체가 안 보인다(화면에서 막는다) */
export function reopenTeamFormation(id: string): Promise<void> {
  const d = PROJECT_DETAILS[id]
  if (d && d.teamPhase === 'LOCKED') d.teamPhase = 'READY'
  return delay(undefined)
}

/** 팀이 하나도 없을 때만 호출된다(버튼 자체가 그때만 나온다, 정의서 §5). 옵션은 자동 배분 모달에서 온다 */
export function autoAssignTeams(
  id: string,
  options: AutoAssignOptions,
): Promise<{ conflicted: string[] }> {
  const d = PROJECT_DETAILS[id]
  if (!d || d.teams.length > 0) return delay({ conflicted: [] })
  const { teams, conflicted } = autoAssign(d.unassigned, options)
  d.teams = teams.map((members, i) => ({
    id: `${id}-auto-${i + 1}`,
    name: `${i + 1}팀`,
    memberIds: members.map((m) => m.id),
  }))
  d.unassigned = []
  d.teamPhase = 'READY'
  return delay({ conflicted: conflicted.map((i) => `${i + 1}팀`) })
}

/**
 * 편성 전/중/전원 배정 3국면 사이의 전이 — 팀 0개면 편성 전, 미배정이 남아 있으면
 * 편성 중, 다 배정됐으면 전원 배정(정의서 §3). 확정(④)·제출 시작(⑤)부턴 이 함수가
 * 손대지 않는다 — 그 뒤는 `confirmTeamFormation`·`reopenTeamFormation`이 관리하는
 * 별도 상태다. `moveMember`·`createTeam`·`deleteTeam`이 전부 이 규칙을 공유해서
 * 팀 삭제 때문에 셋 중 하나만 다른 규칙을 쓰는 일이 없게 뺐다.
 */
function recomputeTeamPhase(d: ProjectDetail): void {
  if (d.teamPhase !== 'BEFORE' && d.teamPhase !== 'FORMING' && d.teamPhase !== 'READY') return
  d.teamPhase = d.teams.length === 0 ? 'BEFORE' : d.unassigned.length > 0 ? 'FORMING' : 'READY'
}

/** 미배정 ↔ 팀, 팀 ↔ 팀 이동 — `toTeamId`가 null이면 미배정으로 뺀다(팀 편집 모달의 dual-list) */
export function moveMember(id: string, traineeId: string, toTeamId: string | null): Promise<void> {
  const d = PROJECT_DETAILS[id]
  if (!d) return delay(undefined)
  d.unassigned = d.unassigned.filter((p) => p.id !== traineeId)
  for (const t of d.teams) t.memberIds = t.memberIds.filter((m) => m !== traineeId)
  if (toTeamId === null) {
    d.unassigned.push(byId(traineeId))
  } else {
    d.teams.find((t) => t.id === toTeamId)?.memberIds.push(traineeId)
  }
  recomputeTeamPhase(d)
  return delay(undefined)
}

export function createTeam(id: string, name: string): Promise<void> {
  const d = PROJECT_DETAILS[id]
  if (!d) return delay(undefined)
  d.teams.push({ id: `${id}-${Date.now()}`, name, memberIds: [] })
  recomputeTeamPhase(d)
  return delay(undefined)
}

/**
 * 팀 삭제 — 확정 전(편성 전·편성 중·전원 배정)에만 부른다(화면에서 막는다,
 * 사용자 지시로 렌더 비교 다음 세션에 추가한 기능). 팀원은 데이터를 잃지 않고
 * **미배정으로 돌아간다** — 삭제가 "그 사람들도 지운다"는 뜻이 아니다.
 */
export function deleteTeam(id: string, teamId: string): Promise<void> {
  const d = PROJECT_DETAILS[id]
  if (!d) return delay(undefined)
  const team = d.teams.find((t) => t.id === teamId)
  if (!team) return delay(undefined)
  d.unassigned.push(...team.memberIds.map(byId))
  d.teams = d.teams.filter((t) => t.id !== teamId)
  recomputeTeamPhase(d)
  return delay(undefined)
}

/** 독촉 — 상태별 고정 문구, 커스텀 없음(정의서 §5). 실제 발송은 서버 몫이라 목에선 성공만 흉내낸다 */
export function nudgeTeam(_id: string, _teamId: string): Promise<void> {
  return delay(undefined)
}
export function nudgePerson(_id: string, _traineeId: string): Promise<void> {
  return delay(undefined)
}

/**
 * 재응시 발송 — 자동 지정 + 매니저가 버튼을 누른다(정의서 §5). 체크 해제로 대상에서
 * 뺄 수 있다. 기한(`dueAt`, `YYYY-MM-DDTHH:mm`)은 기본값(+3일 18:00)을 매니저가 직접
 * 바꿀 수 있다(사용자 지시) — 모달이 계산한 값을 그대로 받아 각 대상자에 저장한다.
 */
export function sendRetry(id: string, traineeIds: string[], dueAt: string): Promise<void> {
  const d = PROJECT_DETAILS[id]
  if (!d?.result) return delay(undefined)
  for (const p of d.result.people) {
    if (traineeIds.includes(p.person.id)) {
      p.retrySentAt = MOCK_TODAY
      p.retryDueAt = dueAt
    }
  }
  return delay(undefined)
}

/**
 * 재응시 발송 취소(사용자 지시) — `retrySentAt`·`retryDueAt`을 지워 "재응시 가능"
 * 상태로 되돌린다. **이미 다시 응시한 사람(`retryTakenAt`)은 취소하지 않는다**
 * — 실제로 벌어진 일을 되돌릴 순 없으니, 취소는 "발송만 되고 아직 안 본" 사람에
 * 게만 의미가 있다(사용자 지시 "재응시 완료한 경우는 제외"). 방어적으로 함수
 * 안에서도 한 번 더 막는다 — 호출부(UI)가 버튼을 숨기지 못한 경우를 대비.
 */
export function cancelRetry(id: string, traineeId: string): Promise<void> {
  const d = PROJECT_DETAILS[id]
  if (!d?.result) return delay(undefined)
  const p = d.result.people.find((p) => p.person.id === traineeId)
  if (p && !p.retryTakenAt) {
    p.retrySentAt = null
    p.retryDueAt = null
  }
  return delay(undefined)
}

export function publishReport(id: string): Promise<void> {
  const d = PROJECT_DETAILS[id]
  if (d?.result) d.result.reportPublished = true
  return delay(undefined)
}
