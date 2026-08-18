import { useCallback, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { isApiError } from '@/api/_contract'
import { assessmentKeys } from '@/api/assessment/assessmentKeys'
import {
  useFindCurrentSession,
  useFindSessionProblem,
  useGetMyAssessmentRounds,
} from '@/api/assessment/useAssessmentQueries'
import {
  useOpenSessionHint,
  useRecordSessionActivity,
  useStartSession,
  useSubmitSessionAnswer,
} from '@/api/assessment/useAssessmentMutations'
import type {
  AnswerResult,
  CurrentQuestion,
  Highlight,
  OpenedHint,
  ProblemView,
  ServerProblem,
  ServerSession,
  SessionInfo,
  SessionStatus,
  Turn,
} from './types'

/*
  세션 도메인 훅 — **생성 훅을 감싸 화면 어휘로 옮긴다.**

  ## 읽기 둘이 화면 전체를 채우고, 쓰기 셋이 그것을 움직인다

    GET  /current              세션이 있나 · 어느 상태인가 · 어디에 서 있나
    GET  /problems/{no}        코드 패널 + 지금까지의 문답 + 지금 질문
    POST /start                시작(인트로 동의)
    POST /answers              채점 → **다음 자리를 서버가 정한다**
    POST /hints                학생이 직접 여는 힌트

  **새로고침 복원이 읽기 둘로 끝난다.** 진행 중이면 `currentProblemNo`가 오고, 그 번호로
  문제를 조회하면 `turns[]`(끝난 질문)와 `current`(지금 질문)가 함께 온다. 이미 연
  힌트(`shownHints`)까지 복원되므로 별도 복구 경로가 없다.

  ## 판정을 여기서 하지 않는다

  "다음이 어디인가"는 답변 응답의 `outcome`이 정하고, "시간이 지났나"는 서버가 409로
  말한다. 화면이 다시 계산하면 같은 규칙이 두 곳에 생긴다.

  ## 쓰기 뒤에 화면 상태를 손으로 만들지 않는다

  생성 훅이 성공 시 이 도메인 조회를 통째로 무효화하므로 `GET /problems/{no}`가 다시
  읽힌다. 즉 **답변 뒤 화면은 서버가 다시 말해 준 것**이고, 응답의 `next`·`hint`로
  같은 상태를 화면에서 또 조립하면 두 벌이 생겨 갈린다.
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
  /**
   * **커서를 다시 물어본다.** 서버가 상한을 넘긴 문제를 닫고 커서를 옮기면 화면이 들고
   * 있던 번호는 낡은 값이 된다 — 그 번호로 조회하면 `PROBLEM_ALREADY_CLOSED`다.
   * 세션이 끝났으면 `null`이 온다.
   */
  const reload = useCallback(async (): Promise<SessionInfo | null> => {
    const r = await query.refetch()
    return r.data ? toSession(r.data) : null
  }, [query])
  return {
    ...query,
    data,
    reload,
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

/**
 * 세션이 끝난 것을 **홈에도 알린다.**
 *
 * 쓰기(답변·힌트)는 생성 훅이 알아서 조회를 무효화하지만, **시간이 지나 끝나는 종료는
 * 아무 요청도 아니라서** 무효화가 일어나지 않는다. 그러면 캐시가 살아 있는 동안
 * (`staleTime` 30초) 홈이 `이해도 확인을 시작할 차례예요`를 그대로 그리고, 학생이
 * 그 버튼을 누르면 세션이 없다는 화면으로 떨어진다 — 실제로 보고된 증상이다.
 */
export function useMarkSessionEnded() {
  const queryClient = useQueryClient()
  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: assessmentKeys.all })
  }, [queryClient])
}

/**
 * 세션 시작 — 인트로의 `전체화면으로 시작하기`.
 *
 * 🔴 **되돌릴 수 없다.** 여기서부터 60분 시계가 돌고 그 계정은 시작 전으로 안 돌아간다.
 *
 * 두 번 눌러도 안전하다 — 이미 진행 중이면 서버가 그 상태를 그대로 돌려준다(스펙 명시).
 */
export function useStart(sessionId: string | null) {
  const m = useStartSession()
  /** 시작된 세션을 돌려준다 — **어느 문제부터인지도 서버가 말한다**(`currentProblemNo`) */
  const start = useCallback(async (): Promise<SessionInfo | null> => {
    if (!sessionId) return null
    return toSession(await m.mutateAsync({ path: { sessionId } }))
  }, [m, sessionId])
  return { start, isPending: m.isPending, error: m.error }
}

