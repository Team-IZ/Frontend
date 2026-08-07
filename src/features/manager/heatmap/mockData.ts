/*
  MG-02 히트맵 목업. API 연동 전까지 화면을 검증하기 위한 고정 데이터 + mock API다.
  실 데이터가 붙으면 이 파일은 지운다.

  값은 정의서(`docs/plan/v2/definition/MG-02-heatmap.md`)와 목업(`docs/plan/v2/
  wireframe/manager/heatmap.html`)의 반별·팀·개인 3단 장면(#class·#team·#person·
  #first·#retried·#empty)을 그대로 옮긴다.

  ⚠ 이 파일은 `features/manager/trainees/mockData.ts`·`features/manager/projects/
  mockData.ts`를 import하지 않는다 — 이 레포에 역할 간 mock cross-import 전례가
  없다(`interviews/mockData.ts` 머리말과 같은 이유). 대신 **표시 로직**(도달 단계
  색·해치 무늬)은 `HeatmapTable.tsx`·`HeatmapLegend.tsx`가 `@/components/common/
  reach`의 `REACH_STYLE`·`NA_PATTERN`을 쓴다 — 처음엔 `features/manager/trainees/
  lib/reach.ts`에서 바로 가져왔는데, oxlint `no-restricted-imports`(feature 간
  교차 import 금지)에 걸려 공용 위치로 승격했다(`reach.ts`·`common/reach.ts`
  머리말 참고, decision-log D14 "세 번째 도메인에서 올린다"가 그대로 들어맞은
  경우). 이 파일(mockData.ts) 자체는 REACH_STYLE을 직접 쓰지 않는다 — 색 매핑은
  렌더 쪽 책임이라 여기선 숫자(avg)·판정(flagged)만 낸다.

  **인원은 `trainees/mockData.ts`의 실제 id·이름·반을 그대로 옮겨 썼다**(값을 손으로
  다시 입력, import는 아님) — 개인 행 클릭이 MG-06으로 이동하는데, MG-04 세션 때
  겪은 것과 같은 문제(가리키는 id가 실제 교육생 목록에 없어 D-1로 막힘)를 처음부터
  피하기 위해서다. 21명(기존 12 + MG-04가 추가한 9)을 반마다 7명, 팀 2개(4명·3명)로
  나눴다 — 원래 있던 12명이 각 반 1팀, MG-04가 추가한 9명이 각 반 2팀이 되도록 짰다.

  ⚠ **회차를 4개로 뒀다**(`interviews/mockData.ts`가 미프 1~5차를 쓰는 것과 같은
  폭 판단) — 정의서 필수 상태를 다 담으려면: 1차(비교 대상 없음 · 배지 없음,
  `#first`) · 2차(평이한 진행) · 3차(집단 미달·다시 보기·문항 없음·미응시·위험
  배지 전부, 기본값이자 목업 `#class`·`#team`·`#person`·`#retried`) · 4차(아직
  결과 없음, `#empty`). 배지(단계 하락·지속 저점)는 "직전 회차 대비"인데 이 목업은
  회차별로 사실을 직접 심어 둔 것이라(연산으로 비교하지 않는다 — `interviews/
  mockData.ts`와 같은 방식) 1·2차엔 아예 배지를 심지 않았다 — 1차는 정의서가 명시한
  이유(비교 불가), 2차는 3차의 "단계 하락"이 성립하려면 그 직전인 2차가 상대적으로
  나아 보여야 자연스러워서다.
*/

// ── 회차 · 반 · 팀 · 사람 ──────────────────────────────────────────

export type RoundId = '1' | '2' | '3' | '4'

export const ROUND_OPTIONS: { value: RoundId; label: string }[] = [
  { value: '1', label: '미프 1차' },
  { value: '2', label: '미프 2차' },
  { value: '3', label: '미프 3차' },
  { value: '4', label: '미프 4차' },
]

/** 그 회차의 검증 개념 3건. 4차는 아직 결과가 없어 개념 자체가 없다(§empty) */
const ROUND_CONCEPTS: Record<RoundId, [string, string, string] | null> = {
  '1': ['인증 흐름', 'API 설계', '에러 처리'],
  '2': ['상태 관리', 'API 설계', '테스트 전략'],
  '3': ['HITL Trigger', 'Graph 구성', 'State 관리'],
  '4': null,
}

export type ClassName = 'A반' | 'B반' | 'C반'
export const CLASS_OPTIONS: ClassName[] = ['A반', 'B반', 'C반']

