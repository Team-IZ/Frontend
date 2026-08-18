import { useMemo } from 'react'
import {
  useFindCurrentSession,
  useFindSessionProblem,
  useGetMyAssessmentRounds,
} from '@/api/assessment/useAssessmentQueries'
import type {
  CurrentQuestion,
  Highlight,
  ProblemView,
  ServerProblem,
  ServerSession,
  SessionInfo,
  SessionStatus,
  Turn,
} from './types'

/*
  세션 도메인 훅 — **생성 훅을 감싸 화면 어휘로 옮긴다.**

  ## 읽기 두 개가 화면 전체를 채운다

    GET /current              세션이 있나 · 어느 상태인가 · 어디에 서 있나
    GET /problems/{no}        코드 패널 + 지금까지의 문답 + 지금 질문

  **새로고침 복원이 이 둘로 끝난다.** 진행 중이면 `currentProblemNo`가 오고, 그 번호로
  문제를 조회하면 `turns[]`(끝난 질문)와 `current`(지금 질문)가 함께 온다. 이미 연
  힌트(`shownHints`)까지 복원되므로 별도 복구 경로가 없다.

  ## 판정을 여기서 하지 않는다

  "다음이 어디인가"는 답변 응답의 `outcome`이 정하고, "시간이 지났나"는 서버가 409로
  말한다. 화면이 다시 계산하면 같은 규칙이 두 곳에 생긴다.
*/

/**
 * 시작 전 안내와 진행 중 복귀를 한 번에 판정한다.
 *
 * 🔴 **이 조회는 읽기만 하지 않는다.** 상한을 넘긴 세션·문제를 그 자리에서 닫고 결과를
 * 반영해 돌려준다(스펙 명시, 실측 확인). 진입만 해도 상태가 바뀔 수 있다.
 *
 * 🔴 **`204`면 살아 있는 세션이 없다는 뜻이고 본문이 없다.** 계약 층이 그것을 `null`로
 * 바꿔 주지만(`unwrap`) 생성 타입은 `200` 기준이라 그 가능성을 모른다 — 여기서
 * `noSession`으로 세워 화면이 "로딩 중"과 헷갈리지 않게 한다.
 *
 * ⚠️ **`204`를 "응시 완료"로 읽으면 안 된다.** 사유가 여섯 가지(완료 · 방금 상한 초과 ·
 * 창 닫힘 · 분석 전 · 분석 실패 · 팀 배정 끊김)이고 본문으로는 가릴 수 없다. 화면은
 * 홈의 `representativeStatus`를 함께 봐야 한다.
 */
export function useCurrentSession() {
  const query = useFindCurrentSession()
  const data = useMemo(() => (query.data ? toSession(query.data) : undefined), [query.data])
  return {
    ...query,
    data,
    /** 조회는 끝났는데 세션이 없다(`204` → `null`). 사유는 홈 상태로 가른다 */
    noSession: query.isSuccess && query.data == null,
  }
}

/**
 * 문제 하나. `problemNo`를 모르면(시작 전) 조회하지 않는다.
 *
 * 닫힌 다이얼로그가 조회하지 않게 하는 것과 같은 이유다 — 값이 없으면 안 부른다.
 */
export function useSessionProblem(sessionId: string | null, problemNo: number | null) {
  const enabled = !!sessionId && problemNo != null
  const query = useFindSessionProblem(
    { path: { sessionId: sessionId!, problemNo: problemNo! } },
    { enabled },
  )
  const data = useMemo(() => (query.data ? toProblem(query.data) : undefined), [query.data])
  return { ...query, data }
}

/**
 * 세션이 없을 때(`204`) **그 사유**.
 *
 * 본문이 없어 세션 응답만으로는 완료·상한 초과·창 닫힘·분석 전·분석 실패를 구분할 수
 * 없다(스펙 명시). 홈의 대표 상태가 그 답을 갖고 있다.
 *
 * **홈 어댑터를 부르지 않고 생성 훅을 직접 쓴다** — 같은 쿼리 키라 요청이 늘지 않고,
 * 화면 간 import도 생기지 않는다(제출 화면이 `projectId`를 얻는 방식과 같다).
 */
export function useNoSessionReason() {
  const home = useGetMyAssessmentRounds()
  return {
    status: home.data?.current?.representativeStatus ?? null,
    /**
     * **아직 모른다.** 세션 화면에 곧장 들어오면 홈 조회가 이제 시작되므로, 이 값을
     * 안 보고 그리면 사유를 아는데도 기본 문구가 한 번 스친다.
     */
    isPending: home.isPending,
  }
}

/*
  ⚠️ **`NON_NULL` 직렬화라 값이 없는 필드는 키가 통째로 빠진다.** `=== null`로 보면
  `undefined`를 놓친다 — 시작 전에는 `startedAt`·`timeLimitAt` 키 자체가 없다.
  그래서 전부 `?? null`로 한 번 접어 화면이 한 가지만 보게 한다.
*/
function toSession(s: ServerSession): SessionInfo {
  return {
    sessionId: s.sessionId,
    mode: s.mode,
    /*
      스펙 표가 `READY`·`IN_PROGRESS` 둘만 온다고 못박았다. 그 밖의 값이 오면 시작
      전으로 접는다 — 진행 중으로 오인해 답변을 보내는 것보다 안내를 다시 보는 편이 낫다.
    */
    status: (s.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'READY') as SessionStatus,
    currentProblemNo: s.currentProblemNo ?? null,
    problemTotal: s.problemTotal,
    startedAt: s.startedAt ?? null,
    timeLimitAt: s.timeLimitAt ?? null,
    reviewDueAt: s.reviewDueAt ?? null,
  }
}

function toProblem(p: ServerProblem): ProblemView {
  return {
    problemNo: p.problemNo,
    problemTotal: p.problemTotal,
    title: p.title,
    code: {
      path: p.code.path,
      language: p.code.language,
      snippet: p.code.snippet,
      lineStart: p.code.lineStart,
      lineEnd: p.code.lineEnd,
      references: (p.code.references ?? []).map((r) => ({
        type: r.type,
        path: r.path,
        lineStart: r.lineStart,
        lineEnd: r.lineEnd,
        axisCode: r.axisCode,
      })),
    },
    turns: (p.turns ?? []).map(toTurn),
    current: p.current ? toCurrentQuestion(p.current) : null,
  }
}

function toTurn(t: NonNullable<ServerProblem['turns']>[number]): Turn {
  return {
    sequenceNo: t.sequenceNo,
    questionText: t.questionText,
    // 이 턴 직전에 보여준 힌트 — 첫 시도면 키가 빠진다
    hintText: t.hintText ?? null,
    answerText: t.answerText,
    answeredAt: t.answeredAt,
    highlight: toHighlight(t.highlight),
  }
}

function toCurrentQuestion(c: NonNullable<ServerProblem['current']>): CurrentQuestion {
  return {
    sequenceNo: c.sequenceNo,
    questionText: c.questionText,
    shownHints: c.shownHints ?? [],
    hintsUsed: c.hintsUsed,
    hintsLeft: c.hintsLeft,
    highlight: toHighlight(c.highlight),
    lastTurnOfSession: c.lastTurnOfSession,
  }
}

function toHighlight(h: { path: string; lineStart: number; lineEnd: number }): Highlight {
  return { path: h.path, lineStart: h.lineStart, lineEnd: h.lineEnd }
}
