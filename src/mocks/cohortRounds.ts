// ⚠️ Mock 전용 데이터 — 백엔드 연동 시 이 파일을 통째로 삭제하세요.
//
// **두 화면이 같은 숫자를 읽어야 해서 여기 있다.** OP-01 반 비교 막대는 "가장 최근
// 발행 회차의 값"이고 그것이 OP-02 격자의 그 회차 열이다(OP-02 §3 — *"클릭해서 넘어왔을
// 때 숫자가 이어져야 한다"*). 화면마다 목을 따로 만들면 같은 회차가 화면마다 다른 값을
// 갖는다(mock-first §2-4).
//
// `features/A`는 `features/B`를 import할 수 없으므로(레이어 규칙) 도메인 밖에 둔다.
// 화면은 이 파일을 열지 않는다 — 각 도메인의 `api.ts`만 읽고, 화면은 그 응답을 받는다.
//
// ⚠ **이 파일만 `features/*`를 향한다.** `src/mocks/`는 린트의 레이어 규칙 대상이 아니라
// 막히지 않지만, 방향이 거꾸로인 것은 맞다. 근거는 **이것이 목이기 때문**이다 —
// 연동 시 이 파일과 `projects/mockDb.ts`가 **같이 삭제되므로** 이 의존은 그때 함께
// 사라진다. 살아남는 코드(`api.ts` 시그니처·화면)는 서로를 모른다.
import { PROJECTS } from '@/features/operator/projects/mockDb'

/** 위험자 비율의 출처: `docs/plan/v2/wireframe/operator/analysis.html#round` 격자 */

export type RoundState =
  /** 리포트 발행됨 — 위험 판정이 켜진다(9-2 · 10-2 일괄 발행) */
  | 'PUBLISHED'
  /** 진행 중이거나 마감됐지만 미발행 → 격자에 `집계 전` */
  | 'RUNNING'
  /** 등록만 됐고 시작 전 → 격자에 `시작 전`. 0%와도 색이 다르다 */
  | 'BEFORE'

export type MockRound = {
  projectId: string
  /** 회차 번호. **열 = 등록된 미프 프로젝트**라 8 고정이 아니다(OP-02 §4-2) */
  no: number
  projectName: string
  state: RoundState
}

/**
 * **회차 목록을 OP-03의 목에서 파생시킨다.** 손으로 두 벌 적었더니 어긋났다 —
 * 프로젝트 목록은 `미프 3차 진행 중 · 4차 준비됨`인데 대시보드는 `4차 진행 중`이라
 * 말했고, `프로젝트 ↗`를 누르면 **준비됨** 상세로 갔다. 같은 기수를 두 화면이 다르게
 * 말한 것이다(mock-first §2-4가 경고한 바로 그것).
 *
 * **OP-03 목이 먼저 있었고 이미 머지됐으므로 그쪽이 기준이다.** 파생시켜 두면 그쪽이
 * 회차를 더하든 상태를 바꾸든 세 화면이 자동으로 따라간다.
 *
 * 상태 매핑 — 프로젝트 `status`는 **설계 기준**이지 시간이 아니지만(OP-03 `types.ts`),
 * 리포트 발행 여부와 1:1로 대응한다:
 *   `DONE` 끝난 회차 → 발행 · `RUNNING` 진행 중 → 집계 전 · `READY`·`PREP` → 시작 전
 *
 * **빅프는 빠진다** — 판정식이 달라 같은 표에 넣지 않는다(9-2 · OP-02 §4-2).
 *
 * ⚠ **총 회차 수를 `8`로 쓰지 않는다.** OP-01 정의서는 `미프 3차 / 8회`라고 적었지만
 * OP-02 §4-2가 *"`8`은 범위의 상한이지 상수가 아니다 · 회차를 만드는 것은 오퍼레이터고
 * 시스템이 개수를 미리 알 방법이 없다"* 고 못 박았다. **등록된 프로젝트 수**를 분모로 쓴다
 * — 기획에서 "계획 회차 수"가 나오면 그때 별도 필드가 된다.
 */
