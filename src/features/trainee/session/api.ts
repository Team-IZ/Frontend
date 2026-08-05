import { RETRY_SCRIPT, SESSION_SCRIPT } from './script'
import type {
  AnsweredTurn,
  SessionMode,
  SessionState,
  SubmitAnswerResult,
  TurnScript,
} from './types'

/*
  경계 — 화면이 유일하게 의존하는 곳(api-boundary.md §3). 실제로 서버를 타는 것은
  `submitAnswer` 하나뿐이다 — 답 다음에 무슨 일이 일어나는지는 실제로는 AI 채점
  결과라서, 연동 시 이 함수 내부만 실제 호출로 바뀌면 리듀서·화면은 그대로다.
*/

const LATENCY_MS = 250

const delay = <T>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS))

function baseState(mode: SessionMode, now: number): SessionState {
  return {
    mode,
    phase: 'INTRO',
    problemIndex: 0,
    problems: mode === 'RETRY' ? RETRY_SCRIPT : SESSION_SCRIPT,
    answeredTurns: [],
    currentHintUsed: 0,
    transitionReason: null,
    endReason: null,
    sessionStartedAt: now,
    callersExpanded: false,
  }
}

/** @param previewKey dev 전용 오버라이드(`?state=`) — 케이스 표의 지점으로 바로 진입한다 */
export function getSession(
  mode: SessionMode,
  previewKey?: string,
  now = Date.now(),
): Promise<SessionState> {
  // ===== Mock 버전 (현재 활성) =====
  const state = baseState(mode, now)
  if (!previewKey) return delay(state)
  return delay(applyPreview(state, previewKey))
  // return http<SessionState>(`/sessions/current?mode=${mode}`)
}

export function submitAnswer(turn: TurnScript, hintUsed: 0 | 1 | 2): Promise<SubmitAnswerResult> {
  // ===== Mock 버전 (현재 활성) =====
  const outcome =
    hintUsed === 2 && turn.hintExhaustedOutcome ? turn.hintExhaustedOutcome : turn.outcome
  return delay({ outcome })
  // return http<SubmitAnswerResult>(`/sessions/${sessionId}/turns`, { method: 'POST', body: { answer, hintUsed } })
}

const FIRST_ANSWERED: AnsweredTurn = {
  question:
    '이 함수는 무슨 일을 하나요? 어떤 값이 들어오고, 어디에서 쓰이는지도 같이 이야기해 주세요.',
  ref: 'nodes.py:12–20',
  answer:
    'state를 받아서 사람이 확인해야 하는 상황인지 True/False로 알려주는 함수입니다. 재시도가 3번을 넘거나 결정이 REJECTED면 True를 돌려줍니다. graph에서 분기 조건으로 씁니다.',
  hintUsed: 0,
}

function applyPreview(state: SessionState, key: string): SessionState {
  const p2t2Answered: AnsweredTurn = { ...FIRST_ANSWERED }
  switch (key) {
    case 'intro':
      return state
    case 'ask':
      return { ...state, phase: 'IN_PROBLEM', problemIndex: 1 }
    case 'thread':
      return { ...state, phase: 'IN_PROBLEM', problemIndex: 1, answeredTurns: [p2t2Answered] }
    case 'again':
      return {
        ...state,
        phase: 'IN_PROBLEM',
        problemIndex: 1,
        answeredTurns: [p2t2Answered],
        currentHintUsed: 1,
      }
    case 'hintgone':
      return {
        ...state,
        phase: 'IN_PROBLEM',
        problemIndex: 1,
        answeredTurns: [p2t2Answered],
        currentHintUsed: 2,
      }
    case 'waiting':
      return {
        ...state,
        phase: 'WAITING_NEXT',
        problemIndex: 1,
        answeredTurns: [
          p2t2Answered,
          { ...p2t2Answered, question: '교안에서는 세 가지로 봤는데…', ref: 'nodes.py:14, 17' },
        ],
      }
    case 'deeper':
      return {
        ...state,
        phase: 'IN_PROBLEM',
        problemIndex: 1,
        answeredTurns: [
          p2t2Answered,
          { ...p2t2Answered, question: '교안에서는 세 가지로 봤는데…', ref: 'nodes.py:14, 17' },
        ],
      }
    case 'last':
      return { ...state, phase: 'IN_PROBLEM', problemIndex: 2, answeredTurns: [FIRST_ANSWERED] }
    case 'away':
      return { ...state, phase: 'IN_PROBLEM', problemIndex: 1, answeredTurns: [p2t2Answered] }
    case 'offline':
      return { ...state, phase: 'IN_PROBLEM', problemIndex: 1, answeredTurns: [p2t2Answered] }
    case 'stop':
      return { ...state, phase: 'TRANSITION', transitionReason: 'STOP', problemIndex: 1 }
    case 'next':
      return { ...state, phase: 'TRANSITION', transitionReason: 'NEXT', problemIndex: 1 }
    case 'end':
      return { ...state, phase: 'ENDED', endReason: 'COMPLETED', problemIndex: 2 }
    case 'timeout':
      return { ...state, phase: 'ENDED', endReason: 'TIMEOUT', problemIndex: 1 }
    case 'r-intro':
      return { ...state, mode: 'RETRY', problems: RETRY_SCRIPT }
    case 'r-ask':
      return { ...state, mode: 'RETRY', problems: RETRY_SCRIPT, phase: 'IN_PROBLEM' }
    case 'r-pass':
      return {
        ...state,
        mode: 'RETRY',
        problems: RETRY_SCRIPT,
        phase: 'TRANSITION',
        transitionReason: 'NEXT',
      }
    case 'r-end':
      return {
        ...state,
        mode: 'RETRY',
        problems: RETRY_SCRIPT,
        phase: 'ENDED',
        endReason: 'COMPLETED',
        problemIndex: 1,
      }
    default:
      return state
  }
}
