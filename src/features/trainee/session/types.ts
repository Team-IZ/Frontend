/*
  TR-03 계약 — 확정 모델은 `docs/dev/screens/tr-03-session.md`.

  ```
  세션 ─ 개념 3개 고정 ─ 단계 4개(L1~L4) ─ 시도 최대 3회
  ```

  **한 단계 안에서 최대 세 번 답한다.** 힌트 2개가 그 사이에 낀다 —
  답변① 미달 → 힌트1 → 답변② 미달 → 힌트2 → 답변③ 미달 → 그 개념 종료.
  그래서 계약이 "턴"이 아니라 **질문 하나 + 그 안의 시도 배열**이다.

  **도달 단계 = 마지막으로 통과한 단계.** L2에서 실패하면 도달은 1단이고, L1에서
  실패하면 0단이다. 별도 보정 규칙이 아니라 이 정의에서 그냥 나온다 — 계산을
  따로 만들면 서버·리포트·매니저 화면과 갈린다.

  채점은 실제로는 AI가 한다. 목은 `api.ts`가 길이로 어림잡는다(그쪽 주석 참고).
*/

/** 서버 이름을 따른다 — `RETRY`가 아니라 `REVIEW`다(어댑터 `_/api/types.ts`) */
export type SessionMode = 'FIRST' | 'REVIEW'

/** 질문이 묻는 깊이. 질문 하나가 단계 하나다 */
export type Level = 1 | 2 | 3 | 4

/** 개념 하나의 결과. `0` = L1조차 통과 못함 */
export type ReachedLevel = 0 | Level

/** 0~5점. **3점 미만이면 실패** */
export type Score = 0 | 1 | 2 | 3 | 4 | 5

export const PASS_SCORE = 3
/** 도달 단계가 이 값 미만이면 재시험 대상 */
export const RETRY_BELOW_LEVEL = 2
/** 질문 하나에 주어지는 힌트 — 요청·지급 합산 */
export const MAX_HINTS = 2

export type Question = {
  level: Level
  text: string
  /** "MemberController.java:14, 17" — 코드 패널이 이 줄을 하이라이트한다 */
  ref: string
  /** 순서대로 하나씩 열린다. 요청이든 지급이든 같은 텍스트를 쓴다 */
  hints: [string, string]
}

export type Concept = {
  name: string
  file: string
  /** 코드 블록 — 줄번호는 실제 파일 기준, gap은 접힌 구간 표시용 */
  code: { line: number; text: string; gap?: boolean }[]
  callers: { label: string; snippet: string }
  /** L1부터 순서대로. 최대 4개 */
  questions: Question[]
}

/*
  질문 하나 아래 쌓이는 것 — **답변과 힌트가 시간 순으로 섞인다.**

  힌트가 두 경로로 오기 때문이다. 버튼으로 먼저 받으면 `힌트 → 답변`이고, 점수 미달로
  받으면 `답변 → 힌트`다. 답변 배열과 힌트 배열을 따로 두면 이 순서를 화면이 다시
  맞춰야 해서, 한 줄로 쌓는다.
*/
export type ThreadItem =
  { kind: 'answer'; text: string; score: Score } | { kind: 'hint'; text: string }

/** 답이 끝난 질문 하나 */
export type AnsweredQuestion = {
  level: Level
  text: string
  ref: string
  items: ThreadItem[]
  passed: boolean
}

export const countAnswers = (items: ThreadItem[]) => items.filter((i) => i.kind === 'answer').length
/** 요청분·지급분 **합산**이다 — 남은 개수는 `MAX_HINTS - hintsUsed` */
export const hintsUsed = (items: ThreadItem[]) => items.filter((i) => i.kind === 'hint').length

export type SessionPhase =
  | 'INTRO'
  | 'IN_PROBLEM'
  | 'WAITING_NEXT' // 채점 대기 — 코드패널이 흐려지고 typing indicator
  | 'TRANSITION' // 개념 경계 — 센터 메시지
  | 'ENDED'

/** `STOP` = 통과 못하고 접힘 · `NEXT` = 통과하고 다음으로 */
export type TransitionReason = 'STOP' | 'NEXT'
export type EndReason = 'COMPLETED' | 'TIMEOUT'

export type SessionState = {
  mode: SessionMode
  phase: SessionPhase
  conceptIndex: number
  concepts: Concept[]
  /** 지금 개념 안에서 답이 끝난 질문들 */
  answered: AnsweredQuestion[]
  /** 지금 질문의 타임라인. 답변 최대 3 · 힌트 최대 2가 섞여 쌓인다 */
  current: ThreadItem[]
  /** 개념마다 확정된 도달 단계. `concepts`와 같은 인덱스 · 아직이면 null */
  reached: (ReachedLevel | null)[]
  transitionReason: TransitionReason | null
  endReason: EndReason | null
  sessionStartedAt: number
  /** 개념이 바뀔 때마다 새로 찍힌다 — 문제당 제한시간의 기준 */
  conceptStartedAt: number
  callersExpanded: boolean
}

/**
 * 채점 결과. **`outcome`을 서버가 정한다** — "힌트를 다 썼는데도 미달"인지를
 * 화면이 세면 힌트 규칙이 두 곳에 생긴다.
 */
export type SubmitAnswerResult = {
  score: Score
  outcome: 'SAME_QUESTION' | 'NEXT_QUESTION' | 'NEXT_CONCEPT'
  /** `SAME_QUESTION`일 때만 — 이번 미달로 열린 힌트 */
  hint?: string
}
