/*
  대시보드 도메인 훅 — **생성 훅을 감싸 화면 어휘로 옮긴다.**

  ⚠ **한 호출이 아니라 셋이다.** 목일 때는 `GET /operator/dashboard` 하나를 가정했는데
  서버에 그런 엔드포인트가 없다(types `DashboardResponse` 주석). 셋을 **동시에** 부르고
  각각의 성패를 `Block<T>`로 갈라 담는다 — 하나가 죽어도 나머지는 그린다(F2).

  **감싸는 이유가 바로 그 합성이다**(api-layer-decisions A1). 세 응답을 블록으로 갈라
  담는 일을 화면이 하면 화면이 조회 순서와 실패 조합을 알아야 한다.

  블록별 판정·정렬·기준선은 **전부 서버가 한다**(api-boundary §1-②). 여기서 하는 일은
  **서버 모양을 화면 어휘로 옮기는 것**뿐이다.
*/
import { useQuery } from '@tanstack/react-query'
import { findCohortActionsRequired, findCohortRiskTraineeRates } from '@/api/analytics/analyticsApi'
import { findProjects, findProjectClassProgress } from '@/api/projectExecution/projectExecutionApi'
import type { findCohortRiskTraineeRates_Response } from '@/api/analytics/analyticsTypes'
import type { Block, ClassCompare, RoundPipeline, Todo } from './types'

type RiskRates = findCohortRiskTraineeRates_Response

/** 오늘 날짜(`YYYY-MM-DD`). 마감까지 남은 일수를 셀 때 쓴다 — 시계를 읽는 데 왕복이 필요 없다 */
export function getToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * 조회 결과를 블록 셋 중 하나로 옮긴다.
 *
 * **`pending`이 이 함수의 존재 이유다.** 조회가 성공해도 그릴 것이 아직 없는 경우가
 * 있는데(집계 전 기수·회차 0개), 그것을 `failed`로 떨어뜨리면 화면이 *"불러오지
 * 못했습니다"* 라고 **거짓말**을 한다(op-01-situations §2-3).
 *
 * @param empty 값이 왔지만 아직 그릴 것이 없을 때의 사유. `null`이면 정상값이다.
 */
function toBlock<T>(
  q: { isLoading: boolean; isError: boolean; error: unknown; data: T | null | undefined },
  empty?: string,
): Block<T> | undefined {
  // 아직 조회 중 — 블록을 그리지 않는다(호출부가 그 자리에 스켈레톤을 그린다)
  if (q.isLoading) return undefined
  if (q.isError) return { state: 'failed', error: q.error }
  if (q.data === undefined) return { state: 'failed', error: undefined }
  // `null`은 **조회는 됐는데 아직 그릴 것이 없다**는 뜻이다 — 실패가 아니다
  if (q.data === null) return { state: 'pending', reason: empty ?? '' }
  return { state: 'ok', value: q.data }
}

/*
  ─── 조회 셋을 **따로** 건다 ────────────────────────────────────

  전에는 `Promise.all` 하나였다. 블록마다 실패는 갈라 놨는데 **도착이 안 갈라져** 있어서,
  1.5초에 온 조치 필요가 가장 느린 조회(`/projects` 5.2초)를 기다렸다 — 화면 전체가
  8.1초 동안 스피너 하나였다(op-01-situations §2-1 실측).

  쿼리를 셋으로 나누면 셋이 각자 도착한다. **재시도도 그 블록만** 다시 나간다 —
  한 덩어리일 때는 블록 하나를 재시도하면 조회 다섯이 전부 다시 나갔다(§2-5).
*/

/** ① 반별 위험 비율 — 머리글(인원·반 수)과 반 비교가 이 응답 하나에서 나온다 */
function useRisk(cohortId: string | undefined) {
  return useQuery({
    queryKey: ['operator-dashboard', 'risk', cohortId],
    enabled: !!cohortId,
    queryFn: ({ signal }) => findCohortRiskTraineeRates({ path: { cohortId: cohortId! }, signal }),
  })
}

/** ② 이번 회차 파이프라인 — 목록을 먼저 봐야 대상 회차를 고를 수 있어 안에서 순차다 */
function usePipeline(cohortId: string | undefined) {
  return useQuery({
    queryKey: ['operator-dashboard', 'pipeline', cohortId],
    enabled: !!cohortId,
    queryFn: ({ signal }) => loadPipeline(cohortId!, signal),
  })
}

/** ③ 조치 필요 — 이 화면의 주인공이고 **가장 빨리 온다**(실측 1.5초) */
function useTodos(cohortId: string | undefined) {
  return useQuery({
    queryKey: ['operator-dashboard', 'todos', cohortId],
    enabled: !!cohortId,
    queryFn: ({ signal }) => loadTodos(cohortId!, signal),
  })
}