export const ROUNDS: MockRound[] = PROJECTS.filter((p) => p.kind === 'MINI')
  // `미프 3차` → 3. 회차 번호의 원천은 이름이다 — 운영자가 붙인 데이터라 화면이 안 고친다
  .map((p) => ({ p, no: Number(/(\d+)\s*차/.exec(p.name)?.[1] ?? 0) }))
  .filter((x) => x.no > 0)
  .sort((a, b) => a.no - b.no)
  .map(({ p, no }) => ({
    projectId: p.id,
    no,
    /** 격자 열 머리 2단의 아랫줄 — 회차 번호만으로는 어느 회차인지 짚을 수 없다 */
    projectName: p.name,
    state: (p.status === 'DONE'
      ? 'PUBLISHED'
      : p.status === 'RUNNING'
        ? 'RUNNING'
        : 'BEFORE') as RoundState,
  }))

/** 판정에서 빠진 사람 3종. 총계만 쓰면 어디를 볼지가 안 나온다(OP-02 §4-2) */
export type Uncounted = {
  /** 미응시 — 응시 창 안내·독촉이 도는지 */
  absent: number
  /** 무효 응시 — 세션 설계나 응시 태도(9-4) */
  invalid: number
  /** 중단 — 세션이 끊긴 것. 기술 문제일 수 있다 */
  aborted: number
}

/** 한 회차의 위험 판정 결과. **분모는 명부가 아니라 채점된 사람**이다(14-1 · 9-4) */
export type RiskCell = {
  round: number
  risky: number
  graded: number
}

export type MockClass = {
  className: string
  trainees: number
  /** 담당 매니저. 없으면 null — OP-01 `조치 필요` 미배정이 이걸 읽는다 */
  manager: string | null
  cells: RiskCell[]
  uncounted: Uncounted
}

/**
 * 기수 전체 기준선. **반 값의 합이다.**
 *
 * 목업은 기수 행을 따로 적었는데 **반 10개의 합과 맞지 않았다** — 3차 기준 위험자
 * 44 vs 반 합 55, 채점 234 vs 250. 같은 모집단인데 25%가 어긋난 것이라, 사용자가
 * 더해보면 바로 드러나는 종류의 불일치다.
 *
 * **그래서 여기서 합산한다.** 이 값은 OP-01 반 비교의 **기준선**이 되고(막대가
 * 기수보다 위인지 아래인지) OP-02 격자의 **색 판정 기준**이 되므로, 어느 쪽을 쓰느냐로
 * 반의 색이 뒤집힌다. 화면이 서버 일을 하는 것이 아니다 — 실제 API에서는 서버가
 * 같은 합을 내려준다(api-boundary §1-②). 목에서 두 벌을 유지하면 갈라질 뿐이다.
 *
 * ⚠ 남는 질문(PR): **미집계 16명이 채점 인원에서 안 빠져 있다.** 반별 호버가
 * `위험자 4명 / 채점 25명`인데 그 반 미집계가 4명이면 채점은 21명이어야 한다.
 * 목업 구조(미집계를 별도 열로 뺀 것)를 그대로 두고 분모는 건드리지 않았다 —
 * 분모를 고치면 반 비율이 전부 달라져 목업과 대조가 불가능해진다(mock-first §2-4).
 */
const sumCells = (): RiskCell[] => {
  const rounds = [...new Set(CLASSES.flatMap((c) => c.cells.map((x) => x.round)))].sort()
  return rounds.map((round) => {
    const cells = CLASSES.flatMap((c) => c.cells.filter((x) => x.round === round))
    return {
      round,
      risky: cells.reduce((n, c) => n + c.risky, 0),
      graded: cells.reduce((n, c) => n + c.graded, 0),
    }
  })
}

const sumUncounted = (): Uncounted =>
  CLASSES.reduce(
    (acc, c) => ({
      absent: acc.absent + c.uncounted.absent,
      invalid: acc.invalid + c.uncounted.invalid,
      aborted: acc.aborted + c.uncounted.aborted,
    }),
    { absent: 0, invalid: 0, aborted: 0 },
  )

export const COHORT_TOTAL = {
  trainees: 250,
  classes: 10,
  get cells() {
    return sumCells()
  },
  get uncounted() {
    return sumUncounted()
  },
}

/**
 * 반 10개. 순서는 목업 격자와 같다(최근 회차 나쁜 순 — 정렬은 `api.ts`가 한다).
 *
 * F반·H반에 담당이 없는 것은 `page-assign` 케이스의 값이다. 기본 케이스에서는 F반만
 * 비어 있으므로 H반은 채워 뒀다 — 미배정 다건은 그 케이스에서 따로 만든다.
 */
