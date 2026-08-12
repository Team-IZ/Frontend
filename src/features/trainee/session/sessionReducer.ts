import type {
  AnsweredQuestion,
  ReachedLevel,
  Score,
  SessionState,
  SubmitAnswerResult,
} from './types'

/*
  단계 진행·힌트·전환 상태 머신 — 화면이 실제로 갖는 로직이다(api-boundary §1-⑤ 화면 것).

  **판정은 여기 없다.** `api.ts`가 점수와 `outcome`을 계산해 주고 리듀서는 적용만 한다 —
  "힌트를 다 썼는데도 미달인가"를 여기서 세면 그 규칙이 화면과 서버 두 곳에 생긴다.
  연동 시 `api.ts` 안쪽만 실제 호출로 바뀌고 이 파일은 한 글자도 안 바뀐다.

  ## 도달 단계는 세지 않는다 — 통과한 질문 수가 곧 그 값이다
  질문은 L1부터 순서대로이고 **통과해야만 다음 단계로 올라간다.** 그래서
  `answered.filter(passed).length`가 마지막으로 통과한 단계와 항상 같다. L2에서 실패하면
  통과가 1개라 1단, L1에서 실패하면 0개라 0단이다 — *"2단에서 종료되면 1단"* 이 별도
  보정이 아니라 이 계산에서 그냥 나온다.

  전환 두 갈래 — 통과해서 끝난 개념은 `NEXT`로 바로 가고, 설명이 안 닿아 접힌 개념만
  `STOP`을 거쳐 `NEXT`로 간다.
*/

export type SessionAction =
  | { type: 'START' }
  /** 학생이 [다시 설명해 주세요]를 눌러 받은 힌트 */
  | { type: 'SHOW_HINT'; hint: string }
  | ({ type: 'APPLY_SUBMIT_RESULT'; answer: string } & SubmitAnswerResult)
  | { type: 'RECEIVE_NEXT_QUESTION' }
  | { type: 'CONTINUE_AFTER_STOP' }
  /** `now`로 개념 제한시간이 다시 시작한다 — 리듀서가 시계를 읽지 않게 */
  | { type: 'START_NEXT_CONCEPT'; now: number }
  | { type: 'TOGGLE_CALLERS' }
  /** 문제당 제한시간 초과 — 그 개념은 거기까지다 */
  | { type: 'CONCEPT_TIMEOUT' }
  /** 세션 전체 제한시간 초과 */
  | { type: 'TIMEOUT' }

/** 통과한 질문 수 = 마지막으로 통과한 단계 */
const reachedOf = (answered: AnsweredQuestion[]) =>
  answered.filter((a) => a.passed).length as ReachedLevel

/** 지금 개념을 닫는다 — 도달 단계를 확정하고 다음으로 넘길 준비를 한다 */
function closeConcept(state: SessionState, answered: AnsweredQuestion[]): SessionState {
  const reached = state.reached.map((r, i) => (i === state.conceptIndex ? reachedOf(answered) : r))
  const isLast = state.conceptIndex === state.concepts.length - 1

  if (isLast) {
    return { ...state, phase: 'ENDED', endReason: 'COMPLETED', answered, current: [], reached }
  }
  return {
    ...state,
    phase: 'TRANSITION',
    // 마지막 질문까지 통과했으면 정상 완료, 아니면 접힌 것
    transitionReason: answered[answered.length - 1]?.passed ? 'NEXT' : 'STOP',
    answered,
    current: [],
    reached,
  }
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'START':
      return { ...state, phase: 'IN_PROBLEM' }

    case 'SHOW_HINT':
      if (state.phase !== 'IN_PROBLEM') return state
      return { ...state, current: [...state.current, { kind: 'hint', text: action.hint }] }

    case 'APPLY_SUBMIT_RESULT': {
      if (state.phase !== 'IN_PROBLEM') return state
      const concept = state.concepts[state.conceptIndex]
      const question = concept.questions[state.answered.length]
      const current = [
        ...state.current,
        { kind: 'answer' as const, text: action.answer, score: action.score as Score },
      ]

      // 미달이지만 힌트가 남았다 — 같은 질문에 다시 답한다
      if (action.outcome === 'SAME_QUESTION') {
        return {
          ...state,
          current: action.hint ? [...current, { kind: 'hint', text: action.hint }] : current,
        }
      }

      const answered: AnsweredQuestion[] = [
        ...state.answered,
        {
          level: question.level,
          text: question.text,
          ref: question.ref,
          items: current,
          passed: action.outcome === 'NEXT_QUESTION' || action.score >= 3,
        },
      ]

      // 통과 — 같은 개념의 다음 단계로
      if (action.outcome === 'NEXT_QUESTION') {
        return { ...state, phase: 'WAITING_NEXT', answered, current: [] }
      }

      return closeConcept(state, answered)
    }

    case 'RECEIVE_NEXT_QUESTION':
      if (state.phase !== 'WAITING_NEXT') return state
      return { ...state, phase: 'IN_PROBLEM' }

    case 'CONTINUE_AFTER_STOP':
      if (state.phase !== 'TRANSITION' || state.transitionReason !== 'STOP') return state
      return { ...state, transitionReason: 'NEXT' }

    case 'START_NEXT_CONCEPT':
      if (state.phase !== 'TRANSITION' || state.transitionReason !== 'NEXT') return state
      return {
        ...state,
        phase: 'IN_PROBLEM',
        conceptIndex: state.conceptIndex + 1,
        answered: [],
        current: [],
        // 개념이 바뀌면 다시 열린 상태로 시작한다(baseState와 같은 기본값)
        callersExpanded: true,
        transitionReason: null,
        // 제한시간은 개념마다 새로 센다
        conceptStartedAt: action.now,
      }

    case 'TOGGLE_CALLERS':
      return { ...state, callersExpanded: !state.callersExpanded }

    /*
      ponytail: 시간이 다하면 **그 개념을 통째로 닫는다** — 남은 시도가 있어도 마찬가지다.
      백엔드에 "첫 시도에서 시간초과면 그 시도만 실패인가"를 물어 뒀고(16차 R3 확인 3),
      답이 오면 여기만 고친다.
    */
    case 'CONCEPT_TIMEOUT': {
      if (state.phase === 'ENDED' || state.phase === 'TRANSITION') return state
      return closeConcept(state, state.answered)
    }

    case 'TIMEOUT': {
      if (state.phase === 'ENDED') return state
      const reached = state.reached.map((r, i) =>
        i === state.conceptIndex ? reachedOf(state.answered) : r,
      )
      return { ...state, phase: 'ENDED', endReason: 'TIMEOUT', reached }
    }
  }
}
