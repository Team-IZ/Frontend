// ⚠️ Mock 전용 데이터 — 백엔드 연동 시 이 파일을 통째로 삭제하세요.
//
// 반·회차·위험 비율은 여기 없다 — OP-02 분석과 **같은 값을 읽어야** 해서 `@/mocks/cohortRounds`에
// 있다(mock-first §2-4). 이 파일은 **대시보드에만 있는 값**만 갖는다: 파이프라인 진행 수,
// 조치 필요 네 줄.
import type { RoundPipeline, Todo } from './types'

/** 목업 기준일. 실제 `new Date()`를 쓰면 값이 매일 달라져 목업과 대조할 수 없다 */
export const MOCK_TODAY = '2026-07-30'

/**
 * 진행 중 회차의 파이프라인. 값은 `dashboard.html#dash`에서 그대로 옮겼다.
 * 회차 라벨·번호는 `cohortRounds`가 정하므로 여기 두지 않는다.
 */
export const PIPELINE_RUNNING = {
  submitted: 231,
  total: 250,
  /*
    ⚠ 기획에 없는 값 — 프론트가 계산했다.
    목업은 `제출 231 → 분석 실패 2팀 → 응시 198/231`이라 **실패 팀이 응시 분모에 그대로
    남아 있었다.** 실패한 팀은 응시 창이 안 열리므로(B4) 분모에서 빠져야 한다.
    팀 인원을 4명으로 잡아 231 − 8 = 223으로 뒀다 — OP-02가 `C반 6팀`이라 했고 반이
    25명이라 4명 남짓이다. **다만 목업의 `8팀 중 6팀`이 기수 전체인지 한 반인지가
    갈리지 않는다**(전체면 팀당 29명이 된다). 기획에서 팀 편성 규칙이 나오면 여기만 바꾼다.
  */
  analyzed: 223,
  analysisFailedTeams: 2,
  attended: 198,
  reportPublished: false,
  /*
    목업 `#dash`는 `07-16 18:00`인데 그건 **3차 마감**이다(그 화면이 3차를 진행 중으로
    그렸으므로). 기준일이 07-30이고 지금 진행 중인 것은 4차라 이미 지난 날짜를
    `제출 마감`으로 쓰면 화면이 거짓말을 한다. 4차 마감으로 옮긴다.
  */
  dueAt: '2026-08-06T18:00',
  startAt: null,
  notStarted: false,
} satisfies Omit<RoundPipeline, 'projectId' | 'roundLabel' | 'roundNo' | 'roundTotal'>

/** 아직 제출이 없는 회차(`#pre`). 뒤 단계는 `—`로 그린다 — 0이 아니라 **없음**이다(F3) */
export const PIPELINE_NOT_STARTED = {
  submitted: 0,
  total: 250,
  analyzed: 0,
  analysisFailedTeams: 0,
  attended: 0,
  reportPublished: false,
  dueAt: null,
  startAt: '2026-07-29T09:00',
  notStarted: true,
} satisfies Omit<RoundPipeline, 'projectId' | 'roundLabel' | 'roundNo' | 'roundTotal'>

/**
 * 기본 케이스 네 줄(`#dash`). **정렬은 api가 한다** — 목 배열 순서에 기대면 서버가
 * 다른 순서로 줄 때 화면이 조용히 틀린다.
 */
export const TODOS: Todo[] = [
  {
    kind: 'CONCEPT_GAP',
    projectId: 'mif-3',
    roundLabel: '미프 3차',
    conceptName: 'State 관리',
    unmatchedTeams: 6,
    totalTeams: 8,
  },
  {
    kind: 'GROUP_MISS',
    roundLabel: '미프 2차',
    conceptName: 'Graph 구성',
    classNames: ['C반'],
    below: 14,
    total: 25,
  },
  {
    kind: 'INTERVIEW_BACKLOG',
    className: 'D반',
    roundLabel: '미프 2차',
    elapsedDays: 11,
    pending: 7,
    othersMinDays: 3,
    othersMaxDays: 5,
  },
  {
    kind: 'UNASSIGNED',
    classNames: ['F반'],
    trainees: 25,
    reason: null,
  },
]

/** `#multi` — 같은 개념에서 일곱 반이 미달. **반이 아니라 개념을 다시 본다** */
export const TODOS_MULTI: Todo[] = [
  TODOS[0],
  {
    kind: 'GROUP_MISS',
    roundLabel: '미프 2차',
    conceptName: 'Graph 구성',
    classNames: ['A반', 'C반', 'D반', 'F반', 'H반', 'I반', 'J반'],
    below: null,
    total: null,
  },
  {
    kind: 'GROUP_MISS',
    roundLabel: '미프 2차',
    conceptName: 'HITL Trigger',
    classNames: ['C반'],
    below: 13,
    total: 25,
  },
  TODOS[2],
]

/** `#assign` — 담당이 두 반이나 비었고, 이유가 있다 */
export const TODOS_UNASSIGNED: Todo[] = [
  {
    kind: 'UNASSIGNED',
    classNames: ['F반', 'H반'],
    trainees: 50,
    reason: '박지현 매니저가 퇴사 처리된 뒤 반이 남았습니다',
  },
  TODOS[0],
]

/** `#pre` — 회차 진행 전에는 다음 회차 개념을 확정하기 전에 볼 것 하나만 남는다 */
export const TODOS_BEFORE: Todo[] = [TODOS[0]]