export const CLASSES: MockClass[] = [
  {
    className: 'C반',
    trainees: 25,
    manager: '윤서연',
    cells: [
      { round: 1, risky: 4, graded: 25 },
      { round: 2, risky: 6, graded: 25 },
      { round: 3, risky: 8, graded: 25 },
    ],
    uncounted: { absent: 2, invalid: 2, aborted: 0 },
  },
  {
    className: 'D반',
    trainees: 25,
    manager: '한지우',
    cells: [
      { round: 1, risky: 3, graded: 25 },
      { round: 2, risky: 5, graded: 25 },
      { round: 3, risky: 7, graded: 25 },
    ],
    uncounted: { absent: 1, invalid: 0, aborted: 0 },
  },
  {
    className: 'I반',
    trainees: 25,
    manager: '오세훈',
    cells: [
      { round: 1, risky: 4, graded: 25 },
      { round: 2, risky: 5, graded: 25 },
      { round: 3, risky: 7, graded: 25 },
    ],
    uncounted: { absent: 0, invalid: 0, aborted: 0 },
  },
  {
    className: 'A반',
    trainees: 25,
    manager: '김도현',
    cells: [
      { round: 1, risky: 3, graded: 25 },
      { round: 2, risky: 5, graded: 25 },
      // 목업 격자에 `25%`로 적혀 있으나 같은 셀의 호버가 `6명 / 25명`(=24%)이다.
      // 대시보드 막대도 `24% · 6/25명`이라 그쪽이 맞다 — 분자·분모를 원본으로 둔다.
      { round: 3, risky: 6, graded: 25 },
    ],
    uncounted: { absent: 0, invalid: 0, aborted: 1 },
  },
  {
    className: 'F반',
    trainees: 25,
    // 담당 없음 — OP-01 `조치 필요` 미배정 한 줄이 여기서 나온다
    manager: null,
    cells: [
      { round: 1, risky: 4, graded: 25 },
      { round: 2, risky: 5, graded: 25 },
      { round: 3, risky: 6, graded: 25 },
    ],
    uncounted: { absent: 3, invalid: 2, aborted: 0 },
  },
  {
    className: 'B반',
    trainees: 25,
    manager: '정하늘',
    cells: [
      { round: 1, risky: 2, graded: 25 },
      { round: 2, risky: 4, graded: 25 },
      { round: 3, risky: 5, graded: 25 },
    ],
    uncounted: { absent: 1, invalid: 0, aborted: 0 },
  },
  {
    className: 'H반',
    trainees: 25,
    manager: '배유진',
    cells: [
      { round: 1, risky: 3, graded: 25 },
      { round: 2, risky: 4, graded: 25 },
      { round: 3, risky: 5, graded: 25 },
    ],
    uncounted: { absent: 1, invalid: 1, aborted: 0 },
  },
  {
    className: 'J반',
    trainees: 25,
    manager: '류하은',
    cells: [
      { round: 1, risky: 2, graded: 25 },
      { round: 2, risky: 3, graded: 25 },
      { round: 3, risky: 4, graded: 25 },
    ],
    uncounted: { absent: 0, invalid: 0, aborted: 0 },
  },
  {
    className: 'E반',
    trainees: 25,
    manager: '신재원',
    cells: [
      { round: 1, risky: 3, graded: 25 },
      { round: 2, risky: 3, graded: 25 },
      { round: 3, risky: 4, graded: 25 },
    ],
    uncounted: { absent: 1, invalid: 0, aborted: 0 },
  },
  {
    className: 'G반',
    trainees: 25,
    manager: '문가온',
    cells: [
      { round: 1, risky: 2, graded: 25 },
      { round: 2, risky: 3, graded: 25 },
      { round: 3, risky: 3, graded: 25 },
    ],
    uncounted: { absent: 0, invalid: 0, aborted: 1 },
  },
]

/** 가장 최근 **발행** 회차. OP-01 반 비교의 기준이고 OP-02 격자의 마지막 값 열이다 */
export const latestPublishedRound = (): MockRound | undefined =>
  [...ROUNDS].reverse().find((r) => r.state === 'PUBLISHED')

/** 지금 굴러가는 회차. 없으면(전부 발행됐거나 전부 시작 전) 첫 미발행 회차 */
export const currentRound = (): MockRound | undefined =>
  ROUNDS.find((r) => r.state === 'RUNNING') ?? ROUNDS.find((r) => r.state === 'BEFORE')
