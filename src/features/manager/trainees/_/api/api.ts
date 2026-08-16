import { useMemo } from 'react'
import {
  useFindManagerTraineeDetail,
  useFindManagerTraineeTimeline,
  useFindTraineeRoster,
} from '@/api/member/useMemberQueries'
import { useFindClassrooms } from '@/api/academic/useAcademicQueries'
import { useFindTraineeEvaluationDetail } from '@/api/evaluation/useEvaluationQueries'
import type {
  findManagerTraineeDetail_Response,
  findManagerTraineeTimeline_Response,
  findTraineeRoster_Response,
} from '@/api/member/memberTypes'
import { listQueryOptions } from '@/lib/listQuery'
import type {
  ConceptReach,
  DetailRound,
  RosterView,
  RoundBadgeKind,
  TimelineEvent,
  TimelineGroup,
  TraineeDetail,
  TraineeEvaluation,
  TraineeRow,
} from './types'

/*
  MG-05 명부 도메인 훅 — **생성 훅을 감싸 화면 어휘로 옮긴다.**

  판정은 서버가 한다. 배지 하나(`roundPrimaryStatusCode`)는 1층 응시상태 → 2층 위험
  유형 우선순위까지 서버가 정해서 오고, `2단 이하`의 분자·분모도 서버가 센다. 화면이
  다시 계산하면 그 규칙이 두 곳에 생긴다(api-boundary §1-②).

  **그런데도 감싸는 이유는 변환이 실재하기 때문이다.**

    · `conceptResultItems`가 **JSON 문자열**이다 — 파싱을 표 셀이 하게 두지 않는다
    · 우수 여부가 회차 행이 아니라 **누적 배열**로 온다(`excellentAssessmentSequenceNos`)
      — 이번 차수가 거기 있는지 보려면 `rounds[]`에서 `cohortRoundNo`를 찾아야 한다
    · 28필드 중 표가 읽는 것은 12개다
*/

type Server = findTraineeRoster_Response
type ServerRow = NonNullable<Server['content']>[number]

export type RosterQuery = {
  cohortId: string
  assessmentRoundId?: string
  classroomId?: string
  accountStatus?: 'ACTIVE' | 'INVITED' | 'INACTIVE'
  query?: string
  sort?: 'NAME' | 'RECENT_ENROLLED' | 'RISK' | 'EXCELLENCE'
  page?: number
}

export const PAGE_SIZE = 20

/**
 * 담당 반 명부 한 쪽.
 *
 * **검색·필터·정렬·페이지를 전부 서버가 한다.** 목일 때는 고정 배열을 화면에서 걸렀지만,
 * 페이지네이션이 붙은 순간 화면 정렬은 *"이 쪽 안에서만 맞는 정렬"* 이 된다 — 26명이
 * 두 쪽으로 갈리면 2쪽의 1등이 1쪽의 꼴찌보다 위일 수 있고, 화면은 그걸 알리지 않는다.
 *
 * `assessmentRoundId`를 **처음엔 보내지 않는다.** 서버가 「이번 회차」를 골라 응답의
 * 같은 이름 필드로 알려주므로, 화면은 그 값으로 드롭다운을 맞춘다.
 */
export function useRoster(params: RosterQuery | undefined) {
  const query = useFindTraineeRoster(
    { path: { cohortId: params?.cohortId ?? '' }, query: toServerQuery(params) },
    { enabled: !!params, ...listQueryOptions },
  )
  const data = useMemo(() => (query.data ? toRosterView(query.data) : undefined), [query.data])
  return { ...query, data }
}

/**
 * 반 필터의 선택지 — **매니저에게는 담당 반만 온다**(서버가 `manager_assignment`로
 * 좁힌다). 명단이 담당 반으로 좁혀져 있는데 드롭다운만 기수 전체면 고를 수 있는데
 * 결과가 0건인 반이 생긴다.
 */
export function useManagedClassrooms(cohortId: string | undefined) {
  return useFindClassrooms({ path: { cohortId: cohortId ?? '' } }, { enabled: !!cohortId })
}

