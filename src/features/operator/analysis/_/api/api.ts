/*
  분석 도메인 훅 — **생성 훅을 감싸 화면 어휘로 옮긴다.**

  필터·정렬·집계·기준선 비교를 **전부 서버가 한다**(api-boundary §1-②). 여기서 하는
  일은 **서버 모양을 화면 어휘로 옮기는 것**뿐이다 — 셀의 부호(`sign`)조차 서버가
  판정해서 준다(`comparisonToCohort`).

  **그런데도 감싸는 이유**는 변환이 실재하기 때문이다(api-layer-decisions A1):
  셀을 열에 잇는 일(`assessmentRoundId`), 팀 계층 분기, 열 번호 재매김, 출처 문자열
  조립. 화면이 하면 격자 컴포넌트가 서버 응답 구조를 알게 된다.
*/
import { useQuery } from '@tanstack/react-query'
import { listQueryOptions } from '../../../_shared/listQuery'
import { findCohortRiskTraineeRates, findCohortComparison } from '@/api/analytics/analyticsApi'
import { analyticsKeys } from '@/api/analytics/analyticsKeys'
import type { findCohortRiskTraineeRates_Response } from '@/api/analytics/analyticsTypes'
import type {
  CellState,
  ChangeDirection,
  ClassOption,
  CohortCompare,
  CohortQuery,
  GridRow,
  RoundCell,
  RoundColumn,
  RoundGrid,
  RoundQuery,
  Sign,
  Uncounted,
} from './types'

type RiskRates = findCohortRiskTraineeRates_Response
/** 서버 셀 하나 — 기수·반·팀이 같은 모양을 쓴다 */
type ServerCell = RiskRates['cohortSummary']['cells'][number]

/*
  ─── 서버 → 화면 ────────────────────────────────────────────────
*/

/** 집계 상태 3값이 화면 상태와 1:1이다 — `집계 전`·`시작 전`·값이 전부 다르다(F3) */
const CELL_STATE: Record<string, CellState> = {
  AGGREGATED: 'VALUE',
  NOT_AGGREGATED: 'PENDING',
  NOT_STARTED: 'BEFORE',
}

/** 서버는 0~1 소수로 준다. 화면은 정수 퍼센트를 쓴다 */
const toPercent = (rate: number | null | undefined) =>
  rate == null ? null : Math.round(rate * 100)

/**
 * 판정에서 빠진 사람 3종.
 *
 * 이름이 서버와 다르다 — 화면은 *"왜 빠졌나"*(미응시·무효·중단)로 묶고 서버는
 * 세는 대상으로 이름 붙였다. 뜻은 같다.
 */
function toUncounted(r: { exclusionRollup: ServerCell['exclusion'] }): Uncounted {
  return {
    absent: r.exclusionRollup.notAttendedCount,
    invalid: r.exclusionRollup.invalidAttemptCount,
    aborted: r.exclusionRollup.sessionIncompleteCount,
  }
}

/**
 * 셀 하나. **부호를 화면이 만들지 않는다** — 서버가 기준선과 비교해 준다.
 *
 * 기준선 행 자신은 색이 없다(`BASELINE`) — 자기 자신과 비교할 수 없다.
 */
function toCell(c: ServerCell, isBaseline: boolean, no: number): RoundCell {
  const state = CELL_STATE[c.aggregationStatus] ?? 'PENDING'
  return {
    round: no,
    state,
    ratio: state === 'VALUE' ? toPercent(c.riskRate) : null,
    risky: state === 'VALUE' ? c.riskCount : null,
    graded: state === 'VALUE' ? c.eligibleCount : null,
    sign: isBaseline ? 'BASELINE' : ((c.comparisonToCohort as Sign) ?? 'SAME'),
  }
}

