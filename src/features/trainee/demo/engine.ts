/*
  ⚠️ **여기만 `.ts` 확장자를 붙인다.** 코드베이스의 나머지는 확장자를 안 쓰지만, 이
  파일은 브라우저 밖(`node --test scripts/check-demo-engine.mts`)에서도 실행된다 —
  node의 ESM 해석기는 확장자를 안 붙이면 못 찾는다. tsconfig의 `allowImportingTsExtensions`가
  이미 켜져 있고 Vite도 그대로 푼다.
*/
import type { CurrentQuestion, ProblemView, Turn } from '../session/_/api/types'
import type { SessionMode } from '../session/types'
import { PROBLEMS } from './data/fixture.ts'
import { answerFor, evidenceFor } from './data/answers.ts'
import { PASS_SCORE, type AxisCode, type Score } from './data/rubric.ts'

/*
  시연용 진행 엔진 — **실제 서버가 하는 판정을 그대로 옮긴 순수 함수**다.

  React도 모르고 fetch도 모른다. 그래서 시연 중 서버가 전부 죽어 있어도 돌고,
  규칙이 맞는지 테스트로 확인할 수 있다(`engine.test.ts`).

  ## 실제와 무엇이 같은가

  진행 규칙이 같다 — 3점이 도달 경계고, 미달이면 힌트가 열리고, 한 축에서 힌트 둘을
  다 쓰고도 미달이면 **그 문제가 끝난다**(`docs/plan/v2/14-verification-design.md:140`).
  녹화 데이터의 문제1·문제3이 실제로 그 경로로 닫혔다.

  ## 실제와 무엇이 다른가

  점수를 AI가 아니라 **시연자가 정한다.** 그게 이 화면의 전부다 — 0~5를 누르는 것은
  "이런 답변을 냈다고 치자"가 아니라 **"채점이 N점으로 나왔다고 치자"** 이고, 그 뒤
  갈림길은 실제 규칙이 정한다.

  시간으로 끝나지 않는다. 시계는 실제 값(60분·20분)으로 돌지만 종료는 시연자의
  「시간 초과」 버튼만 일으킨다 — 시연 도중 예상 못 한 타이밍에 화면이 넘어가면
  설명하던 사람이 말을 잃는다.
*/

export type Phase = 'INTRO' | 'IN_PROBLEM' | 'TRANSITION' | 'ENDED'

/** 한 축이 어떻게 끝났나. `NOT_REACHED`는 앞에서 문제가 닫혀 **묻지도 못한** 축이다 */
export type AxisStatus = 'PASSED' | 'NOT_PASSED' | 'NOT_REACHED' | 'IN_PROGRESS'

export type AxisResult = {
  problemNo: number
  axisCode: AxisCode
  status: AxisStatus
  /** 이 축에서 받은 점수들 — 힌트 없이 → 힌트1 후 → 힌트2 후 순서다 */
  scores: Score[]
  /** 통과했다면 그때의 점수. 미달이면 마지막 점수. 미도달이면 `null` */
  finalScore: Score | null
  /** 채점 근거. 녹화된 자리에서 점수까지 맞을 때만 있다 */
  evidence: string | null
}

/** 문제가 왜 닫혔나 — 실제 `close_reason`과 같은 값이다 */
export type CloseReason = 'ALL_AXES' | 'HINTS_EXHAUSTED' | 'PROBLEM_TIME_LIMIT' | null

export type DemoState = {
  phase: Phase
  /*
    `FIRST` 1차 응시 · `REVIEW` 다시 보기.

    **다시 보기는 한 문제만 다시 연다.** 리포트에서 2단 미만인 개념에만 버튼이 붙고,
    그 문제 하나로 세션이 구성된다 — 통과한 개념까지 다시 물으면 「다시 보기」가 아니라
    재응시가 된다.
  */
  mode: SessionMode
  /** `REVIEW`가 보고 있는 문제 번호. `FIRST`면 `null` */
  reviewProblemNo: number | null
  /** 0-based. 화면에 그릴 때는 `+1` */
  problemIdx: number
  /** 0-based (L1=0 … L4=3) */
  axisIdx: number
  hintsUsed: number
  /** 지금 문제에서 이미 답이 끝난 턴들 */
  turns: Turn[]
  /** 12칸 누적. 문제 순 → 축 순 */
  results: AxisResult[]
  /*
    다시 보기 결과 — **`results`를 덮지 않는다.**

    도달 단계의 정본은 1차 응시다(`ConceptCard`가 배지를 그 값으로 그린다). 다시 봐서
    올라간 것은 그 아래 한 줄로만 말한다(`comparedReach`). 덮어쓰면 "원래 몇 단이었나"가
    사라져 성장이 안 보인다.
  */
  reviewResults: AxisResult[]
  closeReasons: CloseReason[]
  transitionReason: 'NEXT' | 'STOP' | null
  endReason: 'COMPLETED' | 'TIMEOUT' | null
}