function toServerQuery(p: RosterQuery | undefined) {
  if (!p) return undefined
  return {
    assessmentRoundId: p.assessmentRoundId,
    classroomId: p.classroomId,
    accountStatus: p.accountStatus,
    query: p.query,
    sort: p.sort,
    page: p.page ?? 0,
    size: PAGE_SIZE,
  }
}

function toRosterView(res: Server): RosterView {
  const rounds = (res.rounds ?? []).map((r) => ({
    assessmentRoundId: r.assessmentRoundId,
    cohortRoundNo: r.cohortRoundNo,
    projectId: r.projectId,
    /* `미니프로젝트 6차`에 차수가 이미 있다 — 붙이면 `… 6차 · 6차`가 된다(렌더에서 봤다) */
    label: r.projectName,
  }))
  /* 우수 배열은 **차수** 번호라 지금 보고 있는 회차의 차수를 알아야 견줄 수 있다 */
  const roundNo = rounds.find((r) => r.assessmentRoundId === res.assessmentRoundId)?.cohortRoundNo

  return {
    rows: (res.content ?? []).map((row) => toRow(row, roundNo)),
    total: res.totalElements,
    totalPages: res.totalPages,
    scopeTotal: res.cohortTotal,
    accountCounts: {
      active: res.activeCount,
      invited: res.invitedCount,
      inactive: res.inactiveCount,
    },
    rounds,
    roundId: res.assessmentRoundId ?? null,
  }
}

function toRow(row: ServerRow, roundNo: number | undefined): TraineeRow {
  const excellentRounds = row.excellentAssessmentSequenceNos ?? []
  return {
    id: row.traineeId,
    name: row.name,
    email: row.email,
    className: row.className,
    accountStatus: row.status,
    inactivated:
      row.status === 'INACTIVE'
        ? { reason: row.inactivatedReason ?? row.inactivatedReasonCode, at: row.inactivatedAt }
        : null,

    reach: parseReach(row.conceptResultItems),
    lowCount: row.lowStageConceptCount,
    lowTotal: row.expectedConceptCount ?? 0,
    badge: toBadge(row.roundPrimaryStatusCode, roundNo, excellentRounds),
    terminalAt: row.roundTerminalAt,
    ace: { count: row.excellentOccurrenceCount ?? 0, rounds: excellentRounds },
  }
}

/**
 * 위험 코드가 있으면 그것이 이긴다 — **우수와 위험은 동시에 성립한다.**
 * 같은 회차에 `PERSISTENT_LOW`이면서 누적 우수 1회인 행이 실제로 온다.
 */
function toBadge(
  primary: string | null,
  roundNo: number | undefined,
  excellentRounds: number[],
): RoundBadgeKind | null {
  if (primary) return primary as RoundBadgeKind
  if (roundNo !== undefined && excellentRounds.includes(roundNo)) return 'ACE'
  return null
}

/* ─────────────────────────── MG-06 교육생 상세 ─────────────────────────── */

/**
 * 채점 근거 — **「자세히」를 펼칠 때만 부른다.**
 *
 * 타임라인 `problems[]`에는 도달 단계·재진술 횟수까지만 있고 *"무엇을 하는 코드인지는
 * 말했지만 왜 그 자리에 뒀는지는 설명하지 못했습니다"* 같은 문장이 없다. 그 문장은
 * 여기 `concepts[].steps[].note`에 있다(30차 Q1로 확인).
 *
 * ⚠ **세션 조회가 아니다.** 스펙이 한동안 `GET /assessment-sessions/{id}/problems/{n}`를
 * 가리켰는데 그 컨트롤러는 `TRAINEE` 전용이라 매니저 토큰으로는 403이다 — 백엔드가
 * 그 안내를 이 조회로 고쳤다.
 *
 * **교육생 한 명당 1콜**이라 개념이 3건이어도 3콜이 아니다. 회차마다 `projectId`가
 * 다르므로 쿼리 키가 회차별로 갈린다.
 */