/**
 * 회차 열 — 서버가 최신순으로 주는 것을 **화면은 시간순으로** 읽는다(왼쪽이 먼저).
 *
 * ⚠ **`roundNo`는 열 번호가 아니다.** 그 값은 **프로젝트 안의** 응시 회차 번호라 미니
 * 프로젝트에서는 전부 `1`이다 — 그대로 쓰면 열 키가 겹쳐 React가 행을 뭉갠다(실측:
 * 중복 키 경고 45건). 화면이 묻는 `3차`는 **기수 안 순번**이고, 그것이 `cohortRoundNo`다
 * (12차 R1). 요청의 `fromRoundNo`·`toRoundNo`와 같은 축이라 받은 값을 그대로 범위
 * 조건에 되넣을 수 있다.
 *
 * 한때 이 자리에서 **정렬 후 자리 번호**로 매겼다. 값이 없어서 지어낸 것이라, 범위를
 * 좁히면 남은 열이 늘 `1차`부터 다시 세어져 같은 회차가 화면마다 다른 이름을 가졌다.
 */
function toColumns(rounds: RiskRates['rounds']): RoundColumn[] {
  return [...rounds]
    .sort((a, b) => a.cohortRoundNo - b.cohortRoundNo)
    .map((r) => ({
      projectId: r.projectId,
      assessmentRoundId: r.assessmentRoundId,
      no: r.cohortRoundNo,
      // 열 머리 1단은 짧게. 2단이 회차 이름을 그대로 쓰므로 여기서 반복하지 않는다
      label: `${r.cohortRoundNo}차`,
      projectName: r.projectName,
      published: r.aggregationStatus === 'AGGREGATED',
    }))
}

/*
  ─── ① 회차 흐름 ───────────────────────────────────────────────
*/

/**
 * `GET /cohorts/{id}/analytics/risk-trainees`
 *
 * **정렬·범위·계층을 전부 서버가 처리한다.** 화면은 파라미터만 넘긴다.
 *
 * ⚠ **팀 계층은 회차 하나를 요구한다.** 서버가 `TEAM_LEVEL_PROJECT_REQUIRED`와
 * `TEAM_LEVEL_SINGLE_CLASSROOM_REQUIRED`로 막는다 — 팀은 회차마다 재편성될 수 있어
 * 회차를 가로질러 같은 팀을 추적하는 것이 성립하지 않는다. 둘 중 하나라도 없으면
 * 조회하지 않고 **무엇이 빠졌는지**를 돌려준다.
 */
/*
  **탭에 돌아오면 다시 읽는다.** 전역 기본값은 `false`이고(`main.tsx`) 그게 맞다 — 폼을
  만지다 돌아오면 입력 중인 값이 흔들린다.

  **이 화면이 예외인 이유는 OP-01 대시보드와 같다** — 조작이 없는 지표판이고, 켜 둔 채
  방치되는 화면이다. 집계는 회차가 끝나면 바뀌는데, 돌아왔을 때 옛 값을 그대로 두면
  화면이 조용히 낡는다(op-02-situations T1).
*/
const REFRESH_ON_RETURN = { refetchOnWindowFocus: true } as const

export function useRoundGrid(q: RoundQuery | undefined) {
  return useQuery({
    // 고른 조건이 곧 키다 — 계층·반·회차·범위·정렬을 바꾸면 그 조합의 캐시를 본다
    queryKey: [...analyticsKeys.all, 'round-grid', q],
    enabled: !!q,
    queryFn: () => loadRoundGrid(q!),
    /*
      **툴바를 만져도 격자를 비우지 않는다.** 조건이 곧 키라 바뀌는 순간 캐시가 없어져
      화면이 통째로 비었다 — 반 하나를 더 고를 때마다 표가 사라졌다(`_shared/listQuery`).

      ⚠ **다만 계층이 바뀌면 유지하지 않는다.** `_shared/listQuery`의 규칙 그대로다 —
      *"같은 것의 다른 조각"* 은 유지하고 *"다른 것"* 은 유지하지 않는다. 반별 격자와 팀
      격자는 **행도 열도 기준선도 다른 표**라, 그대로 두면 팀을 고르는 동안 반별 표가
      보이고 반별로 돌아와도 팀 표가 남는다(실측).
    */
    placeholderData: (prev: RoundGrid | undefined) => (prev?.level === q?.level ? prev : undefined),
    ...REFRESH_ON_RETURN,
  })
}