export const MAX_HINTS = 2
const AXES: AxisCode[] = ['L1', 'L2', 'L3', 'L4']
export const PROBLEM_TOTAL = PROBLEMS.length

/*
  시각은 **문자열 자리만 채운다.** 화면이 `answeredAt`을 그리지 않으므로 값이 무엇이든
  상관없는데, 타입이 `string`이라 비워 둘 수는 없다. 여기서 `new Date()`를 부르면
  같은 상태가 저장·복원될 때마다 달라져 테스트가 흔들린다 — 고정값을 쓴다.
*/
const ANSWERED_AT = '2026-08-25T10:00:00+09:00'

const blankResults = (): AxisResult[] =>
  PROBLEMS.flatMap((p) =>
    AXES.map((axisCode) => ({
      problemNo: p.problemNo,
      axisCode,
      status: 'NOT_REACHED' as AxisStatus,
      scores: [],
      finalScore: null,
      evidence: null,
    })),
  )

export function initialState(): DemoState {
  return {
    phase: 'INTRO',
    mode: 'FIRST',
    reviewProblemNo: null,
    problemIdx: 0,
    axisIdx: 0,
    hintsUsed: 0,
    turns: [],
    results: blankResults(),
    reviewResults: blankResults(),
    closeReasons: PROBLEMS.map(() => null),
    transitionReason: null,
    endReason: null,
  }
}

export type DemoAction =
  | { type: 'START' }
  /** 시연자가 점수를 눌렀다 — 이것이 답변 제출이자 채점 결과다 */
  | { type: 'ANSWER'; score: Score }
  /** 시연자가 「시간 초과」를 눌렀다 */
  | { type: 'TIME_OUT' }
  /** 학생이 「다시 설명해 주세요」를 눌렀다 — 점수와 무관하게 직접 여는 힌트 */
  | { type: 'OPEN_HINT' }
  /** 전환 화면의 「계속하기」 */
  | { type: 'CONTINUE' }
  /** 리포트에서 「다시 보기」를 눌렀다 — 그 개념 하나만 다시 연다 */
  | { type: 'START_REVIEW'; problemNo: number }
  | { type: 'RESET' }

export function reduce(s: DemoState, a: DemoAction): DemoState {
  switch (a.type) {
    case 'START':
      return { ...s, phase: 'IN_PROBLEM' }

    case 'RESET':
      return initialState()

    /*
      다시 보기 — **그 문제 하나로 세션을 다시 연다.**

      1차 결과(`results`·`closeReasons`)는 그대로 두고 `reviewResults`만 비운다. 도달
      단계의 정본은 1차이고, 다시 봐서 올라간 것은 리포트가 `comparedReach`로 곁들여
      말한다(실제 제품과 같은 규칙 — `ConceptCard` 주석).
    */
    case 'START_REVIEW': {
      const idx = PROBLEMS.findIndex((p) => p.problemNo === a.problemNo)
      if (idx < 0) return s
      return {
        ...s,
        phase: 'IN_PROBLEM',
        mode: 'REVIEW',
        reviewProblemNo: a.problemNo,
        problemIdx: idx,
        axisIdx: 0,
        hintsUsed: 0,
        turns: [],
        reviewResults: blankResults(),
        transitionReason: null,
        endReason: null,
      }
    }

    case 'CONTINUE':
      // 전환 화면에서만 유효하다. 다음 문제는 이미 `problemIdx`가 가리키고 있다
      return s.phase === 'TRANSITION' ? { ...s, phase: 'IN_PROBLEM', transitionReason: null } : s

    case 'ANSWER':
      return answer(s, a.score)

    case 'TIME_OUT':
      return s.phase === 'IN_PROBLEM' ? closeProblem(s, 'PROBLEM_TIME_LIMIT') : s

    /*
      학생이 직접 여는 힌트 — **점수를 매기지 않고 힌트만 하나 연다.**

      미달로 자동으로 열리는 것과 같은 자원을 쓴다(축당 2개). 실제 서버도 요청분과
      지급분을 합쳐 세므로(`hintsLeft` 주석) 여기서도 한 칸으로 둔다.

      다 썼으면 아무 일도 안 한다 — 실제 화면은 그때 버튼을 문구로 바꾸므로 누를 수
      없지만, 상태 쪽에서도 막아 두어야 규칙이 한 곳에 있다.
    */
    case 'OPEN_HINT':
      return s.phase === 'IN_PROBLEM' && s.hintsUsed < MAX_HINTS
        ? { ...s, hintsUsed: s.hintsUsed + 1 }
        : s
  }
}

