import { useMemo } from 'react'
import { useFindManagerHeatmap } from '@/api/analytics/useAnalyticsQueries'
import { useFindTraineeRoster } from '@/api/member/useMemberQueries'
import type { findManagerHeatmap_Response } from '@/api/analytics/analyticsTypes'
import { listQueryOptions } from '@/lib/listQuery'
import type { AttemptView, HeatmapLevel, HeatmapRow, HeatmapView, RoundOption } from './types'

/*
  MG-02 히트맵 도메인 훅 — **생성 훅을 감싸 화면 어휘로 옮긴다.**

  판정은 서버가 한다 — 평균값·집단 미달(`groupShortfall`)·계층별 판정 집단이 계산돼서
  온다. 목이 갖고 있던 평균 계산과 집단 미달 판정(`인원 절반 이상이 2단 이하`)이
  통째로 사라진다.

  **감싸는 이유는 셋이다.**

    · 회차 선택지가 **다른 조회**에 있다 — 히트맵 전용 회차 API가 없어 명부의
      `rounds[]`를 쓴다. 화면이 두 곳을 뒤지게 두지 않는다
    · 셀의 `null` 자리가 많다(합계 행엔 `rowId`가 없고, 개인 행엔 `memberCount`가 없다)
    · 계층마다 **필수 파라미터가 달라진다**(아래)

  ⚠ **`projectId`와 `assessmentRoundId`가 둘 다 필수다.** 회차 하나를 고르면 둘 다
  정해지므로 선택지에서 짝으로 들고 다닌다.
*/

type Server = findManagerHeatmap_Response

export type HeatmapQuery = {
  cohortId: string
  projectId: string
  assessmentRoundId: string
  level: HeatmapLevel
  attemptView?: AttemptView
  /** `TEAM`·`TRAINEE`에 필수 — 없으면 서버가 `HEATMAP_SCOPE_INVALID`(400)를 낸다 */
  classroomId?: string
  /** `TRAINEE`에서 팀까지 좁힐 때 */
  teamId?: string
}

/**
 * 히트맵 한 장.
 *
 * 🔴 **`sort`·`problemOnly`·`riskOnly`를 서버가 안 받는다.** 목에는 그 세 필터가
 * 있었는데 스펙에 해당 파라미터가 없다 — 정렬과 거르기를 화면이 하면 **서버가 준
 * 순서를 화면이 뒤집는 것**이고, 계층을 오갈 때마다 규칙이 갈린다.
 *
 * 지금은 그 세 컨트롤을 **그리지 않는다**(integration-process §7 — 할 수 없는 것을
 * 권하지 않는다). 필요하면 요청서로 올린다.
 *
 * **계층이 바뀌면 이전 결과를 유지하지 않는다** — 반 격자와 개인 격자는 행의 뜻이
 * 달라서, 옛 값을 그리면 「다른 것을 그것처럼」 보여주게 된다(`lib/listQuery` 주석의
 * 상세 규칙과 같다). 그래서 `listQueryOptions`를 계층에는 안 건다.
 */
export function useHeatmap(params: HeatmapQuery | undefined) {
  const query = useFindManagerHeatmap(
    {
      path: { cohortId: params?.cohortId ?? '' },
      /*
        세 값이 **필수**라 타입이 `undefined`를 안 받는다. 조회가 꺼져 있을 때
        (`enabled: false`) 쓰이지 않을 자리라 빈 값으로 채운다 — 나가지 않는다.
      */
      query: {
        projectId: params?.projectId ?? '',
        assessmentRoundId: params?.assessmentRoundId ?? '',
        level: params?.level ?? 'CLASS',
        attemptView: params?.attemptView,
        classroomId: params?.classroomId,
        teamId: params?.teamId,
      },
    },
    { enabled: !!params, ...listQueryOptions },
  )
  const data = useMemo(() => (query.data ? toView(query.data) : undefined), [query.data])
  return { ...query, data }
}

/**
 * 회차 선택지 — **히트맵 전용 조회가 없어 명부 응답을 빌린다.**
 *
 * `size=1`로 부른다: 필요한 것은 `rounds[]`뿐이고 교육생 목록은 안 쓴다.
 * 명부 화면과 쿼리 키가 달라 캐시는 공유되지 않지만, 같은 키를 쓰면 이 화면이
 * 명부의 필터 조건에 묶인다.
 *
 * ⚠ 명부 조회는 실측 7초다(32차 R9) — 회차 드롭다운이 늦게 차는 원인이 여기 있다.
 */
export function useHeatmapRounds(cohortId: string | undefined) {
  const query = useFindTraineeRoster(
    { path: { cohortId: cohortId ?? '' }, query: { page: 0, size: 1 } },
    { enabled: !!cohortId },
  )
  const data = useMemo<RoundOption[] | undefined>(
    () =>
      query.data?.rounds?.map((r) => ({
        assessmentRoundId: r.assessmentRoundId,
        projectId: r.projectId,
        /* `미니프로젝트 6차`에 차수가 이미 있다 — 붙이면 `… 6차 · 6차`가 된다 */
        label: r.projectName,
      })),
    [query.data],
  )
  return { ...query, data }
}

function toView(res: Server): HeatmapView {
  return {
    level: res.level as HeatmapLevel,
    attemptView: res.attemptView as AttemptView,
    scope: res.scope
      ? {
          classroomId: res.scope.classroomId,
          classroomName: res.scope.classroomName,
          teamId: res.scope.teamId ?? null,
          teamName: res.scope.teamName ?? null,
        }
      : null,
    concepts: (res.concepts ?? []).map((c) => ({
      problemNo: c.problemNo,
      teachesId: c.teachesId,
      conceptName: c.conceptName,
      groupShortfall: c.groupShortfall,
    })),
    summary: res.summary ? toRow(res.summary) : null,
    rows: (res.rows ?? []).map(toRow),
    navigation: {
      classrooms: (res.navigation?.classrooms ?? []).map((c) => ({
        classroomId: c.classroomId,
        classroomName: c.classroomName,
        memberCount: c.memberCount,
      })),
      teams: (res.navigation?.teams ?? []).map((t) => ({
        teamId: t.teamId,
        teamName: t.teamName,
        memberCount: t.memberCount,
      })),
    },
    asOfAt: res.asOfAt ?? null,
  }
}

function toRow(r: NonNullable<Server['rows']>[number]): HeatmapRow {
  return {
    rowId: r.rowId ?? null,
    rowName: r.rowName ?? null,
    memberCount: r.memberCount ?? null,
    cells: (r.cells ?? []).map((c) => ({
      problemNo: c.problemNo,
      value: c.value,
      status: c.status,
      validCount: c.validCount,
      notAttendedCount: c.notAttendedCount,
      invalidCount: c.invalidCount,
      interruptedCount: c.interruptedCount,
      groupShortfall: c.groupShortfall ?? false,
    })),
  }
}