export function useTraineeEvaluation(
  projectId: string | undefined,
  userId: string | undefined,
  enabled: boolean,
) {
  const query = useFindTraineeEvaluationDetail(
    { path: { projectId: projectId ?? '', userId: userId ?? '' } },
    { enabled: enabled && !!projectId && !!userId },
  )
  const data = useMemo<TraineeEvaluation | undefined>(
    () =>
      query.data
        ? {
            reportPublished: query.data.reportPublished,
            concepts: (query.data.concepts ?? []).map((c) => ({
              conceptId: c.conceptId,
              concept: c.concept,
              displayOrder: c.displayOrder,
              reachLevel: c.reachLevel,
              steps: (c.steps ?? []).map((s) => ({
                axisCode: s.axisCode,
                stepNo: s.stepNo,
                passed: s.passed,
                helpCount: s.helpCount,
                note: s.note,
              })),
            })),
          }
        : undefined,
    [query.data],
  )
  return { ...query, data }
}

/** 교육생 한 사람 — 헤더·회차 격자 */
export function useTraineeDetail(cohortId: string | undefined, traineeId: string | undefined) {
  const query = useFindManagerTraineeDetail(
    { path: { cohortId: cohortId ?? '', traineeId: traineeId ?? '' } },
    { enabled: !!cohortId && !!traineeId },
  )
  const data = useMemo(() => (query.data ? toDetail(query.data) : undefined), [query.data])
  return { ...query, data }
}

/**
 * 이력 — **커서 페이징이라 한 번에 넉넉히 받는다.**
 *
 * 이 화면은 회차별로 접어서 다 보여주는 구조라 「더 보기」가 들어갈 자리가 없다.
 * 회차 6 × 이벤트 4가 실측 15건이라 100이면 한참 남는다 — 넘치면 `hasNext`가 참으로
 * 오므로 그때 이어받기를 붙인다.
 */
export function useTraineeTimeline(cohortId: string | undefined, traineeId: string | undefined) {
  const query = useFindManagerTraineeTimeline(
    { path: { cohortId: cohortId ?? '', traineeId: traineeId ?? '' }, query: { size: 100 } },
    { enabled: !!cohortId && !!traineeId },
  )
  const data = useMemo(() => (query.data ? toTimeline(query.data) : undefined), [query.data])
  return { ...query, data }
}

function toDetail(res: findManagerTraineeDetail_Response): TraineeDetail {
  return {
    id: res.traineeId,
    name: res.name,
    email: res.email,
    className: res.className,
    cohortName: res.cohortName,
    accountStatus: res.status,
    riskCode: (res.riskTypeCode as RoundBadgeKind | null) ?? null,
    riskWhy: stripSeverity(res.riskReasonSummary),
    rounds: (res.rounds ?? []).map(toDetailRound),
  }
}

function toDetailRound(
  r: NonNullable<findManagerTraineeDetail_Response['rounds']>[number],
): DetailRound {
  return {
    assessmentRoundId: r.assessmentRoundId,
    cohortRoundNo: r.cohortRoundNo,
    label: `${r.cohortRoundNo}차`,
    /*
      응시가 있었나 — `attemptId`가 근거다. `resultStatus`로 가르면 값이 늘 때마다
      화면이 목록을 따라가야 하고, 실제로 8종이 이미 있다.
    */
    attended: !!r.attemptId,
    badge: (r.primaryStatusCode as RoundBadgeKind | null) ?? (r.excellent ? 'ACE' : null),
    concepts: (r.concepts ?? []).map((c) => ({
      problemNo: c.problemNo,
      conceptName: c.conceptName,
      notGenerated: c.generationStatus === 'NOT_GENERATED',
      level: c.reachLevel as ConceptReach['level'],
    })),
  }
}

function toTimeline(res: findManagerTraineeTimeline_Response): TimelineGroup[] {
  return (res.rounds ?? []).map((r) => ({
    assessmentRoundId: r.assessmentRoundId,
    projectId: r.projectId,
    cohortRoundNo: r.cohortRoundNo,
    label: `${r.cohortRoundNo}차`,
    teamName: r.teamName,
    dateRange: r.startAt && r.endAt ? `${dayLabel(r.startAt)} – ${dayLabel(r.endAt)}` : '',
    events: (r.events ?? []).map(toTimelineEvent),
  }))
}

