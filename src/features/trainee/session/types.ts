/*
  TR-03 계약(api-boundary.md 갈래③). 이 화면은 TR-01/02와 성격이 다르다 — 상태 9종
  스냅샷이 아니라 **턴 단위로 진행되는 대화**라, 계약도 "지금 화면"이 아니라 "지금까지의
  턴 + 지금 턴의 진행 상황"을 담는다.

  질문 다음에 일어나는 일(꼬리질문·이 문제 종료·완료)은 실제로는 AI 채점 결과다 — 지금은
  AI가 없으므로 `script.ts`가 턴 인덱스 기준으로 완전히 확정해 둔다. 답변 내용과 무관하게
  다음 동작이 정해진다는 뜻이고, 연동 시 `api.submitAnswer()`가 실제 판정을 반환하도록
  바뀌는 자리가 여기 `TurnOutcome`이다.
*/

export type SessionMode = 'FIRST' | 'RETRY'

/** L1~L4 계단. 다시 보기는 새 층을 올라가지 않으므로 이 값을 그대로 쓴다 */
export type LadderLevel = 1 | 2 | 3 | 4

export type TurnOutcome = 'NEXT_TURN' | 'STOP_PROBLEM' | 'COMPLETE_PROBLEM'

export type TurnScript = {
  question: string
  ref: string // "nodes.py:14, 17"
  level: LadderLevel
  /** 2회까지 재진술. 다시 보기 모드에서는 아예 안 쓴다(정의서 §6+) */
  hintTexts: [string, string]
  /** 이 턴 제출 시 무슨 일이 일어나는지 */
  outcome: TurnOutcome
  /** 힌트 2회 소진 후에 제출하면 대신 이 결과로 간다(정의서 §6 "미달이면 거기서 끝난다") */
  hintExhaustedOutcome?: TurnOutcome
}

export type ProblemScript = {
  title: string
  file: string
  /** 코드 블록 — 줄번호는 실제 파일 기준, gap은 접힌 구간 표시용 */
  code: { line: number; text: string; gap?: boolean }[]
  callers: { label: string; snippet: string }
  turns: TurnScript[]
}

export type AnsweredTurn = {
  question: string
  ref: string
  answer: string
  hintUsed: 0 | 1 | 2
}

export type SessionPhase =
  | 'INTRO'
  | 'IN_PROBLEM'
  | 'WAITING_NEXT' // 제출 후 서버 응답을 기다리는 중 — 코드패널이 흐려지고 typing indicator
  | 'TRANSITION' // 문제 종료(stop) 또는 다음 문제 예고(next) — 센터 메시지
  | 'ENDED' // 정상 종료 또는 70분 초과

export type TransitionReason = 'STOP' | 'NEXT'
export type EndReason = 'COMPLETED' | 'TIMEOUT'

export type SessionState = {
  mode: SessionMode
  phase: SessionPhase
  problemIndex: number
  problems: ProblemScript[]
  /** 지금 문제 안에서 이미 답한 턴들 */
  answeredTurns: AnsweredTurn[]
  /** 지금 턴의 진행 상황 — 힌트 사용 횟수·현재 재진술 텍스트 */
  currentHintUsed: 0 | 1 | 2
  transitionReason: TransitionReason | null
  endReason: EndReason | null
  sessionStartedAt: number
  callersExpanded: boolean
}

export type SubmitAnswerResult = { outcome: TurnOutcome }
