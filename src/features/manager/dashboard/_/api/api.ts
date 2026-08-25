import { useMemo } from 'react'
import { useGetRiskSignalsForInbox } from '@/api/analytics/useAnalyticsQueries'
import { useFindInterviews } from '@/api/intervention/useInterventionQueries'
import { useFindTraineeRoster } from '@/api/member/useMemberQueries'
import {
  useFindProjectClassProgress,
  useFindProjectsForManager,
} from '@/api/projectExecution/useProjectExecutionQueries'
import { isApiError } from '@/api/_contract/errors'
import { listQueryOptions } from '@/lib/listQuery'
import { useManagedClassrooms } from '@/stores/cohortScope'
import type { InboxItem, InboxView, ProjectOption, RunSummary } from './types'

/*
  MG-01 인박스 어댑터 — 조회 **넷**을 한 목록으로 접는다.

  ```
  ① GET /projects?cohort=            프로젝트 select + 미제출·분석실패 경보
  ② GET /projects/{id}/class-progress 진행 줄 + 분석 실패 팀 이름 + 이 프로젝트의 회차
  ③ GET /trainees?assessmentRoundId=  미응시 · 응시 중단
  ④ GET /interviews?assessmentRoundId= 면담 대기
  ```

  🔴 **인박스 전용 조회(`GET /cohorts/{id}/notifications/inbox`)를 안 쓴다.**
  스펙은 `available`이라고 적어 뒀는데 **모든 정상 호출이 409
  `DATA_INTEGRITY_VIOLATION`**이다(Lambda·App Runner 두 호스트 동일, 36차 R1).
  `size=0`·`size=101`은 400으로 갈리니 검증은 통과하고, 결과가 반드시 빈
  `since=2099`도 409라 데이터 양 문제도 아니다 — 쿼리가 터진다. 살아나면
  이 파일이 네 조회 대신 그것 하나를 부르는 교체가 된다.

  ⚠ **회차 축을 ②가 정한다.** `class-progress`가 그 프로젝트의
  `assessmentRoundId`를 주므로 ③·④가 그 값을 물려 쓴다 — 회차 목록을 따로
  부르지 않는다(콜 하나가 줄고, 무엇보다 **화면 안에서 회차가 갈릴 일이 없다**).

  ⚠ **면담이 이 회차 것만 온다.** 실데이터는 2~6차에 걸쳐 25건이 대기 중인데
  이 화면은 진행 중 회차 것만 그린다. 전 회차를 훑으려면 회차 수만큼 훅을
  반복 호출해야 해서(훅 규칙 위반) 못 한다 — 합본 조회를 36차 R5로 올렸다.
*/

/** 목록 조회 — 프로젝트를 바꿔도 표가 안 비게 옛 값을 들고 있는다 */
const opts = listQueryOptions