function answer(s: DemoState, score: Score): DemoState {
  if (s.phase !== 'IN_PROBLEM') return s

  const problem = PROBLEMS[s.problemIdx]
  const stage = problem.stages[s.axisIdx]
  const axisCode = AXES[s.axisIdx]

  /*
    턴을 쌓는다. `hintText`는 **이 답변 직전에 보여준 힌트**다 — 첫 시도면 없다.
    QuestionThread가 그 순서를 전제로 그리므로(힌트 먼저, 답변 나중) 여기서 맞춰 둔다.
  */
  const turn: Turn = {
    sequenceNo: s.axisIdx + 1,
    questionText: stage.questionText,
    hintText: s.hintsUsed > 0 ? stage.hints[s.hintsUsed - 1] : null,
    answerText: answerFor(problem.problemNo, axisCode, s.hintsUsed, score),
    answeredAt: ANSWERED_AT,
    highlight: highlightOf(s.problemIdx, s.axisIdx),
  }

  const record = (list: AxisResult[]) =>
    list.map((r) =>
      r.problemNo === problem.problemNo && r.axisCode === axisCode
        ? {
            ...r,
            scores: [...r.scores, score],
            finalScore: score,
            evidence: evidenceFor(problem.problemNo, axisCode, s.hintsUsed, score) ?? r.evidence,
          }
        : r,
    )

  const next: DemoState =
    s.mode === 'REVIEW'
      ? { ...s, turns: [...s.turns, turn], reviewResults: record(s.reviewResults) }
      : { ...s, turns: [...s.turns, turn], results: record(s.results) }

  // 통과 — 다음 축으로. L4였으면 이 문제는 물어볼 것이 없다
  if (score >= PASS_SCORE) {
    const passed = setStatus(next, problem.problemNo, axisCode, 'PASSED')
    return s.axisIdx === AXES.length - 1
      ? closeProblem(passed, 'ALL_AXES')
      : { ...passed, axisIdx: s.axisIdx + 1, hintsUsed: 0 }
  }

  // 미달인데 아직 설명해 줄 것이 남았다 — 힌트를 열고 같은 축에 다시 선다
  if (s.hintsUsed < MAX_HINTS) {
    return { ...next, hintsUsed: s.hintsUsed + 1 }
  }

  // 힌트를 다 쓰고도 미달 — 이 축이 확정 미달이고, 그러면 문제가 끝난다
  return closeProblem(setStatus(next, problem.problemNo, axisCode, 'NOT_PASSED'), 'HINTS_EXHAUSTED')
}

/**
 * 문제를 닫고 다음 문제로 커서를 옮긴다.
 *
 * 남은 축은 손대지 않는다 — 초기값이 이미 `NOT_REACHED`다. **"못 푼 것"과 "묻지도
 * 못한 것"이 갈려 있어야** 리포트에서 도달 단계를 셀 수 있다.
 */
function closeProblem(s: DemoState, reason: NonNullable<CloseReason>): DemoState {
  /*
    **다시 보기는 한 문제뿐이라 그 문제가 닫히면 곧 끝이다.** 1차의 종료 사유
    (`closeReasons`)도 건드리지 않는다 — 그건 1차가 왜 끝났는지의 기록이다.
  */
  if (s.mode === 'REVIEW') {
    return { ...s, phase: 'ENDED', endReason: 'COMPLETED', transitionReason: null }
  }

  const closeReasons = s.closeReasons.map((r, i) => (i === s.problemIdx ? reason : r))
  const isLast = s.problemIdx === PROBLEMS.length - 1

  if (isLast) {
    return { ...s, phase: 'ENDED', endReason: 'COMPLETED', closeReasons, transitionReason: null }
  }

  return {
    ...s,
    phase: 'TRANSITION',
    // 다 물어보고 넘어가는 것과 중간에 접힌 것은 전환 화면 문구가 달라야 한다
    transitionReason: reason === 'ALL_AXES' ? 'NEXT' : 'STOP',
    closeReasons,
    problemIdx: s.problemIdx + 1,
    axisIdx: 0,
    hintsUsed: 0,
    turns: [],
  }
}

const setStatus = (
  s: DemoState,
  problemNo: number,
  axisCode: AxisCode,
  status: AxisStatus,
): DemoState => {
  const mark = (list: AxisResult[]) =>
    list.map((r) => (r.problemNo === problemNo && r.axisCode === axisCode ? { ...r, status } : r))
  return s.mode === 'REVIEW'
    ? { ...s, reviewResults: mark(s.reviewResults) }
    : { ...s, results: mark(s.results) }
}

