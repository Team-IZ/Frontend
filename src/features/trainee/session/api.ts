import { SESSION_SCRIPT } from './script'
import {
  MAX_HINTS,
  PASS_SCORE,
  hintsUsed,
  type Concept,
  type Question,
  type Score,
  type SessionMode,
  type SessionState,
  type SubmitAnswerResult,
  type ThreadItem,
} from './types'

/*
  경계 — 화면이 유일하게 의존하는 곳(api-boundary.md §3).

  **판정은 전부 여기서 한다.** 실제로는 서버가 채점하고 `outcome`을 정하는데, 화면이
  "힌트를 다 썼는데도 미달인가"를 세기 시작하면 그 규칙이 화면과 서버 두 곳에 생긴다.
  연동 시 이 파일 안쪽만 실제 호출로 바뀌고 리듀서·화면은 그대로다.
*/

const LATENCY_MS = 250

const delay = <T>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS))

/*
  ponytail: **길이 휴리스틱**이다 — 25자마다 1점, 최대 5점.

  실제 채점은 AI가 답변의 내용을 본다. 목에는 그게 없는데, 지금 고치는 결함이 정확히
  *"답변 내용과 무관하게 다음으로 넘어간다"* 라서 목이 답변을 아예 안 보면 고쳤는지
  확인할 방법이 없다. 그래서 내용의 가장 조잡한 대용품으로 길이를 쓴다.

  **천장이 분명하다** — 의미 없는 긴 글도 통과한다. 이것으로 검증하는 것은 채점 정확도가
  아니라 *화면이 점수에 반응하는가*(힌트가 뜨는가·같은 질문에 머무는가) 하나다.
*/
const scoreOf = (answer: string): Score =>
  Math.min(5, Math.floor(answer.trim().length / 25)) as Score

/** 재시험 대상 — 실제로는 서버가 도달 단계로 정한다. 목은 마지막 개념 하나로 고정 */
const RETRY_CONCEPT_INDEX = 2

function baseState(mode: SessionMode, concepts: Concept[], now: number): SessionState {
  return {
    mode,
    phase: 'INTRO',
    conceptIndex: 0,
    concepts,
    answered: [],
    current: [],
    reached: concepts.map(() => null),
    transitionReason: null,
    endReason: null,
    sessionStartedAt: now,
    conceptStartedAt: now,
    // 처음부터 열어 둔다 — 이 함수가 어디서 쓰이는지는 질문에 답하는 데 필요한
    // 맥락이라, 학생이 그것을 찾아 여는 단계를 거치게 할 이유가 없다.
    callersExpanded: true,
  }
}

/**
 * 세션 한 판.
 *
 * **재시험은 불합격 개념만, 그 개념을 L1부터 전부 다시 본다**(tr-03-session.md §2-5).
 * 예전 목은 "막혔던 질문 하나만" 이었는데 그건 규칙과 반대였다.
 *
 * @param previewKey dev 전용 오버라이드(`?state=`) — 케이스 표의 지점으로 바로 진입한다
 */
export function getSession(
  mode: SessionMode,
  previewKey?: string,
  now = Date.now(),
): Promise<SessionState> {
  // ===== Mock 버전 (현재 활성) =====
  const concepts = mode === 'RETRY' ? [SESSION_SCRIPT[RETRY_CONCEPT_INDEX]] : SESSION_SCRIPT
  const state = baseState(mode, concepts, now)
  if (!previewKey) return delay(state)
  return delay(applyPreview(state, previewKey))
  // return http<SessionState>(`/sessions/current?mode=${mode}`)
}

/**
 * 답변 채점 — **`outcome`까지 여기서 정한다.**
 *
 * ```
 * 3점 이상        → 다음 단계 (마지막 단계였으면 개념 종료)
 * 3점 미만·힌트 O → 같은 질문 유지, 힌트 하나 지급
 * 3점 미만·힌트 X → 개념 종료
 * ```
 */
export function submitAnswer(params: {
  question: Question
  /** 지금 질문의 타임라인 — 시도·힌트 수를 여기서 센다 */
  current: ThreadItem[]
  /** 이 질문이 개념의 마지막 단계인가 */
  isLastQuestion: boolean
  answer: string
}): Promise<SubmitAnswerResult> {
  // ===== Mock 버전 (현재 활성) =====
  const score = scoreOf(params.answer)

  if (score >= PASS_SCORE) {
    return delay({ score, outcome: params.isLastQuestion ? 'NEXT_CONCEPT' : 'NEXT_QUESTION' })
  }

  const used = hintsUsed(params.current)
  if (used < MAX_HINTS) {
    return delay({ score, outcome: 'SAME_QUESTION', hint: params.question.hints[used] })
  }

  // 힌트를 다 쓰고도 미달 — 이 개념은 여기까지다
  return delay({ score, outcome: 'NEXT_CONCEPT' })
  // return http<SubmitAnswerResult>(`/sessions/${id}/answers`, { method: 'POST', body: { answer } })
}