export function useInbox(cohortId: string | undefined, picked: string | undefined) {
  const projects = useFindProjectsForManager(
    { query: { cohort: cohortId } },
    { enabled: !!cohortId, ...opts },
  )

  const options = useMemo<ProjectOption[]>(
    () =>
      (projects.data?.projects ?? []).map((p) => ({
        projectId: p.projectId,
        name: p.name,
        status: p.status,
      })),
    [projects.data],
  )

  /*
    고르지 않았으면 **진행 중인 것**이 기본이다. 없으면 `null`로 둔다 —
    아무거나 첫 줄을 고르면 종료된 회차의 미제출을 「오늘 할 일」로 올린다.

    🔴 **주소의 값이 목록에 없으면 버린다**(규칙 J의 경고 · 하드닝에서 잡았다).
    남이 보낸 링크의 프로젝트가 지워졌거나 담당이 바뀌었을 수 있다. 안 버리면
    **선택기에 UUID가 그대로 뜨고**(`00000000-…`) 조회가 영원히 안 끝난다 —
    없는 id의 `class-progress`가 무응답이라 화면이 그대로 멈춘다(실측).
    목록이 아직 없을 때는 판정을 미룬다(빈 목록으로 지우면 안 된다).
  */
  const known = options.length === 0 || options.some((p) => p.projectId === picked)
  const projectId =
    (known ? picked : undefined) ?? options.find((p) => p.status === 'RUNNING')?.projectId ?? null

  /*
    🔴 **여기만 `listQueryOptions`를 안 쓴다**(렌더에서 잡았다). 옛 값을 들고
    있으면 `PLANNED` 프로젝트로 바꿨을 때 **직전 프로젝트의 제출·응시 숫자를
    그 프로젝트 것처럼** 계속 그린다 — 실제로 「11」을 골랐는데 14초 뒤에도
    미프 6차의 `제출 21/26`이 붙어 있었다. 프로젝트마다 대상이 다른 값이라
    옛 값은 위로가 아니라 거짓말이다.
  */
  const progress = useFindProjectClassProgress(
    { path: { projectId: projectId ?? '' } },
    { enabled: !!projectId },
  )

  /*
    🔴 **`PLANNED` 프로젝트는 404다**(`PROJECT_ROUND_NOT_CREATED` · 0.8초). 아직
    회차가 안 만들어진 것이라 실패가 아니라 **「아직」**이고, 화면 전체를 빨간
    에러로 떨어뜨리면 안 된다(규칙 I · `async-states` 「없는 것 3종」의 유형 1).
    `run`을 `null`로 두면 화면이 이미 가진 「아직 시작 전」 빈 상태로 간다.
    그 외 상태(500 등)는 진짜 실패다.
  */
  const roundMissing =
    progress.isError && isApiError(progress.error) && progress.error.status === 404

  const roundId = progress.data?.assessmentRoundId

  const roster = useFindTraineeRoster(
    { path: { cohortId: cohortId ?? '' }, query: { assessmentRoundId: roundId, size: 100 } },
    { enabled: !!cohortId && !!roundId, ...opts },
  )

  /* 33차 — `cohort`가 필수다. 빈 값은 `enabled`가 막아 나가지 않는다 */
  const interviews = useFindInterviews(
    { query: { cohort: cohortId ?? '', assessmentRoundId: roundId } },
    { enabled: !!cohortId && !!roundId, ...opts },
  )

  const signals = useGetRiskSignalsForInbox(
    { path: { cohortId: cohortId ?? '' } },
    { enabled: !!cohortId },
  )

  /*
    🔴 **무효 응시 행에만 반이 안 붙었다**(렌더에서 잡았다 — 다른 행은 `C반`이
    붙는데 이 행만 이름만 있었다). signals가 `classroomId`만 주고 `className`을
    안 주기 때문인데, **담당 반 목록은 이미 받아 두고 있다**(`cohortScope`가
    기수를 정하는 순간 미리 받는다) — 요청서로 넘길 일이 아니라 여기서 잇는다
    (판정 ① 「우리 코드로 되나」). 캐시를 쓰므로 콜이 늘지 않는다.
  */
  const classrooms = useManagedClassrooms(cohortId)
  const classNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of classrooms.data?.classrooms ?? []) m.set(c.classroomId, c.name)
    return m
  }, [classrooms.data])

  /*
    ⚠ **진행 줄이 아직 안 온 것과 회차가 없는 것을 가른다.** 옛 값을 안 들고
    있으므로 프로젝트를 바꾼 직후 `progress.data`가 잠깐 빈다 — 그때 `run`을
    `null`로 넘기면 **「진행 중인 프로젝트가 없습니다」가 스친다**(있는데 없다고
    말한다). 값도 없고 404도 아니면 아직 오는 중이다(규칙 E).

    🔴 **이때 뷰를 통째로 `undefined`로 만들면 안 된다**(렌더에서 잡았다).
    그러면 화면이 스켈레톤으로 떨어지면서 **프로젝트 select까지 사라진다** —
    고른 프로젝트가 느리면 **되돌아갈 길이 없어진다.** 뷰는 그대로 두고 이 깃발만
    넘긴다(한때 이 조회가 18초 매달렸는데 그건 Lambda 쪽이었다 · 38차 §6).
  */
  const runPending = !!projectId && !progress.data && !progress.isError

  /** 셋 중 하나라도 값도 실패도 없으면 아직 오는 중이다(규칙 E — `isPending` 아님) */
  const waiting = (q: { data: unknown; isError: boolean }) => !q.data && !q.isError
  const itemsPending = !!roundId && (waiting(roster) || waiting(interviews) || waiting(signals))

  const data = useMemo<InboxView | undefined>(() => {
    if (!projects.data) return undefined
    return {
      run: progress.data && !roundMissing ? toRun(progress.data) : null,
      runPending,
      itemsPending,
      /*
        행 조회 셋은 **밴드마다 독립이다** — 하나가 죽어도 나머지는 그린다
        (`async-states` §3-5). 축 조회(`projects`·`class-progress`)만 전체 실패다.
      */
      failedBands: {
        ...(roster.isError ? { 1: roster.error } : {}),
        ...(signals.isError ? { 2: signals.error } : {}),
        ...(interviews.isError ? { 3: interviews.error } : {}),
      },
      items: [
        /*
          🔴 **회차가 없으면 회차 축 행을 아예 안 싣는다.** 앞 세 조회는 회차로
          좁히는 것들인데 `keepPreviousData` 때문에 **직전 회차 값을 들고 있다** —
          그대로 두면 「진행 중인 프로젝트가 없습니다」 아래 머리에는 「2건」이
          찍힌다(렌더에서 잡았다). 다른 회차 것을 이 회차 것처럼 세는 셈이다.
          뒤 둘은 프로젝트 축이라 회차가 없어도 그 프로젝트 것이 맞다.
        */
        ...(roundId
          ? [
              ...attendanceItems(roster.data),
              ...invalidItems(signals.data, roundId, classNameById),
              ...interviewItems(interviews.data),
            ]
          : []),
        ...unsubmittedItems(projects.data, projectId),
        ...analysisFailedItems(progress.data),
      ],
      projects: options,
      projectId,
    }
  }, [
    projects.data,
    progress.data,
    roundMissing,
    runPending,
    itemsPending,
    roster.data,
    signals.data,
    interviews.data,
    options,
    projectId,
    roundId,
    classNameById,
    roster.isError,
    roster.error,
    signals.isError,
    signals.error,
    interviews.isError,
    interviews.error,
  ])

  return {
    data,
    /*
      **축이 죽어야 전체 실패다.** 프로젝트 목록이 없으면 고를 수 없고,
      진행 줄이 없으면 회차를 몰라 행 조회가 아예 안 돈다. 행 조회 셋은
      `failedBands`로 밴드 자리에만 표시한다(`async-states` §3-5).
    */
    isError: projects.isError || (progress.isError && !roundMissing),
    error: projects.error ?? progress.error,
    /*
      진행 줄은 옛 값을 안 들고 있으므로 `progress`는 여기 안 센다.

      ⚠ **회차가 없으면 뒤의 둘은 아예 안 도는데** `keepPreviousData` 때문에
      `isPlaceholderData`가 참으로 남는다 — 그대로 쓰면 「진행 중인 프로젝트가
      없습니다」 옆에 **「할 일을 불러오는 중」이 같이 뜬다**(렌더에서 잡았다).
      멈춰 있는 것을 도는 중이라고 말하지 않는다.
    */
    isStale:
      projects.isPlaceholderData ||
      (!!roundId && (roster.isPlaceholderData || interviews.isPlaceholderData)),
    refetch: () => {
      void projects.refetch()
      void progress.refetch()
      void roster.refetch()
      void interviews.refetch()
      void signals.refetch()
    },
  }
}