function toTimelineEvent(
  e: NonNullable<
    NonNullable<findManagerTraineeTimeline_Response['rounds']>[number]['events']
  >[number],
): TimelineEvent {
  const iv = e.interview
  return {
    id: e.eventId,
    kind: e.type as TimelineEvent['kind'],
    at: e.occurredAt,
    dateLabel: dayLabel(e.occurredAt),

    problems: (e.problems ?? []).map((p) => ({
      problemNo: p.problemNo,
      conceptName: p.conceptName,
      notGenerated: p.generationStatus === 'NOT_GENERATED',
      level: p.reachLevel as ConceptReach['level'],
      hintUsedCount: p.hintUsedCount,
    })),
    /* 세션이 없는 이해도 확인이 있다 — 서버가 `expandable`로 이미 갈라 준다 */
    sessionId: e.expandable ? e.sessionId : null,

    reviewTargetCount: e.reviewTargetCount,

    reviewChanges: (e.reviewChanges ?? []).map((c) => ({
      conceptName: c.conceptName,
      from: c.fromReachLevel as ConceptReach['level'],
      to: c.toReachLevel as ConceptReach['level'],
      improved: c.improved,
    })),
    missedConcepts: (e.missedConcepts ?? []).map((c) => c.conceptName),

    interview: iv
      ? {
          /* `PENDING`은 면담 자리는 잡혔지만 기록이 없는 것이다 — 실서버에서 실제로 온다 */
          recorded: iv.recordStatus === 'COMPLETED',
          cause: iv.identifiedCause,
          note: iv.managerNote,
          nextAction: iv.nextAction,
          nextActionConfirmedAt: iv.nextActionConfirmedAt,
        }
      : null,
  }
}

/** `2026-07-12T…` → `07.12` */
function dayLabel(iso: string) {
  return `${iso.slice(5, 7)}.${iso.slice(8, 10)}`
}

/**
 * 판정식 앞에 붙어 오던 심각도 태그를 벗긴다 — 실측:
 * `[SEVERE] 최근 2개 유효 회차 점수 1.67 → 1.67 (기수 평균 대비 저점)`.
 *
 * **코드가 아니라 옛 시드 데이터였다**(30차 R8). 지금 판정 배치가 만드는 문장에는 태그가
 * 없고 스펙에도 「대괄호 태그는 붙지 않는다」가 명시됐다. 다만 **실서버 DB에 이미 적재된
 * 시드는 그 수정으로 안 바뀌므로**(시드 파일이 저장소 추적 대상이 아니다) 이 방어는
 * 남겨 둔다 — 백엔드도 남겨 두어도 무해하다고 했다.
 *
 * 태그는 `[SEVERE]` 하나가 아니라 `[WARN]`·`[RISK]`까지 세 종류였다. 아래 정규식이
 * 셋 다 잡는다.
 */
function stripSeverity(summary: string | null) {
  return summary?.replace(/^\s*\[[A-Z_]+\]\s*/, '') ?? null
}

/**
 * `conceptResultItems`는 **문자열로 직렬화된 JSON 배열**이다(스펙 명시).
 *
 * 값이 서버에서 그대로 흘러오므로 여기가 유일한 방어선이다 — 파싱이 깨지면 표 한 칸이
 * 비는 대신 화면 전체가 죽는다. 빈 배열은 "아직 응시 전"과 같은 자리라 구분하지 않는다.
 */
function parseReach(raw: string | null): ConceptReach[] {
  if (!raw) return []
  let items: unknown
  try {
    items = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(items)) return []
  return items
    .map((i) => i as Record<string, unknown>)
    .sort((a, b) => Number(a.problemNo ?? 0) - Number(b.problemNo ?? 0))
    .map((i) => ({
      problemNo: Number(i.problemNo ?? 0),
      conceptName: String(i.conceptName ?? ''),
      notGenerated: i.generationStatus === 'NOT_GENERATED',
      level: (typeof i.reachLevel === 'number' ? i.reachLevel : null) as ConceptReach['level'],
    }))
}