/*
  질문이 가리키는 코드 구간. 분석 결과가 축마다 `QUESTION_HIGHLIGHT`를 하나씩 준다 —
  없으면 문제의 기본 구간으로 접는다.
*/
function highlightOf(problemIdx: number, axisIdx: number) {
  const p = PROBLEMS[problemIdx]
  const axisCode = AXES[axisIdx]
  const ref = p.references.find(
    (r) => r.type === 'QUESTION_HIGHLIGHT' && r.axisCode === axisCode && r.path,
  )
  return {
    path: ref?.path ?? p.path,
    lineStart: ref?.lineStart ?? p.lineStart,
    lineEnd: ref?.lineEnd ?? p.lineEnd,
  }
}

/* ── 화면이 쓰는 파생값 ─────────────────────────────────────────────── */

/**
 * 지금 문제를 실제 화면의 `ProblemView` 모양으로 만든다.
 *
 * 이 모양을 맞추는 것이 이 파일의 값어치다 — `CodePane`·`QuestionThread`를 **한 줄도
 * 고치지 않고** 그대로 쓸 수 있다.
 */
export function currentProblem(s: DemoState): ProblemView {
  const p = PROBLEMS[s.problemIdx]
  /*
    **다시 보기는 문제가 하나뿐이라 `1 / 1`이다.**

    전체 번호를 그대로 쓰면 상단이 `2 / 3`으로 나와 나머지 둘도 다시 푸는 것처럼
    읽힌다 — 다시 보기는 그 개념 하나만 여는 자리다(실사용 피드백).
  */
  const review = s.mode === 'REVIEW'
  return {
    problemNo: review ? 1 : p.problemNo,
    problemTotal: review ? 1 : PROBLEM_TOTAL,
    title: p.title,
    timeLimitAt: null,
    code: {
      path: p.path,
      language: p.language,
      snippet: p.snippet,
      lineStart: p.lineStart,
      lineEnd: p.lineEnd,
      references: p.references.map((r) => ({
        type: r.type,
        path: r.path,
        lineStart: r.lineStart,
        lineEnd: r.lineEnd,
        axisCode: r.axisCode,
      })),
    },
    turns: s.turns,
    current: currentQuestion(s),
  }
}

function currentQuestion(s: DemoState): CurrentQuestion | null {
  if (s.phase !== 'IN_PROBLEM') return null
  const stage = PROBLEMS[s.problemIdx].stages[s.axisIdx]
  return {
    sequenceNo: s.axisIdx + 1,
    questionText: stage.questionText,
    shownHints: stage.hints.slice(0, s.hintsUsed),
    hintsUsed: s.hintsUsed,
    hintsLeft: MAX_HINTS - s.hintsUsed,
    highlight: highlightOf(s.problemIdx, s.axisIdx),
    /*
      마지막 턴인지는 **알 수 없다.** 다음 답변이 통과일지 미달일지에 따라 갈리는데
      그건 시연자가 아직 안 눌렀다. 실제 서버는 커서를 갖고 있어 답할 수 있지만
      여기서는 지어내지 않는다 — 틀린 예고를 하느니 안 하는 편이 낫다.
    */
    lastTurnOfSession: false,
  }
}

/** 지금 묻고 있는 축 — 점수 버튼이 어느 루브릭을 보여줄지 정한다 */
export const currentAxis = (s: DemoState): AxisCode => AXES[s.axisIdx]

/**
 * 도달 단계 0~4 — **L1부터 연속으로 통과한 축의 수**다.
 *
 * 계단이라 건너뛰지 않는다. L1을 못 넘었으면 0단이고, L2까지 넘고 L3에서 막혔으면
 * 2단이다. 뒤쪽 축을 통과했더라도 앞에서 끊겼으면 세지 않는다 — 비보상 원칙이다
 * (`docs/plan/v2/14-verification-design.md` 2절).
 */
export function reachedLevel(results: AxisResult[], problemNo: number): 0 | 1 | 2 | 3 | 4 {
  let level = 0
  for (const axisCode of AXES) {
    const r = results.find((x) => x.problemNo === problemNo && x.axisCode === axisCode)
    if (r?.status !== 'PASSED') break
    level += 1
  }
  return level as 0 | 1 | 2 | 3 | 4
}

export const axisResults = (results: AxisResult[], problemNo: number) =>
  results.filter((r) => r.problemNo === problemNo)

/** 세션을 시작은 했나 — 홈이 「시작하기」와 「이어서 하기」를 가른다 */
export const hasStarted = (s: DemoState) => s.phase !== 'INTRO'