type Progress = NonNullable<ReturnType<typeof useFindProjectClassProgress>['data']>
type Roster = NonNullable<ReturnType<typeof useFindTraineeRoster>['data']>
type Signals = NonNullable<ReturnType<typeof useGetRiskSignalsForInbox>['data']>
type Interviews = NonNullable<ReturnType<typeof useFindInterviews>['data']>
type Projects = NonNullable<ReturnType<typeof useFindProjectsForManager>['data']>

function toRun(p: Progress): RunSummary {
  const s = p.summary
  return {
    projectName: p.projectName,
    roundName: p.roundName,
    roundNo: p.roundNo,
    totalRoundCount: p.totalRoundCount,
    submitted: s.submittedCount,
    submittedTotal: s.targetTraineeCount,
    /*
      응시율의 분모는 **대상 인원이 아니라 분석 성공 인원**이다(스펙 — 단계별
      깔때기라 각 단계의 분모가 앞 단계의 분자다). 목은 `attendedTotal`을
      제출 인원으로 뒀는데 PARTIAL이 빠져 값이 갈린다.
    */
    attended: s.assessedCount,
    attendedTotal: s.assessmentTargetCount,
    reportPublished: p.reportPublished,
    dueAt: p.submissionDueAt ?? null,
  }
}

/** 미응시·응시 중단 — 명부 1층 코드가 그대로 종류가 된다 */
function attendanceItems(r: Roster | undefined): InboxItem[] {
  return (r?.content ?? []).flatMap((t): InboxItem[] => {
    const code = t.roundPrimaryStatusCode
    if (code !== 'NOT_ATTENDED' && code !== 'SESSION_INCOMPLETE') return []
    return [
      {
        kind: code === 'NOT_ATTENDED' ? 'ABSENT' : 'SESSION_INCOMPLETE',
        band: 1,
        id: `attendance:${t.traineeId}`,
        traineeId: t.traineeId,
        name: t.name,
        className: t.className ?? null,
        terminalAt: t.roundTerminalAt ?? null,
      },
    ]
  })
}