export const COHORT_NAME = '7기'

type Person = { id: string; name: string; className: ClassName; teamId: string; teamName: string }

const PEOPLE: Person[] = [
  // A반 1팀 — 기존 12명 중 A반 4명
  { id: 't-1', name: '강민준', className: 'A반', teamId: 'A-1', teamName: '1팀' },
  { id: 't-2', name: '김서연', className: 'A반', teamId: 'A-1', teamName: '1팀' },
  { id: 't-4', name: '한도현', className: 'A반', teamId: 'A-1', teamName: '1팀' },
  { id: 't-9', name: '정우진', className: 'A반', teamId: 'A-1', teamName: '1팀' },
  // A반 2팀 — MG-04가 추가한 9명 중 A반 3명
  { id: 't-lee-seojun', name: '이서준', className: 'A반', teamId: 'A-2', teamName: '2팀' },
  { id: 't-kim-minjun', name: '김민준', className: 'A반', teamId: 'A-2', teamName: '2팀' },
  { id: 't-jung-haneul', name: '정하늘', className: 'A반', teamId: 'A-2', teamName: '2팀' },

  // B반 1팀
  { id: 't-3', name: '서지우', className: 'B반', teamId: 'B-1', teamName: '1팀' },
  { id: 't-6', name: '이하은', className: 'B반', teamId: 'B-1', teamName: '1팀' },
  { id: 't-8', name: '최윤서', className: 'B반', teamId: 'B-1', teamName: '1팀' },
  { id: 't-11', name: '윤도윤', className: 'B반', teamId: 'B-1', teamName: '1팀' },
  // B반 2팀
  { id: 't-han-jiwoo', name: '한지우', className: 'B반', teamId: 'B-2', teamName: '2팀' },
  { id: 't-park-dohyun', name: '박도현', className: 'B반', teamId: 'B-2', teamName: '2팀' },
  { id: 't-kang-yunseo', name: '강윤서', className: 'B반', teamId: 'B-2', teamName: '2팀' },

  // C반 1팀
  { id: 't-5', name: '오세훈', className: 'C반', teamId: 'C-1', teamName: '1팀' },
  { id: 't-7', name: '박지민', className: 'C반', teamId: 'C-1', teamName: '1팀' },
  { id: 't-10', name: '신아린', className: 'C반', teamId: 'C-1', teamName: '1팀' },
  { id: 't-12', name: '임서준', className: 'C반', teamId: 'C-1', teamName: '1팀' },
  // C반 2팀
  { id: 't-choi-yuna', name: '최유나', className: 'C반', teamId: 'C-2', teamName: '2팀' },
  { id: 't-oh-serim', name: '오세림', className: 'C반', teamId: 'C-2', teamName: '2팀' },
  { id: 't-seo-jihun', name: '서지훈', className: 'C반', teamId: 'C-2', teamName: '2팀' },
]

/** 반 안의 팀 목록(등장 순서) — 팀 select 옵션에 쓴다 */
export function teamsOfClass(className: ClassName): { id: string; name: string }[] {
  const seen = new Map<string, string>()
  for (const p of PEOPLE) if (p.className === className) seen.set(p.teamId, p.teamName)
  return [...seen].map(([id, name]) => ({ id, name }))
}

// ── 개인별 회차 기록 ────────────────────────────────────────────────

/** 도달 단계 0~4. `null` = 문항 없음(코드에 그 개념이 없어 못 물었다) */
export type Level = 0 | 1 | 2 | 3 | 4 | null

export type PersonBadge = 'DECLINE' | 'LOW_PERSISTENT'
export const BADGE_LABEL: Record<PersonBadge, string> = {
  DECLINE: '단계 하락',
  LOW_PERSISTENT: '지속 저점',
}

