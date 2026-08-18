import { useMemo } from 'react'
import { useFindProjectsForManager } from '@/api/projectExecution/useProjectExecutionQueries'
import { useFindClassrooms } from '@/api/academic/useAcademicQueries'
import type { findProjectsForManager_Response } from '@/api/projectExecution/projectExecutionTypes'
import { listQueryOptions } from '@/lib/listQuery'
import type { ProjectListView, ProjectRow, ProjectSort, ProjectStatus } from './listTypes'

/*
  MG-07 프로젝트 목록 도메인 훅 — **생성 훅을 감싸 화면 어휘로 옮긴다.**

  대조표는 `docs/dev/screens/mg-07-situations.md` §2에 있다. 요약하면 이렇다.

    · 목이 회차마다 들고 있던 `classes: ClassProgress[]`(반별 7지표)가 **서버에 없다.**
      회차 집계 하나(`progress`) + 조치 배열(`actionItems`)로 온다
    · 그래서 화면이 하던 합산(`progressCell`)·조립(`actionItems`)이 **통째로 서버 것**이 된다
    · 반·교안 필터가 **이름에서 UUID**로 바뀐다

  ⚠ **`cohort`와 `classId` 중 정확히 하나가 필수다**(안 주면 400
  `PROJECT_LIST_SCOPE_AMBIGUOUS`).

  🔴 **기본은 `cohort`다.** 연동할 때는 「담당 반 화면이니 `classId`」로 골랐는데,
  하드닝에서 그 선택이 **다가올 회차를 통째로 숨기는 것**을 봤다.

  ```
  cohort   8개   PLANNED 2 · RUNNING 1 · CLOSED 5
  classId  6개              RUNNING 1 · CLOSED 5     ← PLANNED 둘이 없다
  ```

  스펙이 `classId`를 **「그 반의 팀이 편성된 프로젝트만(team.class_id 경유)」**이라고
  적어 뒀고, 그 두 회차는 팀이 0개다(실측). 즉 **팀 편성 전 회차는 구조적으로 안 온다** —
  그런데 매니저가 「이번에 뭐가 오나」를 보는 화면에서 그게 빠지면 안 된다.

  겹치는 6개는 두 스코프에서 `progress`·`actionItems`까지 **값이 완전히 같다**(대조 확인).
  반 필터를 골랐을 때만 `classId`로 좁힌다.
*/

type Server = findProjectsForManager_Response
type ServerRow = NonNullable<Server['projects']>[number]

export type ProjectListQuery = {
  /** 기수 스코프 — 반 필터가 「전체」일 때 쓴다(팀 편성 전 회차까지 본다) */
  cohortId: string
  /**
   * 반 필터로 좁힐 때만 넣는다 — **여럿이면 합쳐서 본다**(서버가 배열을 받는다).
   * 비어 있으면 `cohort`로 부른다(둘 다 보내면 400).
   */
  classIds?: string[]
  search?: string
  curriculumId?: string
  status?: ProjectStatus
  sort?: ProjectSort
}

/**
 * 담당 반 회차 목록.
 *
 * **검색·필터·정렬을 전부 서버가 한다.** 목은 고정 배열을 화면에서 걸렀는데, 그 규칙이
 * 화면에 남으면 서버 정렬과 어긋난 순서를 보여주게 된다(MG-05에서 같은 판단).
 */
export function useProjectList(params: ProjectListQuery | undefined) {
  const query = useFindProjectsForManager(
    { query: toServerQuery(params) },
    { enabled: !!params?.cohortId, ...listQueryOptions },
  )
  const data = useMemo(() => (query.data ? toListView(query.data) : undefined), [query.data])
  return { ...query, data }
}

/**
 * 반 필터의 선택지 — **매니저에게는 담당 반만 온다**(서버가 좁힌다).
 * MG-05가 쓰는 것과 같은 조회라 캐시를 공유한다.
 */
export function useManagedClassrooms(cohortId: string | undefined) {
  return useFindClassrooms({ path: { cohortId: cohortId ?? '' } }, { enabled: !!cohortId })
}

function toServerQuery(p: ProjectListQuery | undefined) {
  if (!p) return undefined
  /* **둘 중 하나만 보낸다** — 둘 다 있으면 400이다 */
  const scope = p.classIds?.length ? { classId: p.classIds } : { cohort: p.cohortId }
  return {
    ...scope,
    search: p.search,
    curriculumId: p.curriculumId,
    status: p.status,
    sort: p.sort,
  }
}

function toListView(res: Server): ProjectListView {
  return {
    rows: (res.projects ?? []).map(toRow),
    /** **필터 적용 후** 개수 — 스펙이 「`projects`의 길이와 항상 같다」고 못박았다 */
    total: res.total,
    /**
     * 상태별 개수 — **필터를 안 탄다**(스펙 명시 · 실측으로도 확인했다). 상태 칩이
     * 자기 자신을 걸러 버리면 고르기 전에 분포를 볼 수 없다.
     */
    counts: (res.counts ?? {}) as Record<string, number>,
  }
}

function toRow(p: ServerRow): ProjectRow {
  return {
    id: p.projectId,
    name: p.name,
    status: p.status as ProjectStatus,
    /*
      🔴 **버전이 없다.** 목은 `spring_backend_v1.pdf v1`처럼 붙여 뒀는데 서버는 파일명만
      준다 — 같은 교안의 v1/v2가 한 기수에 섞이면 구분이 안 된다. 지금 9기는 둘 다 v1이라
      안 드러난다. 지어내지 않고 그대로 그린다(요청서 §5).
    */
    curricula: p.curriculumNames ?? [],
    /* 확정 전이면 빈 배열이다 — `null`이 아니라 길이로 가른다(MG-09 `conceptNames`와 같다) */
    concepts: p.conceptNames ?? [],
    conceptCandidateCount: p.conceptCandidateCount,
    /* ⚠ `startDate`는 **날짜만**(`2026-08-03`), `submissionDueAt`은 시각까지 온다 */
    startDate: p.startDate ?? null,
    dueAt: p.submissionDueAt ?? null,
    /*
      진행 — **화면이 다시 세지 않는다.** 목은 반별 값을 더했는데(`progressCell`) 서버가
      회차 집계를 준다. 아직 시작 안 한 회차는 `null`이라 「모른다」와 「0명」이 갈린다.
    */
    progress: p.progress
      ? {
          assessed: p.progress.assessedCount,
          target: p.progress.targetTraineeCount,
          /*
            담당 반이 **둘 이상일 때만** 채워진다(스펙 명시) — 진행률이 가장 낮은 반의
            이름과 그 반 집계를 함께 준다. 9기는 담당 반이 C반 하나라 늘 `null`이라
            **실물을 못 봤다**(미검증).
          */
          laggingClass: p.progress.laggingClass ?? null,
        }
      : null,
    /*
      조치 — 반 이름까지 실려 온다. 목은 `prefix()`로 `C반 미제출 2팀`을 만들었는데
      서버가 `className`을 주므로 그 조립만 화면에 남는다(문구는 화면 어휘다).

      🔴 **종료 회차의 「면담 N명」이 없다** — `type`이 `UNSUBMITTED_TEAMS`·
      `ANALYSIS_FAILED_TEAMS` 둘뿐이다. 지어내지 않고 그 자리를 비운다(요청서 §5).
    */
    actions: (p.actionItems ?? []).map((a) => ({
      classId: a.classId,
      className: a.className,
      type: a.type as ProjectRow['actions'][number]['type'],
      teamCount: a.teamCount,
    })),
  }
}