/**
 * 대시보드 한 장 — **블록마다 자기 조회를 갖는다.**
 *
 * 각 블록은 `undefined`(아직 조회 중) · `ok` · `pending` · `failed` 넷 중 하나다.
 * 화면은 그 넷만 보고 그린다.
 */
export function useDashboard(cohortId: string | undefined) {
  const risk = useRisk(cohortId)
  const pipeline = usePipeline(cohortId)
  const todos = useTodos(cohortId)

  /*
    머리글은 **실패해도 화면을 막지 않는다.** 스코프 한 줄 때문에 대시보드 전체를 에러로
    덮으면 정작 볼 수 있는 조치 필요까지 사라진다.

    ⚠ `traineeCount`는 이 응답의 정의(등록 인원)이고 파이프라인 분모(`targetTraineeCount`)
    · 명단 총원(`cohortTotal`)과 **값이 다르다** — 실측 196 / 208 / 224. 정의를 백엔드에
    확인하기 전까지 화면이 임의로 맞추지 않는다(op-01-situations §2-2).
  */
  const head = risk.data
    ? { trainees: risk.data.cohortSummary.traineeCount, classes: risk.data.classes.length }
    : undefined

  return {
    head,
    /*
      **반 비교가 비는 이유는 둘이고 뜻이 다르다.**
        집계된 회차가 없다 → 회차가 돌면 채워진다(`pending`)
        조회가 실패했다    → 다시 시도가 의미 있다(`failed`)
    */
    compare: toBlock<ClassCompare>(
      { ...risk, data: risk.data === undefined ? undefined : toCompare(risk.data) },
      '아직 집계된 회차가 없습니다 — 회차가 끝나고 집계되면 반별 위험 비율이 여기에 쌓입니다',
    ),
    pipeline: toBlock<RoundPipeline>(
      pipeline,
      '아직 회차가 없습니다 — 프로젝트를 만들면 이번 회차 진행이 여기에 보입니다',
    ),
    todos: toBlock<Todo[]>(todos),
    /** 블록마다 자기 것만 다시 부른다 — 전에는 하나를 누르면 다섯이 다시 나갔다 */
    retry: {
      compare: () => void risk.refetch(),
      pipeline: () => void pipeline.refetch(),
      todos: () => void todos.refetch(),
    },
    /** 재시도 버튼이 자기 대기를 보여준다(async-states §3-3) */
    fetching: {
      compare: risk.isFetching,
      pipeline: pipeline.isFetching,
      todos: todos.isFetching,
    },
  }
}

/*
  ─── ① 이번 회차 파이프라인 ─────────────────────────────────────
*/

/**
 * 지금 굴러가는 회차의 진행.
 *
 * **회차를 먼저 고른다** — 진행 중(`RUNNING`)이 있으면 그것, 없으면 **가장 이른 예정**
 * 회차다(다음에 열릴 것이 지금 준비할 대상이다). 종료만 남았으면 마지막 회차를 쓴다.
 */
async function loadPipeline(cohortId: string, signal: AbortSignal): Promise<RoundPipeline | null> {
  const list = await findProjects({ path: { cohortId }, signal })
  const projects = list.projects
  /*
    **회차가 0개면 실패가 아니다.** 전에는 `throw`라 *"이번 회차 진행 상황을 불러오지
    못했습니다 + 다시 시도"* 가 떴는데, 조회는 200이고 만들면 채워진다 — `null`을
    돌려주면 호출부가 「없는 것」 유형 1(`pending`)로 그린다(op-01-situations §2-3).
  */
  if (projects.length === 0) return null

  const running = projects.find((p) => p.status === 'RUNNING')
  const planned = projects
    .filter((p) => p.status === 'PLANNED')
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0]
  const target = running ?? planned ?? projects[projects.length - 1]

  const r = await findProjectClassProgress({ path: { projectId: target.projectId }, signal })

  /*
    **분석 실패는 팀 수다**(제출이 팀 단위이므로 — OP-01 §4). 서버는 인원
    (`analysisFailedCount`)과 팀 배열(`failedTeams`)을 둘 다 주는데, 목이 세던 것과
    같은 값은 팀 배열 쪽이다.
  */
  const analysisFailedTeams = r.classes.reduce((n, c) => n + c.failedTeams.length, 0)

  return {
    projectId: target.projectId,
    // 회차 라벨은 **운영자가 붙인 이름**이다 — 화면이 `미프 N차`로 만들지 않는다
    roundLabel: target.name,
    /*
     **기수 안 순번**이다. `class-progress`의 `roundNo`·`totalRoundCount`는 프로젝트
     **안의** 응시 회차라 지금은 전부 `1 / 1`이다 — 화면이 묻는 `3차 / 6회`가 아니다.
     */
    roundNo: target.sequenceNo,
    roundTotal: projects.length,
    submitted: r.summary.submittedCount,
    total: r.summary.targetTraineeCount,
    analyzed: r.summary.analysisSucceededCount,
    analysisFailedTeams,
    attended: r.summary.assessedCount,
    reportPublished: r.reportPublished,
    // 실제 마감은 이 값이다 — 프로젝트의 `endDate`는 날짜뿐이고 서로 연결돼 있지 않다(9차 §15)
    dueAt: r.submissionDueAt,
    startAt: target.startDate,
    notStarted: r.summary.submittedCount === 0,
  }
}

