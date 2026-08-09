/*
  대시보드 API 경계 — **화면이 유일하게 의존하는 곳.**

  ⚠ **한 호출이 아니라 셋이다.** 목일 때는 `GET /operator/dashboard` 하나를 가정했는데
  서버에 그런 엔드포인트가 없다(types `DashboardResponse` 주석). 셋을 **동시에** 부르고
  각각의 성패를 `Block<T>`로 갈라 담는다 — 하나가 죽어도 나머지는 그린다(F2).

  블록별 판정·정렬·기준선은 **전부 서버가 한다**(api-boundary §1-②). 여기서 하는 일은
  **서버 모양을 화면 어휘로 옮기는 것**뿐이다.
*/
import { findCohortActionsRequired, findCohortRiskTraineeRates } from '@/api/analytics/analyticsApi'
import { findProjects, findProjectClassProgress } from '@/api/projectExecution/projectExecutionApi'
import type { findCohortRiskTraineeRates_Response } from '@/api/analytics/analyticsTypes'
import type { Block, ClassCompare, DashboardResponse, RoundPipeline, Todo } from './types'

type RiskRates = findCohortRiskTraineeRates_Response

/** 오늘 날짜(`YYYY-MM-DD`). 마감까지 남은 일수를 셀 때 쓴다 — 시계를 읽는 데 왕복이 필요 없다 */
export function getToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const pad = (n: number) => String(n).padStart(2, '0')

/** 성공하면 값, 실패하면 `{ ok: false }` — 블록 하나가 죽어도 화면 전체를 비우지 않는다 */
async function block<T>(load: () => Promise<T>): Promise<Block<T>> {
  try {
    return { ok: true, value: await load() }
  } catch {
    return { ok: false }
  }
}

/**
 * 대시보드 한 장 — 조회 셋을 **동시에** 부른다.
 *
 * 순차로 부르면 셋의 지연이 더해진다. 서로를 참조하지 않으므로(파이프라인만 목록을
 * 먼저 봐야 한다) 병렬이 맞다.
 */
export async function getDashboard(cohortId: string): Promise<DashboardResponse> {
  /*
    **조회는 셋이다.** 반 비교 응답 하나가 머리글(인원·반 수)까지 담고 있어서 스코프를
    따로 부르지 않는다 — `findCohort`를 부르면 조회가 하나 늘고, 무엇보다 **그쪽
    `traineeCount`는 지금 항상 0이다**(10차 R3).
  */
  const [risk, pipeline, todos] = await Promise.all([
    block(() => findCohortRiskTraineeRates({ path: { cohortId } })),
    block(() => loadPipeline(cohortId)),
    block(() => loadTodos(cohortId)),
  ])

  return {
    /*
      머리글은 **실패해도 화면을 막지 않는다.** 스코프 한 줄 때문에 대시보드 전체를
      에러로 덮으면, 정작 볼 수 있는 조치 필요까지 사라진다.
    */
    trainees: risk.ok ? risk.value.cohortSummary.traineeCount : 0,
    classes: risk.ok ? risk.value.classes.length : 0,
    pipeline,
    /*
      **같은 응답에서 나오지만 실패는 따로 본다.** 조회가 성공해도 집계된 회차가 하나도
      없으면(전 회차 진행 전) 반 비교는 그릴 것이 없다 — 그때 0%를 사실처럼 보여주지
      않으려고 `toCompare`가 `null`을 돌려주고 이 자리가 실패로 떨어진다.
    */
    compare: risk.ok ? (toCompare(risk.value) ?? { ok: false }) : { ok: false },
    todos,
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
async function loadPipeline(cohortId: string): Promise<RoundPipeline> {
  const list = await findProjects({ path: { cohortId } })
  const projects = list.projects
  if (projects.length === 0) throw new Error('no projects')

  const running = projects.find((p) => p.status === 'RUNNING')
  const planned = projects
    .filter((p) => p.status === 'PLANNED')
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0]
  const target = running ?? planned ?? projects[projects.length - 1]

  const r = await findProjectClassProgress({ path: { projectId: target.projectId } })

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
function toCompare(r: RiskRates): Block<ClassCompare> | null {
  const basis = r.rounds.find((x) => x.aggregationStatus === 'AGGREGATED')
  if (!basis) return null

  /** 아직 집계 안 된 회차 중 가장 최근 — 화면이 `미프 5차는 미발행`이라고 쓸 대상 */
  const current = r.rounds.find((x) => x.aggregationStatus !== 'AGGREGATED') ?? basis

  const cohortCell = r.cohortSummary.cells.find(
    (c) => c.assessmentRoundId === basis.assessmentRoundId,
  )

  return {
    ok: true,
    value: {
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
    },
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
async function loadTodos(cohortId: string): Promise<Todo[]> {
  const r = await findCohortActionsRequired({ path: { cohortId } })
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
