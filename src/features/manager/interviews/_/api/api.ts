import { useMemo } from 'react'
import {
  useFindInterviewBrief,
  useFindInterviewRoundOptions,
  useFindInterviews,
} from '@/api/intervention/useInterventionQueries'
import {
  useCreateInterviewBrief,
  useExcludeInterviewCase,
  useReincludeInterviewCase,
  useSaveInterviewBrief,
} from '@/api/intervention/useInterventionMutations'
import type {
  findInterviewBrief_Response,
  findInterviews_Response,
} from '@/api/intervention/interventionTypes'
import { listQueryOptions } from '@/lib/listQuery'
import type { Brief, InterviewCase, InterviewListView, RoundOption } from './types'

/*
  MG-03·04 면담 도메인 훅 — **생성 훅을 감싸 화면 어휘로 옮긴다.**

  판정은 전부 서버가 한다 — 위험 유형·판정 근거 문장·정렬(스펙: *"정렬은 서버가 정하며
  클라이언트가 바꿀 수 없다"*)·상태별 개수가 계산돼서 온다. 목이 갖고 있던 `sortCases`·
  `riskRank`는 통째로 사라진다.

  **감싸는 이유는 셋이다.**

    · 회차 선택지가 **다른 조회**(`/interviews/rounds`)에 있다 — 화면이 두 곳을 뒤지게
      두지 않는다
    · `briefState`에 따라 **부를 오퍼레이션이 달라진다**(아래 `useBrief`)
    · 브리프가 `FAILED`면 `openingRemark`가 `null`로 오는데 스펙은 `required`라 —
      타입이 거짓말한다. 그 방어를 화면이 아니라 여기서 한 번 한다(30차 R2③)
*/

type ListServer = findInterviews_Response
type BriefServer = findInterviewBrief_Response

/** 회차 선택지 — 목록과 별개 조회다 */
export function useInterviewRounds() {
  const query = useFindInterviewRoundOptions()
  const data = useMemo<RoundOption[] | undefined>(
    () =>
      query.data?.map((r) => ({
        assessmentRoundId: r.assessmentRoundId,
        label: r.label,
        status: r.status,
      })),
    [query.data],
  )
  return { ...query, data }
}

export type InterviewQuery = {
  assessmentRoundId: string
  search?: string
  status?: string
  riskType?: string
  classId?: string
}

/**
 * 면담 케이스 목록.
 *
 * **정렬을 보내지 않는다** — 서버가 급한 순으로 정해서 준다(무효 응시가 맨 위).
 * 목에는 `sortCases`가 있었는데 그 규칙이 이제 서버 것이다.
 */
export function useInterviewList(params: InterviewQuery | undefined) {
  const query = useFindInterviews(
    { query: params ?? { assessmentRoundId: '' } },
    { enabled: !!params, ...listQueryOptions },
  )
  const data = useMemo(() => (query.data ? toListView(query.data) : undefined), [query.data])
  return { ...query, data }
}

/**
 * 브리프 한 장 — **`briefState`가 `NONE`이면 조회하지 않는다.**
 *
 * 🔴 아직 만들어지지 않은 브리프를 `GET`하면 서버가 404를 내는데, **404는 지금
 * 무응답이라**(29차 R1 · 30차 R1) 화면이 90초를 기다렸다 실패로 떨어진다. 실측했다.
 * 스펙도 `NONE`이면 `POST`로 만들라고 적고 있으니, 그 흐름을 그대로 따른다 —
 * 우회가 아니라 **원래 계약이 그렇다.**
 */
export function useBrief(caseId: string | undefined, exists: boolean) {
  const query = useFindInterviewBrief(
    { path: { caseId: caseId ?? '' } },
    { enabled: !!caseId && exists },
  )
  const data = useMemo(() => (query.data ? toBrief(query.data) : undefined), [query.data])
  return { ...query, data }
}