/**
 * 답변 제출 — **결과가 다음 화면을 정한다.**
 *
 * `outcome` 5종과 `nextProblemNo`만 돌려준다. 나머지(`next`·`hint`)는 무효화된 조회가
 * 다시 읽어 오므로 화면이 쓰지 않는다 — 같은 것을 두 경로로 만들면 갈린다.
 */
export function useSubmitAnswer(sessionId: string | null) {
  const m = useSubmitSessionAnswer()
  const submit = useCallback(
    async (answerText: string): Promise<AnswerResult | null> => {
      if (!sessionId) return null
      const r = await m.mutateAsync({ path: { sessionId }, body: { answerText } })
      return {
        outcome: r.outcome,
        nextProblemNo: r.nextProblemNo ?? null,
        // 자동으로 열린 힌트가 있었는지만 남긴다 — 문구는 다시 읽은 `shownHints`에 있다
        hintOpened: r.hint != null,
      }
    },
    [m, sessionId],
  )
  return { submit, isPending: m.isPending, error: m.error }
}

/**
 * 학생이 `다시 설명해 주세요`를 눌러 여는 힌트.
 *
 * ⚠️ **답변 응답에 `hint`가 실려 왔으면 부르지 않는다** — 이미 소진된 것이라 또 부르면
 * 두 개째가 열린다(스펙 경고). 그 판단은 호출부가 한다.
 *
 * `HINT_EXHAUSTED`·`HINT_NOT_AVAILABLE`은 **오류로 올리지 않고 `null`로 접는다.**
 * 남은 게 없어 못 여는 것은 사고가 아니라 정상적인 끝이고, 화면은 버튼을 문구로 바꾼다.
 */
const HINT_UNAVAILABLE = ['HINT_EXHAUSTED', 'HINT_NOT_AVAILABLE']

export function useOpenHint(sessionId: string | null) {
  const m = useOpenSessionHint()
  const open = useCallback(async (): Promise<OpenedHint | null> => {
    if (!sessionId) return null
    try {
      const r = await m.mutateAsync({ path: { sessionId } })
      return { hintText: r.hintText, hintsUsed: r.hintsUsed, hintsLeft: r.hintsLeft }
    } catch (e) {
      if (isApiError(e) && HINT_UNAVAILABLE.includes(e.code)) return null
      throw e
    }
  }, [m, sessionId])
  return { open, isPending: m.isPending }
}

/**
 * 관찰 신호 기록 — 창 이탈·연결 끊김·첫 타이핑 지연.
 *
 * **AI를 부르지 않고 진행 상태도 안 바꾼다. 오직 기록이다**(`204`). 이 경로가 없으면
 * 무효 응시 판정과 매니저 브리프의 "어느 답변이 의심스러운가"가 빈 값으로 남는다.
 *
 * ## 실패를 조용히 삼킨다 — 유일하게 그래도 되는 자리다
 *
 * 이건 학생이 요청한 일이 아니라 화면이 뒤에서 남기는 기록이다. 실패했다고 응시 중인
 * 학생에게 알릴 것이 없고, 알려도 할 수 있는 일이 없다. 특히 `409`(끝난 세션)는
 * **정상이다** — 스펙이 *"끝난 세션의 신호는 버린다, 화면은 409를 무시하면 된다"* 고
 * 못박았다.
 *
 * ## 재전송하지 않는다
 *
 * ⚠️ `awaySeconds`·`disconnectedSeconds`는 **보낼 때마다 횟수가 1 올라간다.** 실패했다고
 * 다시 보내면 한 번 나간 것이 두 번으로 기록되어 무효 응시 판정이 틀린다. 잃는 편이 낫다.
 */
export function useSessionActivity(sessionId: string | null) {
  const m = useRecordSessionActivity()
  return useCallback(
    (body: {
      awaySeconds?: number
      disconnectedSeconds?: number
      firstKeystrokeDelayMs?: number
    }) => {
      if (!sessionId) return
      // 셋 다 비면 400이다 — 보낼 것이 없으면 아예 안 부른다
      if (Object.values(body).every((v) => v == null)) return
      m.mutate({ path: { sessionId }, body })
    },
    [m, sessionId],
  )
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
