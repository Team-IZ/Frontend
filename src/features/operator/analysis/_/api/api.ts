// ─────────────────────────────────────────────────────────────
// 분석 API 격리 모듈
// 백엔드 준비 시 각 함수의 Mock 블록만 삭제하고 아래 주석의 fetch를 켜면 됩니다.
// (화면·컴포넌트 코드는 수정 불필요 — 시그니처가 이미 실제 모양입니다)
// ─────────────────────────────────────────────────────────────
import type {
  CohortCompare,
  CohortQuery,
  GridRow,
  RoundCell,
  RoundColumn,
  RoundGrid,
  RoundQuery,
  Sign,
} from './types'

// ───────── Mock 전용 (백엔드 연동 시 이 블록 삭제) ─────────
import { CLASSES, COHORT_TOTAL, ROUNDS } from '@/mocks/cohortRounds'
import { AVAILABLE_COHORTS, CONCEPT_COMPARE, C_TEAMS, C_TEAM_UNCOUNTED } from './mockDb'

const LATENCY_MS = 250
const delay = <T>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS))

const ratio = (risky: number, graded: number) =>
  graded === 0 ? 0 : Math.round((risky / graded) * 100)

/**
 * 목업 케이스를 실제로 열어보기 위한 스위치 — `?case=bigp|nocohort|fail`.
 *
 * 케이스 표의 상태를 전부 그렸는지는 **눈으로 봐야** 판정된다(git-convention §7).
 * 목 데이터가 한 벌뿐이면 정상 케이스만 렌더되고 나머지는 코드에만 존재한다 —
 * 대시보드가 이미 같은 스위치를 쓴다. 이 함수는 mockDb와 함께 사라진다.
 */
type MockCase = 'normal' | 'bigp' | 'nocohort' | 'fail'
const CASES: MockCase[] = ['normal', 'bigp', 'nocohort', 'fail']
function mockCase(): MockCase {
  const q = new URLSearchParams(window.location.search).get('case')
  return CASES.find((c) => c === q) ?? 'normal'
}
// ──────────────────────────────────────────────────────────

/**
 * 셀 하나를 만든다. **값이 없으면 왜 없는지가 상태로 남는다** — `집계 전`(미발행)과
 * `시작 전`(미시작)은 뜻이 다르고 `0%`와도 색이 다르다(F3).
 *
 * `sign`은 **값이 아니라 기준선 대비 부호**다. 같은 회차를 모든 반이 보므로 기준선을
 * 빼면 **회차 난이도가 상쇄되고** 그 행에 대해서만 말할 수 있는 것이 남는다(OP-02 §3).
 * **폭을 정하지 않는다** — `N 이상 벌어지면 심각`은 기획에 그 숫자가 없다(E8).
 */
function makeCell(
  col: RoundColumn,
  risky: number | undefined,
  size: number,
  baselineRatio: number | null,
  isBaseline: boolean,
): RoundCell {
  if (!col.published || risky === undefined) {
    return {
      round: col.no,
      // 등록만 되고 시작 전인 회차와 진행 중인 회차를 가른다(OP-02 §4-2)
      state: ROUNDS.find((r) => r.no === col.no)?.state === 'BEFORE' ? 'BEFORE' : 'PENDING',
      ratio: null,
      risky: null,
      graded: null,
      sign: 'SAME',
    }
  }
  const r = ratio(risky, size)
  const sign: Sign = isBaseline
    ? // 기준선 자신은 색이 없다 — 자기 자신과 비교할 수 없다
      'BASELINE'
    : baselineRatio === null || r === baselineRatio
      ? 'SAME'
      : r > baselineRatio
        ? 'WORSE'
        : 'BETTER'
  return { round: col.no, state: 'VALUE', ratio: r, risky, graded: size, sign }
}

/** 정렬 키는 전부 **격자에 그대로 보인다**(E2) — 요약 열이 없어도 순서를 묻지 않는다 */
function sortRows(rows: GridRow[], sort: RoundQuery['sort']): GridRow[] {
  const latest = (r: GridRow) => [...r.cells].reverse().find((c) => c.ratio !== null)?.ratio ?? -1
  const worseCount = (r: GridRow) => r.cells.filter((c) => c.sign === 'WORSE').length
  const uncounted = (r: GridRow) => r.uncounted.absent + r.uncounted.invalid + r.uncounted.aborted
  const by: Record<RoundQuery['sort'], (a: GridRow, b: GridRow) => number> = {
    LATEST_WORST: (a, b) => latest(b) - latest(a) || a.name.localeCompare(b.name),
    WORSE_COUNT: (a, b) => worseCount(b) - worseCount(a) || a.name.localeCompare(b.name),
    UNCOUNTED: (a, b) => uncounted(b) - uncounted(a) || a.name.localeCompare(b.name),
    NAME: (a, b) => a.name.localeCompare(b.name),
  }
  return [...rows].sort(by[sort])
}