export type PersonRoundEntry =
  | {
      status: 'ATTENDED'
      levels: [Level, Level, Level]
      /**
       * 다시 보기로 값이 바뀐 개념의 **다시 보기 전(1차)** 값 — 개념 인덱스(0~2)로
       * 매칭. `levels[idx]`는 다시 본 뒤 값(기록용)이지만, **화면엔 어디서도 안
       * 뜬다** — 반·팀 평균은 물론 **개인 셀도** 이 값을 쓴다(`effectiveLevel`
       * 참고). ⚠ 사용자 확정(2026-08-08) — "다시 보기 결과는 기록에만 남고
       * 판정에 반영 안 된다"(`RetrySendDialog.tsx`)는 원칙을 히트맵에도 그대로
       * 적용한다 — 히트맵도 판정 화면이라 예외가 아니다. 이전엔 개인 셀만
       * `levels`(다시 본 값)를 보여주고 `↑`로 표시했었는데, 그 표시 자체가
       * 틀린 전제였다(점수가 실제로는 안 바뀐다) — `↑`·범례와 함께 이 값 자체를
       * 걷어냈다.
       */
      priorLevels?: Partial<Record<0 | 1 | 2, Level>>
      badge?: PersonBadge
    }
  | { status: 'ABSENT' | 'NOT_STARTED' }

const ROUND_DATA: Record<RoundId, Partial<Record<string, PersonRoundEntry>>> = {
  '1': {
    't-1': { status: 'ATTENDED', levels: [3, 3, 3] },
    't-2': { status: 'ATTENDED', levels: [4, 4, 3] },
    't-4': { status: 'ATTENDED', levels: [2, 3, 3] },
    't-9': { status: 'ATTENDED', levels: [3, 2, 3] },
    't-lee-seojun': { status: 'ATTENDED', levels: [3, 3, 2] },
    't-kim-minjun': { status: 'ATTENDED', levels: [2, 2, 3] },
    't-jung-haneul': { status: 'ATTENDED', levels: [4, 3, 3] },
    't-3': { status: 'ATTENDED', levels: [3, 3, 3] },
    't-6': { status: 'ATTENDED', levels: [3, 2, 3] },
    't-8': { status: 'ATTENDED', levels: [3, 3, 2] },
    't-11': { status: 'ATTENDED', levels: [4, 3, 3] },
    't-han-jiwoo': { status: 'ATTENDED', levels: [3, 3, 3] },
    't-park-dohyun': { status: 'ATTENDED', levels: [2, 3, 2] },
    't-kang-yunseo': { status: 'ATTENDED', levels: [3, 3, 4] },
    't-5': { status: 'ATTENDED', levels: [2, 2, 1] },
    't-7': { status: 'ATTENDED', levels: [3, 2, 2] },
    't-10': { status: 'ATTENDED', levels: [2, 1, 2] },
    't-12': { status: 'ATTENDED', levels: [3, 3, 2] },
    't-choi-yuna': { status: 'ATTENDED', levels: [2, 2, 1] },
    't-oh-serim': { status: 'ATTENDED', levels: [1, 2, 2] },
    't-seo-jihun': { status: 'ATTENDED', levels: [3, 2, 2] },
  },
  '2': {
    't-1': { status: 'ATTENDED', levels: [3, 3, 4] },
    't-2': { status: 'ATTENDED', levels: [4, 4, 4] },
    't-4': { status: 'ATTENDED', levels: [3, 3, 3] },
    't-9': { status: 'ATTENDED', levels: [3, 3, 3] },
    't-lee-seojun': { status: 'ATTENDED', levels: [3, 2, 3] },
    't-kim-minjun': { status: 'ATTENDED', levels: [1, 2, 2] },
    't-jung-haneul': { status: 'ATTENDED', levels: [4, 4, 3] },
    't-3': { status: 'ATTENDED', levels: [3, 3, 3] },
    't-6': { status: 'ATTENDED', levels: [2, 2, 2] },
    't-8': { status: 'ATTENDED', levels: [3, 2, 3] },
    't-11': { status: 'ATTENDED', levels: [4, 3, 4] },
    't-han-jiwoo': { status: 'ATTENDED', levels: [3, 3, 2] },
    't-park-dohyun': { status: 'ATTENDED', levels: [2, 2, 3] },
    't-kang-yunseo': { status: 'ATTENDED', levels: [3, 4, 3] },
    't-5': { status: 'ATTENDED', levels: [2, 2, 2] },
    't-7': { status: 'ATTENDED', levels: [3, 3, 3] },
    't-10': { status: 'ATTENDED', levels: [2, 2, 2] },
    't-12': { status: 'ATTENDED', levels: [3, 4, 3] },
    't-choi-yuna': { status: 'ATTENDED', levels: [2, 3, 2] },
    't-oh-serim': { status: 'ATTENDED', levels: [1, 2, 1] },
    't-seo-jihun': { status: 'ATTENDED', levels: [3, 3, 3] },
  },
  '3': {
    // A반 1팀
    't-1': { status: 'ATTENDED', levels: [3, 2, 4] },
    't-2': { status: 'ATTENDED', levels: [4, 1, 3] },
    't-4': { status: 'ATTENDED', levels: [2, 1, 3] },
    't-9': { status: 'ATTENDED', levels: [3, 2, 4] },
    // A반 2팀
    't-lee-seojun': { status: 'ATTENDED', levels: [2, 2, 3], badge: 'DECLINE' },
    't-kim-minjun': {
      status: 'ATTENDED',
      levels: [1, 2, 4],
      priorLevels: { 0: 0 },
      badge: 'DECLINE',
    },
    't-jung-haneul': { status: 'ATTENDED', levels: [4, 2, null] },
    // B반 1팀
    't-3': { status: 'ATTENDED', levels: [3, 3, 3] },
    't-6': { status: 'ATTENDED', levels: [2, 1, 2], badge: 'LOW_PERSISTENT' },
    't-8': { status: 'NOT_STARTED' },
    't-11': { status: 'ATTENDED', levels: [4, 3, 3] },
    // B반 2팀
    't-han-jiwoo': { status: 'ATTENDED', levels: [3, 2, 3] },
    't-park-dohyun': { status: 'ATTENDED', levels: [2, 2, 2] },
    't-kang-yunseo': { status: 'ATTENDED', levels: [3, 3, 4] },
    // C반 1팀
    't-5': { status: 'ABSENT' },
    't-7': { status: 'ATTENDED', levels: [0, 1, 3], badge: 'DECLINE' },
    't-10': { status: 'NOT_STARTED' },
    't-12': { status: 'ATTENDED', levels: [3, null, 4] },
    // C반 2팀
    't-choi-yuna': {
      status: 'ATTENDED',
      levels: [2, 2, 3],
      priorLevels: { 0: 1 },
    },
    't-oh-serim': { status: 'ATTENDED', levels: [1, 1, 2], badge: 'LOW_PERSISTENT' },
    't-seo-jihun': { status: 'ATTENDED', levels: [4, 3, 4] },
  },
  '4': {},
}