/**
 * 학생이 [다시 설명해 주세요]를 눌렀을 때. **지급분과 같은 주머니를 쓴다**(합산 2개).
 * 남은 게 없으면 null — 화면은 그때 버튼을 감춘다.
 */
export function requestHint(params: {
  question: Question
  current: ThreadItem[]
}): Promise<string | null> {
  // ===== Mock 버전 (현재 활성) =====
  const used = hintsUsed(params.current)
  if (used >= MAX_HINTS) return delay(null)
  return delay(params.question.hints[used])
  // return http<{ text: string }>(`/sessions/${id}/hints`, { method: 'POST' })
}

/* ─── dev 프리뷰 ─────────────────────────────────────────────── */

const SHORT_ANSWER: ThreadItem = {
  kind: 'answer',
  text: '컨트롤러가 요청을 받아서 서비스로 넘깁니다.',
  score: 1,
}

/** 질문 하나에 답이 끝난 상태를 만든다 — 프리뷰에서 스레드를 채울 때 쓴다 */
function passed(concept: Concept, level: number) {
  const q = concept.questions[level - 1]
  return {
    level: q.level,
    text: q.text,
    ref: q.ref,
    items: [
      {
        kind: 'answer' as const,
        text: '요청을 받아 서비스에 넘기고, 결과를 ResponseEntity로 감싸 돌려줍니다. 조회는 200, 생성은 201을 쓰도록 상태 코드를 나눠 뒀습니다.',
        score: 4 as Score,
      },
    ],
    passed: true,
  }
}

function applyPreview(state: SessionState, key: string): SessionState {
  const first = state.concepts[0]
  switch (key) {
    case 'intro':
      return state
    case 'ask':
      return { ...state, phase: 'IN_PROBLEM' }
    case 'thread':
      // L1 통과 → L2 진행 중
      return { ...state, phase: 'IN_PROBLEM', answered: [passed(first, 1)] }
    case 'again':
      // 한 번 미달해서 힌트 1개를 받은 상태
      return {
        ...state,
        phase: 'IN_PROBLEM',
        answered: [passed(first, 1)],
        current: [SHORT_ANSWER, { kind: 'hint', text: first.questions[1].hints[0] }],
      }
    case 'hintgone':
      // 두 번 미달 — 힌트 2개 소진. 다음 답이 미달이면 개념이 끝난다
      return {
        ...state,
        phase: 'IN_PROBLEM',
        answered: [passed(first, 1)],
        current: [
          SHORT_ANSWER,
          { kind: 'hint', text: first.questions[1].hints[0] },
          SHORT_ANSWER,
          { kind: 'hint', text: first.questions[1].hints[1] },
        ],
      }
    case 'waiting':
      return { ...state, phase: 'WAITING_NEXT', answered: [passed(first, 1)] }
    case 'deeper':
      // L3까지 올라온 상태
      return {
        ...state,
        phase: 'IN_PROBLEM',
        answered: [passed(first, 1), passed(first, 2)],
      }
    case 'last':
      // 마지막 개념의 마지막 단계
      return {
        ...state,
        phase: 'IN_PROBLEM',
        conceptIndex: state.concepts.length - 1,
        answered: [1, 2, 3].map((l) => passed(state.concepts[state.concepts.length - 1], l)),
        reached: state.reached.map((r, i) => (i < state.concepts.length - 1 ? 3 : r)),
      }
    case 'stop':
      return { ...state, phase: 'TRANSITION', transitionReason: 'STOP', reached: [1, null, null] }
    case 'next':
      return { ...state, phase: 'TRANSITION', transitionReason: 'NEXT', reached: [3, null, null] }
    case 'end':
      return {
        ...state,
        phase: 'ENDED',
        endReason: 'COMPLETED',
        conceptIndex: state.concepts.length - 1,
        reached: state.reached.map(() => 3),
      }
    case 'timeout':
      return { ...state, phase: 'ENDED', endReason: 'TIMEOUT', reached: [3, 1, null] }
    default:
      return state
  }
}