/**
 * `GET /cohorts/{id}/analysis/rounds?level=&classes=&teams=&from=&to=&sort=`
 *
 * **필터·정렬·집계를 전부 서버가 한다**(api-boundary §1-②). 목에서도 이 자리에서 돈다 —
 * 화면에서 돌리면 연동이 재작성이 된다.
 */
export function getRoundGrid(q: RoundQuery): Promise<RoundGrid> {
  // ===== Mock 버전 (현재 활성) =====
  const view = mockCase()
  // 케이스 표의 `ANALYSIS_UNAVAILABLE` — 0으로 그리지 않는다
  if (view === 'fail') return Promise.reject({ code: 'ANALYSIS_UNAVAILABLE' })

  const allRounds: RoundColumn[] = ROUNDS.map((r) => ({
    projectId: r.projectId,
    no: r.no,
    label: `${r.no}차`,
    projectName: r.projectName,
    published: r.state === 'PUBLISHED',
  }))

  /*
    **기본 범위 = 발행된 회차 전부 + 진행 중 1개.**

    상수(`1–4차`)를 쓰면 발행 회차가 몇 개냐에 따라 빈칸 수가 널뛴다. 규칙으로 두면
    회차가 6개든 8개든 **값 없는 열이 하나를 넘지 않는다.**

    진행 중 회차를 하나 남기는 이유 — 그 열이 `집계 전`이라고 말해 주어야
    *"곧 채워진다"* 를 알 수 있다. 아예 빼면 오퍼레이터가 다음 회차를 보려고
    매번 범위를 늘려야 한다.
  */
  const lastPublished = [...allRounds].reverse().find((r) => r.published)?.no ?? 1
  const running = allRounds.find((r) => r.no > lastPublished)
  const from = q.fromRound ?? 1
  const to = q.toRound ?? running?.no ?? lastPublished

  // 범위 밖 회차는 **열이 없다** — 색도 그 구간에서만 읽힌다
  const columns = allRounds.filter((c) => c.no >= from && c.no <= to)
  const allClassNames = CLASSES.map((c) => c.className)

  /* 빅프는 표가 없다 — 판정식이 달라 같은 비율로 쓰면 가로로 이어 읽히게 된다(9-2) */
  if (q.kind === 'BIG' || view === 'bigp') {
    return delay({
      allRounds,
      columns,
      appliedFrom: from,
      appliedTo: to,
      rows: [],
      baselineName: '',
      allClassNames,
    })
  }

  if (q.level === 'team') {
    /*
      **반을 안 골랐으면 표를 만들지 않는다.** 기준선이 그 반이라 반이 없으면 색의
      뜻 자체가 정해지지 않는다 — 임의로 하나 골라 그리면 그것이 답인 줄 읽힌다.
    */
    if (!q.classNames[0]) {
      return delay({
        allRounds,
        columns,
        appliedFrom: from,
        appliedTo: to,
        rows: [],
        baselineName: '',
        allClassNames,
        allTeamNames: C_TEAMS.map((t) => t.name),
        needsClass: true,
      })
    }

    /*
      **기준선이 그 반이다.** 팀은 같은 반 안에서 비교해야 뜻이 있다(OP-02 §3) —
      기준선이 바뀌면 축 라벨과 범례도 따라가야 한다(`baselineName`).
    */
    const className = q.classNames[0]
    const cls = CLASSES.find((c) => c.className === className)
    const baseRatios = new Map(
      columns.map((col) => {
        const cell = cls?.cells.find((x) => x.round === col.no)
        return [col.no, cell ? ratio(cell.risky, cell.graded) : null]
      }),
    )

    const baseRow: GridRow = {
      name: `${className} 전체`,
      size: cls?.trainees ?? 0,
      baseline: true,
      cells: columns.map((col) =>
        makeCell(
          col,
          cls?.cells.find((x) => x.round === col.no)?.risky,
          cls?.trainees ?? 0,
          null,
          true,
        ),
      ),
      uncounted: cls?.uncounted ?? { absent: 0, invalid: 0, aborted: 0 },
    }

    const picked = q.teamNames?.length ? q.teamNames : C_TEAMS.map((t) => t.name)
    const teamRows: GridRow[] = C_TEAMS.filter((t) => picked.includes(t.name)).map((t) => ({
      name: t.name,
      size: t.size,
      baseline: false,
      cells: columns.map((col) =>
        makeCell(col, t.risky[col.no - 1], t.size, baseRatios.get(col.no) ?? null, false),
      ),
      uncounted: C_TEAM_UNCOUNTED[t.name] ?? { absent: 0, invalid: 0, aborted: 0 },
    }))

    return delay({
      allRounds,
      columns,
      appliedFrom: from,
      appliedTo: to,
      // **기준선 행은 정렬에서 빠진다** — 위치가 움직이면 기준이 아니게 된다
      rows: [baseRow, ...sortRows(teamRows, q.sort)],
      baselineName: className,
      allClassNames,
      allTeamNames: C_TEAMS.map((t) => t.name),
    })
  }

  // 반별 — 기준선은 기수 전체다
  const baseRatios = new Map(
    columns.map((col) => {
      const cell = COHORT_TOTAL.cells.find((x) => x.round === col.no)
      return [col.no, cell ? ratio(cell.risky, cell.graded) : null]
    }),
  )

  const baseRow: GridRow = {
    name: '기수 전체',
    size: COHORT_TOTAL.trainees,
    baseline: true,
    cells: columns.map((col) => {
      const cell = COHORT_TOTAL.cells.find((x) => x.round === col.no)
      return makeCell(col, cell?.risky, cell?.graded ?? COHORT_TOTAL.trainees, null, true)
    }),
    uncounted: COHORT_TOTAL.uncounted,
  }

  const picked = q.classNames.length ? q.classNames : allClassNames
  const classRows: GridRow[] = CLASSES.filter((c) => picked.includes(c.className)).map((c) => ({
    name: c.className,
    size: c.trainees,
    baseline: false,
    cells: columns.map((col) => {
      const cell = c.cells.find((x) => x.round === col.no)
      return makeCell(
        col,
        cell?.risky,
        cell?.graded ?? c.trainees,
        baseRatios.get(col.no) ?? null,
        false,
      )
    }),
    uncounted: c.uncounted,
  }))

  return delay({
    allRounds,
    columns,
    appliedFrom: from,
    appliedTo: to,
    rows: [baseRow, ...sortRows(classRows, q.sort)],
    baselineName: '기수',
    allClassNames,
  })

  // ===== 실제 버전 (연동 시 위를 지우고 아래를 켠다) =====
  // const params = new URLSearchParams({ level: q.level, from: String(q.fromRound), … })
  // return http<RoundGrid>(`/cohorts/${q.cohortId}/analysis/rounds?${params}`)
}