// ── 도달 단계 판정 ────────────────────────────────────────────────

/*
  ⚠ 취약·주의 글자 라벨은 뺐다(렌더 확인 후 사용자 지시, 이번 라운드) — 판정은
  색(REACH_STYLE)과 집단 미달 테두리(flagged)만으로 표시한다. 예전엔 여기서
  `levelLabel(avg)`로 <2.5·2.5~2.7 구간에 문자열을 붙였는데, 그 기준값 자체가
  "취약이랑 주의를 넣는 기준이 궁금해"라는 반복 질문을 낳았고, 결국 라벨을 없애는
  쪽으로 정리됐다 — 남겨두면 죽은 코드다.
*/

/** 반올림 소수점 1자리 */
function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/**
 * ⚠ 사용자 확정(2026-08-08) — 다시 보기 결과는 **어디에도 반영되지 않는다**
 * (기록에만 남고 판정에 반영 안 됨, `RetrySendDialog.tsx` 문구와 같은 원칙).
 * 개인 셀도 예외가 아니다 — 히트맵은 판정 화면이라 반·팀 평균과 똑같이 항상
 * **1차 값**(`priorLevels`가 있으면 그 값)을 보여준다. `entry.levels[idx]`가
 * 다시 본 뒤 값을 담고 있어도 이 함수를 거치면 항상 1차 값으로 바뀐다 —
 * "다시 봐서 오른 값"이 화면 어디에도 안 뜬다는 뜻이라, 개인 셀 `↑` 표시를
 * 없앤 앞선 판단과 같은 결이다.
 */
function effectiveLevel(entry: PersonRoundEntry, idx: 0 | 1 | 2): Level {
  if (entry.status !== 'ATTENDED') return null
  return entry.priorLevels?.[idx] ?? entry.levels[idx]
}

// ── 집계 셀(반·팀 평균 행) ──────────────────────────────────────────

export type AggCell =
  | { kind: 'na' } // 이 그룹 전원이 그 개념에 문항 없음이거나 응시 기록이 없다
  | { kind: 'value'; avg: number; flagged: boolean }