async function loadRoundGrid(q: RoundQuery): Promise<RoundGrid> {
  const isTeam = q.level === 'team'
  const needs = isTeam ? missingForTeam(q) : undefined

  /*
    빠진 것이 있으면 **격자를 만들지 않는다.** 임의로 하나 골라 그리면 그것이 답인
    줄 읽히고, 기준선이 그 반이라 반이 없으면 색의 뜻 자체가 정해지지 않는다.
    다만 **선택지는 줘야 하므로** 반별 조회로 반 목록과 회차만 받아 온다.
  */
  if (needs) {
    const base = await findCohortRiskTraineeRates({ path: { cohortId: q.cohortId } })
    return {
      allRounds: toColumns(base.rounds),
      columns: [],
      /* 고를 회차가 없으면 **범위를 지어내지 않는다** — `0 – 0`은 0차가 있는 것처럼 읽힌다 */
      appliedFrom: null,
      appliedTo: null,
      rows: [],
      baselineName: '',
      level: q.level,
      allClasses: toClassOptions(base),
      needs,
    }
  }

  /*
    팀 계층은 **회차 목록을 따로 받는다.** 팀 조회는 고른 회차 하나만 돌려주므로
    그 응답으로 선택지를 만들면 **고르는 순간 나머지 회차가 사라진다** — 다른 회차로
    옮길 방법이 없어진다. 반별 조회 한 건이 회차 전체를 준다.
  */
  const [r, all] = await Promise.all([
    findCohortRiskTraineeRates({
      path: { cohortId: q.cohortId },
      query: {
        level: isTeam ? 'TEAM' : 'CLASS',
        classroomId: q.classIds.length ? q.classIds : undefined,
        projectId: isTeam ? q.projectId : undefined,
        fromRoundNo: q.fromRound,
        toRoundNo: q.toRound,
        sort: SORT[q.sort],
      },
    }),
    isTeam ? findCohortRiskTraineeRates({ path: { cohortId: q.cohortId } }) : null,
  ])

  const columns = toColumns(r.rounds)
  /** 선택지는 전체, 열은 조회 결과 — 팀 계층에서 둘이 갈린다 */
  const allRounds = all ? toColumns(all.rounds) : columns

  /*
    **기준선이 계층에 따라 바뀐다**(OP-02 §3) — 반별이면 기수 전체, 팀이면 **그 반**이다.
    팀은 같은 반 안에서 비교해야 뜻이 있다. 축 라벨·범례가 이 이름을 쓴다.
  */
  const baselineRow: GridRow = isTeam
    ? toRow(r.classes[0], columns, true, `${r.classes[0]?.className ?? ''} 전체`)
    : {
        name: '기수 전체',
        size: r.cohortSummary.traineeCount,
        baseline: true,
        cells: byColumn(r.cohortSummary.cells, columns, true),
        uncounted: toUncounted(r.cohortSummary),
      }

  const rows = isTeam
    ? r.teams.map((t) => toRow(t, columns, false, t.teamName))
    : r.classes.map((c) => toRow(c, columns, false, c.className))

  return {
    allRounds,
    columns,
    /*
      서버가 실제로 적용한 범위 — 안 보냈으면 서버가 정한 값이 여기서 나온다.
      **열이 없으면 `null`이다** — `0`으로 채우면 화면이 `0 – 0`을 그려 0차가 있는 것처럼 읽힌다.
    */
    appliedFrom: columns[0]?.no ?? null,
    appliedTo: columns[columns.length - 1]?.no ?? null,
    // **기준선 행은 정렬에서 빠진다** — 위치가 움직이면 기준이 아니게 된다
    rows: [baselineRow, ...rows],
    baselineName: isTeam ? (r.classes[0]?.className ?? '') : '기수 전체',
    level: q.level,
    /*
      **반 목록은 전량이어야 한다.** 팀 조회 응답(`r`)은 **고른 반 하나만** 담고 있어서
      그것으로 선택지를 만들면 툴바가 `전체 1반`이 되고 **다른 반으로 옮길 수가 없다**
      (실측). 회차 목록을 따로 받는 것과 같은 이유다.
    */
    allClasses: toClassOptions(all ?? r),
  }
}