/**
 * `GET /cohorts/{id}/analysis/cohorts?compare=&sort=`
 *
 * **같은 교안·같은 개념만** 내려온다. 커리큘럼이 같으면 같은 것을 물은 값이라 비교가
 * 성립한다(14번 61줄 — *"기수 끝나면 수업 진단"*).
 */
export function getCohortCompare(q: CohortQuery): Promise<CohortCompare> {
  // ===== Mock 버전 (현재 활성) =====
  const view = mockCase()
  if (view === 'fail') return Promise.reject({ code: 'ANALYSIS_UNAVAILABLE' })

  // `#nocohort` — 첫 기수라 비교 대상이 없다
  const compare =
    view === 'nocohort' ? undefined : AVAILABLE_COHORTS.find((c) => c.id === q.compareCohortId)

  /*
    비교할 기수가 없으면 빈 상태다. **다른 기관 평균을 만들지 않는다** —
    커리큘럼이 다른 값이라 비교가 성립하지 않는다.
  */
  if (!compare) {
    return delay({
      availableCohorts: view === 'nocohort' ? [] : AVAILABLE_COHORTS,
      compareCohortLabel: null,
      currentCohortLabel: '7기',
      rows: [],
    })
  }

  const rows = [...CONCEPT_COMPARE].sort((a, b) =>
    q.sort === 'CONCEPT_NAME'
      ? a.conceptName.localeCompare(b.conceptName)
      : /*
          나빠진 순 — **새 개념은 비교 대상이 아니므로 뒤로 보낸다.** 없는 값을 0으로 치면
          맨 앞에 와서 *"가장 나빠진 것"* 으로 읽힌다.
        */
        (a.baseAvg === null ? 1 : 0) - (b.baseAvg === null ? 1 : 0) ||
        a.currentAvg - (a.baseAvg ?? 0) - (b.currentAvg - (b.baseAvg ?? 0)),
  )

  return delay({
    availableCohorts: AVAILABLE_COHORTS,
    compareCohortLabel: compare.label,
    currentCohortLabel: '7기',
    rows,
  })

  // return http<CohortCompare>(`/cohorts/${q.cohortId}/analysis/cohorts?compare=${q.compareCohortId}`)
}