function aggregateCell(personIds: string[], round: RoundId, idx: 0 | 1 | 2): AggCell {
  const values: number[] = []
  const data = ROUND_DATA[round]
  for (const id of personIds) {
    const entry = data[id]
    if (!entry) continue
    const lv = effectiveLevel(entry, idx)
    if (lv === null) continue
    values.push(lv)
  }
  if (values.length === 0) return { kind: 'na' }
  const avg = values.reduce((a, b) => a + b, 0) / values.length
  const lowRatio = values.filter((v) => v <= 2).length / values.length
  return { kind: 'value', avg: round1(avg), flagged: lowRatio >= 0.5 }
}

export type AggRow = {
  id: string
  label: string
  countLabel: string
  cells: [AggCell, AggCell, AggCell]
  /** 있으면 행 클릭으로 내려갈 수 있다(반별→팀, 팀→개인) */
  drillTo?: { classFilter: ClassName; teamFilter?: string }
}

function buildAggRow(
  id: string,
  label: string,
  personIds: string[],
  round: RoundId,
  drillTo?: AggRow['drillTo'],
): AggRow {
  return {
    id,
    label,
    countLabel: `${personIds.length}명`,
    cells: [0, 1, 2].map((idx) => aggregateCell(personIds, round, idx as 0 | 1 | 2)) as [
      AggCell,
      AggCell,
      AggCell,
    ],
    drillTo,
  }
}

function rowOverallAvg(row: AggRow): number {
  const vals = row.cells.filter((c) => c.kind === 'value').map((c) => c.avg)
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : Number.POSITIVE_INFINITY
}

// ── 개인 행 ────────────────────────────────────────────────────────

export type PersonCell = { level: Level }

export type PersonRow = {
  id: string
  name: string
  status: PersonRoundEntry['status']
  cells: [PersonCell, PersonCell, PersonCell] | null // null이면 미응시·결석이라 값이 없다
  badge?: PersonBadge
}

function buildPersonRow(person: Person, round: RoundId): PersonRow {
  const entry = ROUND_DATA[round][person.id]
  if (!entry || entry.status !== 'ATTENDED') {
    return { id: person.id, name: person.name, status: entry?.status ?? 'NOT_STARTED', cells: null }
  }
  return {
    id: person.id,
    name: person.name,
    status: 'ATTENDED',
    cells: [0, 1, 2].map((idx) => ({
      level: effectiveLevel(entry, idx as 0 | 1 | 2),
    })) as [PersonCell, PersonCell, PersonCell],
    badge: entry.badge,
  }
}

function personRowSortKey(row: PersonRow): number {
  if (!row.cells) return Number.POSITIVE_INFINITY
  const vals: number[] = row.cells
    .map((c) => c.level)
    .filter((l): l is Exclude<Level, null> => l !== null)
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : Number.POSITIVE_INFINITY
}

// ── 조회 ──────────────────────────────────────────────────────────

export type HeatmapLevel = 'class' | 'team' | 'person'
export type SortMode = 'DEFAULT' | 'LOW_FIRST'

export type HeatmapQuery = {
  round: RoundId
  level: HeatmapLevel
  classFilter?: ClassName
  teamFilter?: string
  sort: SortMode
  /** 반별·팀에서 — 집단 미달(⚠) 있는 행만(반별이면 반 단위, 팀이면 팀 단위로
   *  같은 기준을 적용한다. 렌더 확인 후 사용자 지시로 팀까지 확대했다 — 처음엔
   *  반별에만 있었다.) */
  problemOnly?: boolean
  /** 개인에서만 — 위험 배지(단계 하락·지속 저점)가 있거나, 검증 개념 중 하나라도
   *  0단·1단을 받은 사람만(사용자 지시로 0·1단 기준을 확대, 이번 라운드 — 원래는
   *  배지만 봤다) */
  riskOnly?: boolean
}

export type RoundMeta = {
  id: RoundId
  label: string
  isFirstRound: boolean
  resultStatus: 'READY' | 'PENDING'
}

type BaseResult = {
  round: RoundMeta
  concepts: [string, string, string] | null
  axis: { vertical: string; horizontal: string }
  crumb: string[] // ['A반'] | ['A반', '1팀']
  classOptions: ClassName[]
}

export type ClassViewResult = BaseResult & {
  level: 'class'
  groupText: string
  avgRow: AggRow
  rows: AggRow[]
  /** 전체(반 전체) 평균이 집단 미달인 개념 인덱스 — 열 머리 ⚠ 표시에 쓴다.
   *  team/person 뷰가 "상위 스코프(반) 평균 기준"으로 헤더 ⚠를 매기는 것과 같은
   *  규칙을 class 뷰에도 맞췄다 — class 뷰의 상위 스코프는 코호트 전체이고, 그
   *  평균이 바로 `avgRow`다(사용자 지적 — "반 전체 탭에서는 주의 알림이 안
   *  뜬다"는 놓친 부분이었다, 이번 라운드에서 추가). */
  flaggedConcepts: boolean[]
}

