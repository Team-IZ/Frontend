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
import { stripSeverityTag } from '@/lib/riskSummary'
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

/**
 * 회차 선택지 — 목록과 별개 조회다.
 *
 * 🔴 33차(백엔드) — `cohort`를 실어 보낸다. 안 실으면 담당 반이 속한 기수 전부의
 * 회차가 섞여 오고, 그중 마지막(가장 최근 프로젝트의 마지막 회차)이 기본으로
 * 잡혀 「보고 있는 기수와 무관한 회차」가 뽑힌다(면담 첫 진입 기본 회차 버그).
 *
 * `enabled: !!cohortId`로 기수가 오기 전에는 부르지 않는다 — 33차로 `cohort`가
 * **필수**가 되어, 게이트가 없으면 그 요청이 400이다.
 */
export function useInterviewRounds(cohortId: string | undefined) {
  const query = useFindInterviewRoundOptions(
    /* 빈 값은 `enabled`가 막아 나가지 않는다 */
    { query: { cohort: cohortId ?? '' } },
    { enabled: !!cohortId },
  )
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
  /**
   * 🔴 33차(백엔드) — 회차를 아직 못 고른 첫 진입에서 서버가 「이번 회차」를
   * **담당 기수 전체가 아니라 이 기수 안에서** 고르게 한다.
   *
   * **필수다.** 요청서 7절은 이 값을 선택으로 남긴다고 적었지만 실제 스펙은
   * `required`로 왔다. 기수를 모르는 동안에는 `useInterviewList`에 `undefined`를
   * 넘겨 조회 자체를 끈다 — 빈 값으로 부르면 400이다.
   */
  cohort: string
  /**
   * 생략하면 **서버가 이번 회차를 고른다**(32차 R2). 고른 회차는 응답의 `round`로
   * 돌아오므로 화면이 그 값을 드롭다운에 되채운다.
   */
  assessmentRoundId?: string
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
/**
 * 면담 목록.
 *
 * **회차를 생략하면 서버가 「이번 회차」를 고른다**(32차 R2) — 고른 회차는
 * `round.assessmentRoundId`로 돌아온다. 명부와 같은 판정을 쓰므로 두 화면이 같은
 * 차수를 가리킨다.
 *
 * 한때 회차 목록을 먼저 받아야 목록을 부를 수 있어 **첫 진입이 직렬 두 왕복**
 * (2.5~3.1초)이었다. 이제 첫 진입은 한 번이면 되고, 회차 드롭다운은 그와 **나란히**
 * 채워진다.
 */
export function useInterviewList(params: InterviewQuery | undefined) {
  const query = useFindInterviews(
    /* 빈 값은 `enabled`가 막아 나가지 않는다 — `cohort`가 필수라 자리만 채운다 */
    { query: params ?? { cohort: '' } },
    { enabled: !!params, ...listQueryOptions },
  )
  const data = useMemo(() => (query.data ? toListView(query.data) : undefined), [query.data])
  return { ...query, data }
}

/**
 * 브리프 한 장 — **`briefState`가 `NONE`이면 조회하지 않는다.**
 *
 * 스펙이 `NONE`이면 `POST`로 만들라고 적고 있다 — **우회가 아니라 원래 계약**이라
 * 그대로 따른다.
 *
 * ⚠ 한때 이걸 「404가 무응답이라 피해 간다」로 적어 뒀는데(29차 R1 · 30차 R1),
 * **그 무응답은 Lambda 호스트 쪽 현상이었다**(38차 §6). App Runner에서는 같은
 * 요청이 `404 INTERVIEW_BRIEF_NOT_CREATED`를 0.7초에 준다 — 그래도 이 분기는
 * 남긴다. 없는 것을 부르지 않는 것이 계약이고, 부른 뒤 404를 받아 다시 만드는
 * 것보다 왕복이 한 번 적다.
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
    riskSummary: stripSeverityTag(c.riskSummary),
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
    riskSummary: stripSeverityTag(res.riskSummary),
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
          /*
            🔴 **서버가 빈 상세 사유를 `(기록 없음)`으로 바꿔 저장한다**(실측 · 32차 R8).
            그대로 입력칸에 넣으면 매니저가 이어서 쓰려고 그 글자를 **먼저 지워야 하고**,
            안 지우고 저장하면 「안 쓴 것」이 「그렇게 쓴 것」으로 굳는다.

            스펙은 `why`가 「매니저가 타이핑한 서술」이라 이 값은 사용자 입력이 아니다 —
            빈 값으로 되돌린다. 서버가 그대로 저장하게 바뀌면 이 줄만 지운다.
          */
          why: emptyIfPlaceholder(res.savedRecord.why),
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

/** 서버가 빈 값 대신 넣는 문구 — 사용자 입력이 아니므로 입력칸에 그리지 않는다(32차 R8) */
const SERVER_EMPTY_PLACEHOLDER = '(기록 없음)'

function emptyIfPlaceholder(v: string | null | undefined): string | null {
  return !v || v.trim() === SERVER_EMPTY_PLACEHOLDER ? null : v
}
