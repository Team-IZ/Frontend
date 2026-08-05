import type { AnsweredTurn, SessionState, TurnOutcome } from './types'

/*
  턴 진행·힌트·전환 상태 머신 — 화면이 실제로 갖는 로직이다(api-boundary §1-⑤ 화면 것).
  서버가 오는 자리는 outcome **값** 하나뿐이고, 그 값은 `api.submitAnswer()`가 계산해서
  넘겨준다(script.ts 참고) — 리듀서는 주어진 outcome을 적용만 한다. 연동 시 `api.ts`
  안쪽만 실제 채점 호출로 바뀌고 이 파일은 한 글자도 안 바뀐다.

  전환 두 단계 — "이 문제는 여기까지"(STOP)와 "다음 문제 예고"(NEXT)를 하나로 합치지
  않는다. 정상 완료는 NEXT로 바로 가고, 설명이 안 닿아 접힌 경우만 STOP을 거쳐 NEXT로
  간다 — 목업에 `#stop`과 `#next`가 별개 페이지로 있는 이유가 이것이다.
*/

export type SessionAction =
  | { type: 'START' }
  | { type: 'REQUEST_HINT' }
  | { type: 'APPLY_SUBMIT_RESULT'; answer: string; outcome: TurnOutcome }
  | { type: 'RECEIVE_NEXT_TURN' }
  | { type: 'CONTINUE_AFTER_STOP' }
  | { type: 'START_NEXT_PROBLEM' }
  | { type: 'TOGGLE_CALLERS' }
  | { type: 'TIMEOUT' }

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'START':
      return { ...state, phase: 'IN_PROBLEM' }

    case 'REQUEST_HINT':
      if (state.phase !== 'IN_PROBLEM' || state.currentHintUsed >= 2) return state
      return { ...state, currentHintUsed: (state.currentHintUsed + 1) as 1 | 2 }

    case 'APPLY_SUBMIT_RESULT': {
      if (state.phase !== 'IN_PROBLEM') return state
      const currentTurn = state.problems[state.problemIndex].turns[state.answeredTurns.length]
      const answered: AnsweredTurn = {
        question: currentTurn.question,
        ref: currentTurn.ref,
        answer: action.answer,
        hintUsed: state.currentHintUsed,
      }
      const answeredTurns = [...state.answeredTurns, answered]
      const isLastProblem = state.problemIndex === state.problems.length - 1

      if (action.outcome === 'NEXT_TURN') {
        return { ...state, phase: 'WAITING_NEXT', answeredTurns }
      }
      if (isLastProblem) {
        return { ...state, phase: 'ENDED', endReason: 'COMPLETED', answeredTurns }
      }
      return {
        ...state,
        phase: 'TRANSITION',
        transitionReason: action.outcome === 'STOP_PROBLEM' ? 'STOP' : 'NEXT',
        answeredTurns,
      }
    }

    case 'RECEIVE_NEXT_TURN':
      if (state.phase !== 'WAITING_NEXT') return state
      return { ...state, phase: 'IN_PROBLEM', currentHintUsed: 0 }

    case 'CONTINUE_AFTER_STOP':
      if (state.phase !== 'TRANSITION' || state.transitionReason !== 'STOP') return state
      return { ...state, transitionReason: 'NEXT' }

    case 'START_NEXT_PROBLEM':
      if (state.phase !== 'TRANSITION' || state.transitionReason !== 'NEXT') return state
      return {
        ...state,
        phase: 'IN_PROBLEM',
        problemIndex: state.problemIndex + 1,
        answeredTurns: [],
        currentHintUsed: 0,
        callersExpanded: false,
        transitionReason: null,
      }

    case 'TOGGLE_CALLERS':
      return { ...state, callersExpanded: !state.callersExpanded }

    case 'TIMEOUT':
      if (state.phase === 'ENDED') return state
      return { ...state, phase: 'ENDED', endReason: 'TIMEOUT' }
  }
}