/*
  ─── ② 반 비교 ──────────────────────────────────────────────────
*/

/**
 * 반별 위험 비율 — **가장 최근 집계된 회차 기준**이다.
 *
 * `rounds`가 최신순이라 첫 `AGGREGATED`가 그 회차다. 집계 전 회차의 값을 쓰면 화면이
 * 0%를 사실처럼 보여준다 — **집계된 회차가 없으면 `null`** 이고 블록이 실패로 떨어진다.
 */
function toCompare(r: RiskRates): ClassCompare | null {
  const basis = r.rounds.find((x) => x.aggregationStatus === 'AGGREGATED')
  if (!basis) return null

  /** 아직 집계 안 된 회차 중 가장 최근 — 화면이 `미프 5차는 미발행`이라고 쓸 대상 */
  const current = r.rounds.find((x) => x.aggregationStatus !== 'AGGREGATED') ?? basis

  const cohortCell = r.cohortSummary.cells.find(
    (c) => c.assessmentRoundId === basis.assessmentRoundId,
  )

  return {
    basisRoundLabel: basis.projectName,
    cohortRatio: toPercent(cohortCell?.riskRate),
    currentRoundLabel: current.projectName,
    currentNotStarted: current.aggregationStatus === 'NOT_STARTED',
    /*
      **정렬하지 않는다.** 서버가 `RECENT_ROUND_WORST`(최근 회차 나쁜 순)로 주고,
      그 순서가 OP-02 격자의 기본 정렬과 같다 — 화면이 다시 정렬하면 두 화면이 갈린다.
    */
    classes: r.classes.map((c) => {
      const cell = c.cells.find((x) => x.assessmentRoundId === basis.assessmentRoundId)
      return {
        className: c.className,
        ratio: toPercent(cell?.riskRate),
        risky: cell?.riskCount ?? 0,
        // 채점된 사람이다. 명부 수가 아니다(14-1 · 9-4)
        graded: cell?.eligibleCount ?? 0,
        hasManager: c.managerNames.length > 0,
      }
    }),
  }
}

/** 서버는 0~1 소수로 준다(`0.4583`). 화면은 정수 퍼센트를 쓴다 — 집계 전이면 `null`이다 */
const toPercent = (rate: number | null | undefined) => (rate == null ? 0 : Math.round(rate * 100))

/*
  ─── ③ 조치 필요 ────────────────────────────────────────────────
*/

/**
 * 네 종류를 한 번에 받는다.
 *
 * **서버가 유형별로 가장 나쁜 한 건씩만** 올린다 — 그래서 각 종류는 있거나 없다.
 * 순서는 되돌리기 어려운 순(미배정 → 개념 공백 → 집단 미달 → 면담 적체)이고, 여기서
 * 그 순서대로 담으므로 화면은 받은 순서로 그리기만 한다.
 */
async function loadTodos(cohortId: string, signal: AbortSignal): Promise<Todo[]> {
  const r = await findCohortActionsRequired({ path: { cohortId }, signal })
  const todos: Todo[] = []

  if (r.managerUnassigned) {
    todos.push({
      kind: 'UNASSIGNED',
      classNames: r.managerUnassigned.classes.map((c) => c.className),
      trainees: r.managerUnassigned.affectedTraineeCount,
    })
  }

  if (r.conceptGap) {
    todos.push({
      kind: 'CONCEPT_GAP',
      projectId: r.conceptGap.round.projectId,
      roundLabel: r.conceptGap.round.projectName,
      conceptName: r.conceptGap.conceptName,
      unmatchedTeams: r.conceptGap.gapTeamCount,
      totalTeams: r.conceptGap.participatingTeamCount,
    })
  }

  if (r.groupGap) {
    todos.push({
      kind: 'GROUP_MISS',
      roundLabel: r.groupGap.round.projectName,
      conceptName: r.groupGap.conceptName,
      className: r.groupGap.className,
      below: r.groupGap.lowLevelCount,
      total: r.groupGap.classMemberCount,
    })
  }

  if (r.interviewBacklog) {
    todos.push({
      kind: 'INTERVIEW_BACKLOG',
      className: r.interviewBacklog.className,
      roundLabel: r.interviewBacklog.round.projectName,
      elapsedDays: r.interviewBacklog.maxDelayDays,
      pending: r.interviewBacklog.pendingInterviewCount,
      notCreated: r.interviewBacklog.notCreatedCount,
    })
  }

  return todos
}