/**
 * 무효 응시 — signals에서 고른다.
 *
 * ⚠ **`summary`가 JSON 문자열이다**(36차 R3). 못 풀면 `null`로 두고 화면이
 * 판정 문구를 안 그린다 — 파싱 실패를 「무효 아님」으로 읽히게 두지 않는다.
 *
 * ⚠ signals는 **기수 축**이라 회차를 화면이 좁힌다. 스코프 인자가 없다.
 */
function invalidItems(
  s: Signals | undefined,
  roundId: string | undefined,
  classNameById: Map<string, string>,
): InboxItem[] {
  return (s?.signals ?? [])
    .filter(
      (x) => x.reasonCode === 'INVALID_ATTEMPT' && (!roundId || x.assessmentRoundId === roundId),
    )
    .map((x) => ({
      kind: 'INVALID',
      band: 2,
      id: `signal:${x.signalId}`,
      traineeId: x.traineeId,
      name: x.traineeName,
      /* 못 찾으면 `null` — 지어내지 않는다(담당 밖 반이면 애초에 안 온다) */
      className: classNameById.get(x.classroomId) ?? null,
      classId: x.classroomId ?? null,
      assessmentRoundId: x.assessmentRoundId,
      detectedAt: x.detectedAt,
      reviewStatus: reviewStatusOf(x.summary),
    }))
}

function reviewStatusOf(summary: string | null | undefined): string | null {
  if (!summary) return null
  try {
    const parsed: unknown = JSON.parse(summary)
    const v = (parsed as Record<string, unknown>)?.validityReviewStatus
    return typeof v === 'string' ? v : null
  } catch {
    return null
  }
}

/** 면담 대기 — `PLANNED`만. 제외·완료는 할 일이 아니다 */
function interviewItems(iv: Interviews | undefined): InboxItem[] {
  return (iv?.items ?? [])
    .filter((c) => c.status === 'PLANNED')
    .map((c) => ({
      kind: 'INTERVIEW',
      band: 3,
      id: `interview:${c.caseId}`,
      caseId: c.caseId,
      traineeId: c.traineeId,
      name: c.name,
      className: c.className ?? null,
      riskSummary: c.riskSummary ?? null,
      briefState: c.briefState ?? null,
    }))
}

/**
 * 미제출 — **팀마다 한 줄**이다. 36차 R2로 `teams[{teamId, teamName}]`가 생겼다.
 *
 * ⚠ **`teams`가 비면 반 한 줄로 접는다.** 그전 모양(개수만 오는 것)이 남아 있을
 * 수 있고, 그때 팀 이름을 지어낼 수는 없다.
 */
function unsubmittedItems(p: Projects, projectId: string | null): InboxItem[] {
  const row = (p.projects ?? []).find((x) => x.projectId === projectId)
  return (row?.actionItems ?? [])
    .filter((a) => a.type === 'UNSUBMITTED_TEAMS')
    .flatMap((a): InboxItem[] => {
      const teams = a.teams ?? []
      const base = {
        kind: 'UNSUBMITTED' as const,
        band: 4 as const,
        classId: a.classId,
        className: a.className,
      }
      if (teams.length === 0)
        return [{ ...base, id: `unsubmitted:${a.classId}`, teamCount: a.teamCount, teams: [] }]
      return teams.map((t) => ({
        ...base,
        id: `unsubmitted:${t.teamId}`,
        teamCount: 1,
        teams: [{ teamId: t.teamId, teamName: t.teamName }],
      }))
    })
}

/** 분석 실패 — 이쪽은 `class-progress`가 팀 이름을 준다 */
function analysisFailedItems(p: Progress | undefined): InboxItem[] {
  return (p?.classes ?? []).flatMap((c) =>
    (c.failedTeams ?? []).map((t): InboxItem => ({
      kind: 'ANALYSIS_FAILED',
      band: 4,
      id: `failed:${t.teamId}`,
      classId: c.classId,
      className: c.className,
      teamId: t.teamId,
      teamName: t.teamName,
      representativeName: t.representativeName ?? null,
      failureReason: t.failureReason ?? null,
    })),
  )
}
