/*
  TR-03 화면 타입 — 확정 모델은 `docs/dev/screens/tr-03-session.md`.

  ```
  세션 ─ 문제 N개(서버가 준다) ─ 질문 여러 개 ─ 질문마다 답변 여러 번
  ```

  ## 서버 값을 여기서 다시 정의하지 않는다

  문제·질문·힌트는 전부 `_/api/types.ts`의 서버 모양(`ProblemView`·`Turn`·
  `CurrentQuestion`)을 그대로 쓴다. 예전에는 이 파일이 `Concept`·`Question`을 따로
  들고 있었는데, 그건 목 스크립트의 모양이었고 **서버와 겹치는 순간 두 벌이 된다.**

  남은 것은 **화면에만 있는 것**이다 — 지금 어느 국면인가, 전환을 왜 하는가.

  ## 점수가 없다

  목은 답변마다 `0~5점`을 받아 도달 단계를 계산했다. 서버는 **점수도 통과 여부도 주지
  않는다** — 미달 신호는 `outcome`과 힌트가 열렸는지뿐이다(정의서 §7 "점수는 학생에게
  보이지 않는다"). 그래서 `Score`·`ReachedLevel`·`passed`가 통째로 사라졌다.
*/

/** 서버 이름을 따른다 — `RETRY`가 아니라 `REVIEW`다(어댑터 `_/api/types.ts`) */
export type SessionMode = 'FIRST' | 'REVIEW'

/**
 * 질문이 묻는 깊이. **질문 순번이 곧 단계다** — 질문은 L1부터 순서대로 나오므로
 * 서버의 `sequenceNo`를 그대로 쓴다.
 */
export type Level = 1 | 2 | 3 | 4

/** 질문 하나에 주어지는 힌트 — 요청·지급 합산. 화면 표시용이고 판정은 서버가 한다 */
export const MAX_HINTS = 2

export type SessionPhase =
  | 'INTRO'
  | 'IN_PROBLEM'
  | 'TRANSITION' // 문제 경계 — 센터 메시지
  | 'ENDED'

/** `STOP` = 설명이 닿지 않아 접힘 · `NEXT` = 통과하고 다음으로 */
export type TransitionReason = 'STOP' | 'NEXT'
export type EndReason = 'COMPLETED' | 'TIMEOUT'
