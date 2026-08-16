import type {
  findCurrentSession_Response,
  findSessionProblem_Response,
} from '@/api/assessment/assessmentTypes'

/*
  TR-03 계약 — **서버 모양을 화면 어휘로 옮긴 것**(api-boundary §1-③).
  대조 근거는 `docs/dev/screens/tr-03-session-integration-plan.md`.

  ## 목과 크게 다른 두 가지

  **① 점수가 없다.** 목은 답변마다 `score: 0~5`를 받아 쌓았는데 서버는 점수도 통과
  여부도 주지 않는다(정의서 §7 — 학생에게 안 보여주기로 한 값이다). 대신 **힌트가
  열렸다는 사실**이 미달의 신호다. 화면이 알아야 하는 것은 *"다시 답할 자리인가
  다음으로 갈 자리인가"* 뿐이고 그건 `outcome`이 말해 준다.

  **② 진행 위치를 서버가 갖는다.** 답변 요청에 문제·질문 번호를 싣지 않는다 — 커서가
  서버에 있어서 화면이 지목하면 계단을 건너뛰는 요청이 만들어진다. 그래서 "지금 어디"는
  전부 응답에서 온다.
*/

type Session = findCurrentSession_Response
type Problem = findSessionProblem_Response

/** `FIRST`(1차) · `REVIEW`(다시 보기 — 힌트가 없고 판정에 반영되지 않는다) */
export type SessionMode = Session['mode']

/** 화면이 보는 것은 둘뿐이다 — 세션 상태 8종은 더 넓은 집합이다(스펙 표) */
export type SessionStatus = 'READY' | 'IN_PROGRESS'

/** 코드에서 강조할 구간. 질문이 바뀌면 함께 옮겨간다 */
export type Highlight = { path: string; lineStart: number; lineEnd: number }

export type SessionInfo = {
  sessionId: string
  mode: SessionMode
  status: SessionStatus
  /**
   * 지금 서 있는 문제 번호. 시작 전이면 `null`.
   *
   * **세션 API가 번호를 다시 매긴다** — 원본에 빈틈이 있어도(1번이 미생성이면 2·3만
   * 남는다) `1~problemTotal`로 준다. 받은 번호를 그대로 쓴다.
   */
  currentProblemNo: number | null
  /** 생성된 문제 수. **`3`이 아닐 수 있다** — 코드에 근거 없는 개념은 문항이 없다 */
  problemTotal: number
  startedAt: string | null
  /** 세션 상한(기본 60분). 없으면 `null` */
  timeLimitAt: string | null
  /** 다시 보기 마감. `FIRST`면 `null` */
  reviewDueAt: string | null
}

/** 코드 패널 — 문제 하나에 파일 하나 */
export type CodePane = {
  path: string
  language: string
  /** 문제를 낸 파일 전체 */
  snippet: string
  lineStart: number
  lineEnd: number
  /**
   * 호출부·관련 문맥 — **본문이 아니라 구간 참조다.** 스니펫이 따로 오지 않으므로
   * 화면은 `snippet`에서 그 줄들을 잘라 보여준다.
   *
   * `type`으로 성격이 갈린다 — `CALLER`(호출부) · `RELATED_CONTEXT`(관련 문맥) ·
   * `QUESTION_HIGHLIGHT`(질문이 가리키는 구간) 등.
   */
  references: {
    type: string
    path: string
    lineStart: number
    lineEnd: number
    /** 이 근거가 붙는 축. `QUESTION_HIGHLIGHT`에서만 채워진다 */
    axisCode: string
  }[]
}

/**
 * 답이 끝난 질문 하나.
 *
 * `hintText`는 **이 턴 직전에 보여준 힌트**다 — 첫 시도면 없다. 목은 답변과 힌트를
 * 한 배열에 시간순으로 쌓았는데, 서버는 턴마다 "직전 힌트"를 붙여 주므로 그 순서가
 * 이미 정해져 있다.
 */
export type Turn = {
  sequenceNo: number
  questionText: string
  hintText: string | null
  answerText: string
  answeredAt: string
  highlight: Highlight
}

/** 지금 답해야 하는 질문 */
export type CurrentQuestion = {
  sequenceNo: number
  questionText: string
  /** 이미 연 힌트 문구. 없으면 빈 배열 — 새로고침해도 복원된다 */
  shownHints: string[]
  /** 서버가 센다. 화면이 세지 않는다 */
  hintsUsed: number
  /** 남은 힌트. **다시 보기는 항상 0** */
  hintsLeft: number
  highlight: Highlight
  /** 이 답변이 세션의 마지막인가 — 버튼 문구가 바뀐다 */
  lastTurnOfSession: boolean
}

export type ProblemView = {
  problemNo: number
  problemTotal: number
  title: string
  code: CodePane
  /** 이 문제에서 이미 끝난 질문들 */
  turns: Turn[]
  /** 지금 질문. 문제가 닫혔으면 없다 */
  current: CurrentQuestion | null
}

/**
 * 답변 제출 결과 — **서버가 다음 자리를 정한다.**
 *
 * 목은 3종(`SAME_QUESTION`·`NEXT_QUESTION`·`NEXT_CONCEPT`)이었는데 서버는 5종이다.
 * 목이 하나로 뭉쳐 둔 "다음 개념으로"가 셋으로 갈린다 — 통과해서 넘어가는 것과
 * 못 풀고 접힌 것과 세션이 끝난 것은 화면 문구가 달라야 한다.
 */
export type AnswerOutcome =
  'RETRY_WITH_HINT' | 'NEXT_TURN' | 'NEXT_PROBLEM' | 'PROBLEM_CLOSED' | 'SESSION_ENDED'

export type AnswerResult = {
  outcome: AnswerOutcome
  /** 다음에 설 문제 번호. 세션이 끝났으면 `null` */
  nextProblemNo: number | null
  /** 다음 질문. 세션이 끝났으면 `null` */
  next: {
    sequenceNo: number
    questionText: string
    hintsUsed: number
    highlight: Highlight | null
  } | null
  /**
   * 3점 미만이라 **자동으로 열린** 힌트.
   *
   * 🔴 **이것이 오면 `POST /hints`를 부르지 않는다** — 이미 소진된 힌트라 또 부르면
   * 두 개째가 열린다(스펙 경고). 화면은 받은 것을 그리기만 한다.
   */
  hint: { hintText: string; hintsUsed: number; hintsLeft: number } | null
}

/** 학생이 [다시 설명해 주세요]를 눌러 연 힌트 */
export type OpenedHint = {
  hintText: string
  hintsUsed: number
  hintsLeft: number
}

/*
  서버가 준 문제 응답을 화면 타입으로 좁히는 자리. 스펙이 `NON_NULL` 직렬화라
  **값이 없는 필드는 키가 통째로 빠진다** — `=== null`이 아니라 `== null`로 봐야 한다.
*/
export type ServerProblem = Problem
export type ServerSession = Session