/** 브리프 생성(`NONE`·`FAILED`) · 저장 · 제외 · 제외 되돌리기 — 변환이 없어 그대로 내보낸다 */
export {
  useCreateInterviewBrief,
  useSaveInterviewBrief,
  useExcludeInterviewCase,
  useReincludeInterviewCase,
}

/**
 * 🔴 **무효 확인을 아직 못 붙인다.**
 *
 * `PATCH /assessment-attempts/{attemptId}/validity`가 `사용 불가`라 훅이 아예 생성되지
 * 않았다. 목록의 `voidReviewPending`이 `true`인 행은 `[무효 확인]`을 먼저 보여야 하는데,
 * 그 버튼을 열어 두면 **누른 사람이 원인 모를 실패를 본다**(integration-process §7).
 *
 * 열리면 이 상수만 지운다.
 */
export const VOID_REVIEW_OPEN = false

function toListView(res: ListServer): InterviewListView {
  return {
    items: (res.items ?? []).map(toCase),
    total: res.total,
    counts: (res.counts ?? {}) as Record<string, number>,
    riskCounts: (res.riskCounts ?? {}) as Record<string, number>,
    classes: (res.classes ?? []).map((c) => ({ classId: c.classId, className: c.className })),
    round: res.round
      ? {
          assessmentRoundId: res.round.assessmentRoundId,
          label: res.round.label,
          status: res.round.resultStatus,
        }
      : null,
  }
}

function toCase(c: NonNullable<ListServer['items']>[number]): InterviewCase {
  return {
    caseId: c.caseId,
    traineeId: c.traineeId,
    name: c.name,
    classId: c.classId,
    className: c.className,
    status: c.status as InterviewCase['status'],
    riskType: c.riskType,
    riskSummary: c.riskSummary,
    briefState: c.briefState as InterviewCase['briefState'],
    attemptId: c.attemptId,
    voidConfirmed: c.voidConfirmed,
    voidReviewPending: c.voidReviewPending,
    excludedAt: c.excludedAt ?? null,
    excludedBy: c.excludedBy ?? null,
    interviewedAt: c.interviewedAt ?? null,
    nextAction: c.nextAction,
  }
}

function toBrief(res: BriefServer): Brief {
  const state = res.briefState as Brief['briefState']
  return {
    caseId: res.caseId,
    traineeId: res.traineeId,
    name: res.name,
    className: res.className,
    riskType: res.riskType,
    riskSummary: res.riskSummary,
    isVoid: res.isVoid,
    firstInterview: res.firstInterview,
    briefState: state,
    /*
      `FAILED`면 `null`이 온다 — 생성이 실패한 브리프라 값이 없는 것이 자연스럽다.
      30차 R2③으로 `nullable` 표기가 붙어 이제 타입도 그렇게 말한다(`required`에는
      그대로 남는다 — record라 값이 null이어도 **키는 나간다**).
      화면은 `briefState`로 먼저 가르고, 여기서는 그 뒤의 안전망만 둔다.
    */
    openingRemark: res.openingRemark ?? '',
    items: (res.items ?? []).map((i) => ({
      itemId: i.itemId,
      questionText: i.questionText,
      questionRationale: i.questionRationale,
      suggestedOrder: i.suggestedOrder,
    })),
    priorInterview: res.priorInterview
      ? {
          /* 목록은 `interviewedAt`, 브리프는 `completedAt` — 같은 값을 다르게 부른다 */
          interviewedAt: res.priorInterview.completedAt ?? null,
          nextAction: res.priorInterview.nextAction ?? null,
        }
      : null,
    savedRecord: res.savedRecord
      ? {
          causes: res.savedRecord.causes ?? [],
          why: res.savedRecord.why ?? null,
          nextAction: res.savedRecord.nextAction ?? null,
        }
      : null,
    concepts: (res.concepts ?? []).map((c) => ({
      name: c.name,
      curriculumRef: c.curriculumRef,
      groupIssueClassLabel: c.groupIssueClassLabel,
    })),
    voidEvidence: (res.voidEvidence ?? null) as Brief['voidEvidence'],
  }
}