/** 팀 계층에서 무엇이 빠졌나 — 화면이 그 자리에 무엇을 고르라고 쓸지 정한다 */
function missingForTeam(q: RoundQuery): 'CLASS' | 'ROUND' | 'BOTH' | undefined {
  const noClass = q.classIds.length !== 1
  const noRound = !q.projectId
  if (noClass && noRound) return 'BOTH'
  if (noClass) return 'CLASS'
  if (noRound) return 'ROUND'
  return undefined
}

/** 행 하나 — 반·팀·기수가 같은 모양이라 한 번만 만든다 */
function toRow(
  src: { memberCount?: number; traineeCount?: number; cells: ServerCell[] } & {
    exclusionRollup: ServerCell['exclusion']
  },
  columns: RoundColumn[],
  baseline: boolean,
  name: string,
): GridRow {
  return {
    name,
    size: src.traineeCount ?? src.memberCount ?? 0,
    baseline,
    cells: byColumn(src.cells, columns, baseline),
    uncounted: toUncounted(src),
  }
}

/**
 * 셀을 **열 순서에 맞춘다** — 서버 배열 순서를 믿지 않는다.
 *
 * **`assessmentRoundId`로 잇는다.** `cohortRoundNo`도 기수 안에서 유일하지만, 번호는
 * 회차를 지우고 다시 만들면 다시 매겨질 수 있고 ID는 그렇지 않다. `roundNo`는 프로젝트
 * 안 번호라 전부 같아서 애초에 열을 못 가른다(`toColumns` 주석).
 */
function byColumn(cells: ServerCell[], columns: RoundColumn[], baseline: boolean): RoundCell[] {
  const byId = new Map(cells.map((c) => [c.assessmentRoundId, c]))
  return columns.map((col) => {
    const c = byId.get(col.assessmentRoundId)
    return c
      ? toCell(c, baseline, col.no)
      : {
          round: col.no,
          state: 'PENDING' as const,
          ratio: null,
          risky: null,
          graded: null,
          sign: 'SAME' as const,
        }
  })
}

const toClassOptions = (r: RiskRates): ClassOption[] =>
  r.classes.map((c) => ({ classId: c.classId, className: c.className }))

/** 정렬 4종이 서버와 1:1이다 — 이름만 화면 쪽 것을 쓴다 */
const SORT: Record<
  RoundQuery['sort'],
  'RECENT_ROUND_WORST' | 'WORSE_ROUND_COUNT' | 'EXCLUSION_COUNT' | 'NAME'
> = {
  LATEST_WORST: 'RECENT_ROUND_WORST',
  WORSE_COUNT: 'WORSE_ROUND_COUNT',
  UNCOUNTED: 'EXCLUSION_COUNT',
  NAME: 'NAME',
}

/*
  ─── ② 기수 간 비교 ────────────────────────────────────────────
*/

/**
 * `GET /cohorts/{id}/analytics/cohort-comparison`
 *
 * **같은 검증 개념(`teachesId`)끼리만 맞댄다** — 회차가 달라도 같은 것을 물었으면
 * 값의 뜻이 같다. 회차 흐름 탭이 부호를 쓰는 것과 값의 성격이 다른 이유다.
 *
 * ⚠ **`sameCurriculumOnly`를 반드시 보낸다.** 서버 기본값이 `false`라 안 보내면 교안이
 * 바뀐 개념까지 섞여 오는데, 이 탭은 머리글·표 머리·타입 주석 세 곳에서 *"같은 교안 ·
 * 같은 개념"* 이라고 **단언한다.** 값의 차이가 교육생 것인지 교안 것인지 갈라지지 않으면
 * 절대 눈금(1~4단)을 두 기수에 걸쳐 쓸 근거가 사라진다(`CohortCompareTable` 주석).
 *
 * 화면에 토글을 두지 않는 이유가 그것이다 — 끌 수 있는 것이었다면 표가 눈금을 바꿔야
 * 한다. 12차 R2 전에는 `true`가 0건을 돌려줘서 켤 수 없었고, 지금은 켜진다.
 */