export type TeamViewResult = BaseResult & {
  level: 'team'
  groupText: string
  classFilter: ClassName
  avgRow: AggRow
  rows: AggRow[]
  /** 이 반 안에서 집단 미달인 개념 인덱스 — 열 머리 ⚠ 표시에 쓴다 */
  flaggedConcepts: boolean[]
}

export type PersonViewResult = BaseResult & {
  level: 'person'
  groupText: string
  classFilter: ClassName
  teamFilter: string
  teamOptions: { id: string; name: string }[]
  avgRow: AggRow
  rows: PersonRow[]
  flaggedConcepts: boolean[]
}

export type HeatmapResult = ClassViewResult | TeamViewResult | PersonViewResult

const LATENCY_MS = 220
const delay = <T>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS))

function roundMeta(id: RoundId): RoundMeta {
  const opt = ROUND_OPTIONS.find((o) => o.value === id)!
  return {
    id,
    label: opt.label,
    isFirstRound: id === '1',
    resultStatus: ROUND_CONCEPTS[id] ? 'READY' : 'PENDING',
  }
}

export function getHeatmap(query: HeatmapQuery): Promise<HeatmapResult> {
  const round = roundMeta(query.round)
  const concepts = ROUND_CONCEPTS[query.round]
  const base: BaseResult = {
    round,
    concepts,
    axis: { vertical: '', horizontal: '이 회차의 검증 개념 3건' },
    crumb: [],
    classOptions: CLASS_OPTIONS,
  }

  /*
    결과가 아직 없는 회차(4차)도 아래 각 계층 분기를 그대로 탄다 — `ROUND_DATA['4']`가
    비어 있어 평균 셀은 전부 `na`, 개인 행은 전부 미응시가 될 뿐이다. 화면은
    `round.resultStatus === 'PENDING'`을 보고 이 결과 대신 빈 상태를 그리므로(§empty),
    여기서 계층별로 다른 모양의 "빈 결과"를 따로 만들 필요가 없다 — 타입도 계층마다
    갈리는 union이라 분기 하나로 합치면 억지 캐스팅이 필요해진다.
  */

  if (query.level === 'class') {
    const allIds = PEOPLE.map((p) => p.id)
    // label엔 "반 전체(n기)"만 — 인원수는 countLabel이 이미 보여준다(둘 다 넣으면
    // 겹쳐 보인다, 렌더 확인 후 발견). "담당 반"이었다가 코호트 번호를 드러내는
    // 쪽으로 바꿨다(렌더 확인 후 사용자 지시, 이번 라운드).
    const avgRow = buildAggRow('total', `반 전체(${COHORT_NAME})`, allIds, query.round)
    // 헤더 ⚠는 이 코호트 전체 평균(avgRow) 기준 — team/person 뷰가 상위 스코프
    // 평균으로 헤더를 매기는 것과 같은 규칙(위 타입 주석 참고).
    const flaggedConcepts = avgRow.cells.map((c) => c.kind === 'value' && c.flagged)
    let rows = CLASS_OPTIONS.map((cls) => {
      const ids = PEOPLE.filter((p) => p.className === cls).map((p) => p.id)
      return buildAggRow(cls, cls, ids, query.round, { classFilter: cls })
    })
    if (query.problemOnly)
      rows = rows.filter((r) => r.cells.some((c) => c.kind === 'value' && c.flagged))
    if (query.sort === 'LOW_FIRST')
      rows = [...rows].sort((a, b) => rowOverallAvg(a) - rowOverallAvg(b))
    return delay({
      ...base,
      axis: { vertical: '반', horizontal: base.axis.horizontal },
      level: 'class',
      // "반별 · 행 클릭 → 그 반 팀"이었다가 한 문장으로 바꿨다(렌더 확인 후 사용자 지시)
      groupText: '반을 클릭하여 팀 이동',
      avgRow,
      rows,
      flaggedConcepts,
    })
  }

  const classFilter = query.classFilter ?? CLASS_OPTIONS[0]
  const classIds = PEOPLE.filter((p) => p.className === classFilter).map((p) => p.id)
  const classAvgRow = buildAggRow(classFilter, classFilter, classIds, query.round)
  const flaggedConcepts = classAvgRow.cells.map((c) => c.kind === 'value' && c.flagged)

  if (query.level === 'team') {
    const teams = teamsOfClass(classFilter)
    let rows = teams.map((t) => {
      const ids = PEOPLE.filter((p) => p.teamId === t.id).map((p) => p.id)
      return buildAggRow(t.id, t.name, ids, query.round, { classFilter, teamFilter: t.id })
    })
    // 반별과 같은 필터를 팀 단위로도 쓸 수 있게 했다(사용자 지시, 이번 라운드) —
    // "그 팀 안에 집단 미달인 개념이 하나라도 있는가"로 반별과 동일한 기준.
    if (query.problemOnly)
      rows = rows.filter((r) => r.cells.some((c) => c.kind === 'value' && c.flagged))
    if (query.sort === 'LOW_FIRST')
      rows = [...rows].sort((a, b) => rowOverallAvg(a) - rowOverallAvg(b))
    return delay({
      ...base,
      axis: { vertical: '반 › 팀', horizontal: base.axis.horizontal },
      level: 'team',
      // "팀별 · 행 클릭 → 그 팀 팀원"이었다가 반별 화면과 같은 한 문장 형식으로
      // 맞췄다(렌더 확인 후 사용자 지시, 이번 라운드). "개인으로 이동" → "개인
      // 이동"으로 "으로"도 뺐다(같은 라운드, 사용자 지시).
      groupText: '팀을 클릭하여 개인 이동',
      classFilter,
      // "N명 응시"에서 "응시"를 뺐다(렌더 확인 후 사용자 지시, 이번 라운드) — 이
      // 행은 그 반 전체 인원수를 보여주는 것이지 응시자 수만 세는 게 아니라서
      // "응시"가 오히려 오해를 줄 수 있었다.
      avgRow: { ...classAvgRow, countLabel: `${classIds.length}명` },
      rows,
      crumb: [classFilter],
      flaggedConcepts,
    })
  }

  // person
  const teamOptions = teamsOfClass(classFilter)
  const teamFilter = query.teamFilter ?? teamOptions[0]?.id ?? ''
  const teamIds = PEOPLE.filter((p) => p.teamId === teamFilter).map((p) => p.id)
  const teamAvgRow = buildAggRow(
    teamFilter,
    teamsOfClass(classFilter).find((t) => t.id === teamFilter)?.name ?? '',
    teamIds,
    query.round,
  )
  let rows = PEOPLE.filter((p) => p.teamId === teamFilter).map((p) =>
    buildPersonRow(p, query.round),
  )
  // 원래는 배지(단계 하락·지속 저점)만 봤는데, "0단·1단이 하나라도 있으면 위험에
  // 넣어 달라"는 지시로 기준을 넓혔다(이번 라운드) — 배지가 없어도 낮은 단계
  // 자체가 위험 신호라는 판단. `cells`가 `null`(미응시·결석)인 행은 판정할 값이
  // 없어 그대로 제외된다.
  if (query.riskOnly)
    rows = rows.filter(
      (r) => !!r.badge || (r.cells?.some((c) => c.level !== null && c.level <= 1) ?? false),
    )
  if (query.sort === 'LOW_FIRST')
    rows = [...rows].sort((a, b) => personRowSortKey(a) - personRowSortKey(b))

  return delay({
    ...base,
    axis: { vertical: '팀 › 팀원', horizontal: base.axis.horizontal },
    level: 'person',
    // 반·팀 화면과 같은 한 문장 형식으로 맞췄다(렌더 확인 후 사용자 지시) —
    // "↑(재응시 후 상승)" 설명은 이 줄에서 빠졌지만, 그 설명은 이번 라운드에
    // `HeatmapLegend`의 범례 예시로 옮겨 넣었다(사용자가 직접 요청). "교육생
    // 이력으로 이동" → "교육생 이력 이동"으로 "으로"도 뺐다(같은 라운드, 사용자
    // 지시).
    groupText: '이름을 클릭하여 교육생 이력 이동',
    classFilter,
    teamFilter,
    teamOptions,
    avgRow: teamAvgRow,
    rows,
    crumb: [classFilter, teamOptions.find((t) => t.id === teamFilter)?.name ?? ''],
    flaggedConcepts,
  })
}
