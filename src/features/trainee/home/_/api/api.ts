import { useMemo } from 'react'
import { useGetMyAssessmentRounds } from '@/api/assessment/useAssessmentQueries'
import type { getMyAssessmentRounds_Response } from '@/api/assessment/assessmentTypes'
import type { CurrentRound, HomeView, PastRound, UpcomingRound } from './types'

/*
  홈 도메인 훅 — **생성 훅을 감싸 화면 어휘로 옮긴다.**

  요청 하나로 세 구획이 다 온다(`membership` · `current` · `upcoming[]` · `past[]`).
  **판정은 전부 서버가 한다** — 대표 상태·기본 버튼·경고 배지·`canSubmit`·`canViewReport`가
  이미 계산돼서 온다(api-boundary §1-②).

  **그런데도 감싸는 이유**는 변환이 실재하기 때문이다(api-layer-decisions A1):

    · 반(`membership`)과 팀(회차 스코프)이 **다른 구획에 있어서** `A반 3팀`을 여기서 만든다
      — 서버가 나눈 이유가 있다(팀은 회차마다 바뀐다). 화면이 두 곳을 뒤지게 두지 않는다
    · 44필드 중 화면이 실제로 읽는 것만 추린다. 안 그러면 카드 컴포넌트가 응답 구조를 안다
    · `null` 자리가 많다 — 합성 카드(`NO_ACTIVE_ROUND`)에서는 식별·일정이 전부 null이라
      기본값을 한 곳에서 정한다
*/

type Server = getMyAssessmentRounds_Response

/**
 * 교육생 홈 한 장.
 *
 * **생성 훅을 그대로 쓰고 변환만 얹는다.** 키·`queryFn`·취소 신호는 생성기 소관이라
 * 여기서 다시 쓰지 않는다 — 손으로 `useQuery`를 짜면 그 값들이 두 벌이 되고, 키가
 * 한 글자만 달라도 캐시가 갈린다(api-layer-decisions D1).
 *
 * `select`를 쓰지 않은 이유: `QueryOptions<TData>`가 반환 타입을 응답 타입으로 고정해
 * 둬서 `select`로 모양을 바꿀 수 없다. 그건 화면이 `queryKey`·`queryFn`을 덮어쓰지
 * 못하게 하려고 좁힌 것이라(options.ts) 그대로 두고, 변환은 `useMemo`로 밖에서 한다.
 *
 * **폴링하지 않는다.** 진입할 때 한 번 읽고, 응시 창이 화면을 띄워 둔 채로 닫히는
 * 순간에 화면이 `refetch`를 부른다(TR-01 §6 "학생이 상태를 폴링하지 않게").
 */
export function useHome() {
  const query = useGetMyAssessmentRounds()
  const data = useMemo(() => (query.data ? toHomeView(query.data) : undefined), [query.data])
  return { ...query, data }
}

function toHomeView(res: Server): HomeView {
  const m = res.membership
  return {
    membership: { cohortName: m?.cohortName ?? null, className: m?.className ?? null },
    current: toCurrent(res, m?.className ?? null),
    upcoming: (res.upcoming ?? []).map(toUpcoming),
    past: (res.past ?? []).map(toPast),
  }
}

/*
  반 + 팀 — **두 구획에 나뉘어 있다.**

  `membership.className`은 기수 스코프, `current.teamName`은 회차 스코프다(교육생은
  회차마다 팀이 바뀌므로 서버가 그렇게 나눴다). 화면은 `A반 3팀` 한 줄로 읽으므로
  여기서 합친다 — 한쪽이 없으면 있는 쪽만, 둘 다 없으면 null이다.
*/
function joinClassTeam(className: string | null, teamName: string | null | undefined) {
  return [className, teamName].filter(Boolean).join(' ') || null
}

function toCurrent(res: Server, className: string | null): CurrentRound {
  const c = res.current
  return {
    id: c.assessmentRoundId ?? null,
    status: c.representativeStatus,
    action: c.defaultActionCode,
    warnings: c.warningCodes ?? [],
    blockedReason: c.actionUnavailableReasonCode ?? null,

    roundName: c.roundName ?? null,
    classTeam: joinClassTeam(className, c.teamName),
    curriculumNames: c.curriculumNames ?? [],

    submissionDueAt: c.submissionDueAt ?? null,
    /*
      **두 응시 창의 교집합 — 이른 쪽이 이긴다**(26차 R1로 확정).

      개인 창(`assessmentCloseAt`, 분석 완료 + 24시간)과 회차 창(`roundAssessmentDueAt`,
      운영자 일정)이 둘 다 열려 있어야 응시할 수 있다. 마감 직전에 제출하면 개인 창이
      회차 창 밖으로 나가는데, 그때 24시간을 다 못 받는 것이 의도된 규칙이다 —
      운영 일정이 절대 기준이다.

      카운트다운이 늦은 쪽을 가리키면 **화면이 말하는 마감과 서버가 막는 시점이
      달라진다.** 그래서 여기서 한 번 접어 화면은 하나만 본다.
    */
    assessmentCloseAt: earlier(c.assessmentCloseAt, c.roundAssessmentDueAt),
    submittedAt: c.submittedAt ?? null,

    problemCount: c.preparedProblemCount ?? null,

    /*
      다시 볼 개념 수를 **서버가 숫자로 주지 않는다.** `reviewStatus`(상태)와
      `completedReviewCount`(완료 건수)만 온다.

      ponytail: 지금은 "다시 보기가 배정됐고 아직 안 끝났다"를 1건으로 센다 — 카드가
      개수를 문장에 넣기 때문이다(`다시 볼 수 있는 문제가 N개`). 실제 개념 수는
      리포트를 열어야 나오므로, 정확한 수가 필요해지면 백엔드에 요청한다.
    */
    reviewPendingCount: c.representativeStatus === 'REVIEW_REQUIRED' ? 1 : 0,
    canViewReport: c.canViewReport ?? false,
    reportId: c.reportId ?? null,
  }
}

function toUpcoming(u: NonNullable<Server['upcoming']>[number]): UpcomingRound {
  return {
    id: u.assessmentRoundId,
    roundName: u.roundName,
    submissionDueAt: u.submissionDueAt,
    assessmentOpenAt: u.roundAssessmentOpenAt ?? null,
    assessmentDueAt: u.roundAssessmentDueAt ?? null,
  }
}

function toPast(p: NonNullable<Server['past']>[number]): PastRound {
  return {
    id: p.assessmentRoundId,
    roundName: p.roundName,
    status: p.representativeStatus,
    completedReviewCount: p.completedReviewCount,
    reportId: p.reportId ?? null,
    canViewReport: p.canViewReport,
  }
}

/**
 * 두 시각 중 이른 쪽. 한쪽이 없으면 있는 쪽, 둘 다 없으면 `null`.
 *
 * 응시 창 교집합(26차 R1)에 쓴다. **개인 창은 수행이 생기기 전까지 `null`이다** —
 * 그때 회차 창만 남지만, 이 값을 읽는 화면은 응시가 열렸거나 닫힌 뒤(`ASSESSMENT_AVAILABLE`·
 * 창 마감 안내)에만 그리므로 그 구간에서는 개인 창이 이미 채워져 있다.
 */
function earlier(a: string | null | undefined, b: string | null | undefined): string | null {
  if (!a) return b ?? null
  if (!b) return a
  return new Date(a) <= new Date(b) ? a : b
}