export function useCohortCompare(q: CohortQuery | undefined) {
  return useQuery({
    queryKey: [...analyticsKeys.all, 'cohort-compare', q],
    enabled: !!q,
    queryFn: () => loadCohortCompare(q!),
    /* 비교 기수를 바꿔도 표를 비우지 않는다 — `_shared/listQuery` 주석 참고 */
    ...listQueryOptions,
    ...REFRESH_ON_RETURN,
  })
}

async function loadCohortCompare(q: CohortQuery): Promise<CohortCompare> {
  const call = (baselineCohortId?: string) =>
    findCohortComparison({
      path: { cohortId: q.cohortId },
      query: {
        baselineCohortId,
        sameCurriculumOnly: true,
        sort: q.sort === 'WORSENED' ? 'WORSENED' : 'CONCEPT',
      },
    })

  let r = await call(q.compareCohortId ?? undefined)

  /*
    **비교 대상을 안 고르면 서버가 대신 고르지 않는다.** 견줄 수 있는 기수가 실제로 있는데도
    `baselineCohortId`를 생략하면 `concepts`가 0건으로 온다(실측 · op-02-situations §2-1) —
    그래서 이 탭은 **사용자가 셀렉트를 만지기 전까지 늘 비어 있었다.**

    **한 번 더 부른다.** 사용자가 안 골랐고 견줄 수 있는 기수가 있으면, 서버가 준 목록의
    **첫 번째 `comparable`** 로 다시 조회한다.

    ⚠ **우리가 정렬하지 않는다.** 「어느 기수가 기본인가」는 도메인 판단이라(가장 최근?
    같은 교안을 가장 많이 쓴?) 화면이 정하면 근거 없는 규칙이 코드에 박힌다 — 서버가 준
    순서를 그대로 믿는다. **서버가 기본값을 고르게 되면 이 블록을 지운다**(15차 요청 대상).
  */
  if (!q.compareCohortId && r.concepts.length === 0) {
    const fallback = r.availableBaselineCohorts.find((c) => c.comparable)
    if (fallback) r = await call(fallback.cohortId)
  }

  return {
    sameCurriculumOnly: r.sameCurriculumOnly,
    availableCohorts: r.availableBaselineCohorts.map((c) => ({
      id: c.cohortId,
      label: c.cohortName,
      comparable: c.comparable,
    })),
    compareCohortId: r.baselineCohort?.cohortId ?? null,
    compareCohortLabel: r.baselineCohort?.cohortName ?? null,
    currentCohortLabel: r.targetCohort.cohortName,
    rows: r.concepts.map((c) => ({
      conceptId: c.teachesId,
      conceptName: c.conceptName,
      source: formatSource(c.source),
      baseAvg: c.baseline.averageReachedLevel,
      currentAvg: c.target.averageReachedLevel,
      baseVersion: version(c.curriculumVersion.baselineVersionNo),
      currentVersion: version(c.curriculumVersion.targetVersionNo),
      direction: c.change.direction as ChangeDirection,
      delta: c.change.delta,
    })),
  }
}

/**
 * `교안 Spring 백엔드 설계 · 3장 p.53–55 · 미프 3차`.
 *
 * **있는 조각만 잇는다.** 서버가 조각마다 `null`을 줄 수 있어서, 없는 것을 `미상`
 * 같은 말로 채우면 화면이 없는 사실을 주장하게 된다.
 */
function formatSource(s: {
  curriculumTitle: string | null
  sectionSequenceNo: number | null
  sectionTitle: string | null
  pageStart: number | null
  pageEnd: number | null
  roundLabel: string | null
}): string {
  const section = [
    s.sectionSequenceNo != null && `${s.sectionSequenceNo}장`,
    s.pageStart != null &&
      (s.pageEnd && s.pageEnd !== s.pageStart
        ? `p.${s.pageStart}–${s.pageEnd}`
        : `p.${s.pageStart}`),
  ]
    .filter(Boolean)
    .join(' ')

  return [s.curriculumTitle && `교안 ${s.curriculumTitle}`, section, s.roundLabel]
    .filter(Boolean)
    .join(' · ')
}

/** `v2`. 버전이 없으면 표에서 그 칸을 비운다 */
const version = (no: number | null) => (no == null ? null : `v${no}`)
