import { useCallback, useEffect, useState } from 'react'
import ConsoleShell from '@/shells/ConsoleShell'
import PageHeader from '@/components/common/PageHeader'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import { Spinner } from '@/components/ui/Spinner'
import { useAsync } from '@/lib/useAsync'
import {
  COHORT_NAME,
  getHeatmap,
  type ClassName,
  type HeatmapLevel,
  type RoundId,
  type SortMode,
} from './mockData'
import { getSessionView, setSessionView } from './viewState'
import HeatmapToolbar from './components/HeatmapToolbar'
import HeatmapLegend from './components/HeatmapLegend'
import HeatmapTable from './components/HeatmapTable'

/*
  MG-02 히트맵 — "개인 문제인가, 반 문제인가"(정의서 §1). 계층(반별 › 팀 › 개인)마다
  화면이 바뀐다(URL은 그대로다 — 목업 3장면이 모두 같은 주소를 쓴다). 조립은 여기가,
  집계·판정(집단 미달·색·라벨)은 `mockData.ts`가 갖는다(MG-03·MG-07과 같은 분업).

  **드릴다운은 두 갈래다** — 표의 행 클릭(아래로 한 단만) vs 툴바 `반별/팀/개인`
  버튼(어느 단으로든 바로 이동). 버튼으로 팀·개인에 들어가면 아직 반을 안 골랐을
  수 있어 **첫 반을 기본값으로 둔다** — OP-02 `RoundToolbar`처럼 팝오버를 강제로
  여는 대신, 이 화면의 반 select는 항상 값이 있어야 하는 일반 Select라 빈 상태를
  만들지 않는 편이 단순하다(정의서가 이 갈림길을 명시하지 않아 여기서 판단).
*/
const traineePath = (id: string) => `/manager/trainees/${id}`

export default function HeatmapScreen() {
  // 개인 히트맵 → 교육생 상세 → 뒤로가기로 돌아왔을 때 같은 화면(같은 반·팀·회차)을
  // 다시 보여주기 위해 초기값을 세션에서 복원한다(viewState.ts, 사용자 지시).
  const initial = getSessionView()
  const [round, setRound] = useState<RoundId>(initial.round)
  const [level, setLevel] = useState<HeatmapLevel>(initial.level)
  const [classFilter, setClassFilter] = useState<ClassName>(initial.classFilter)
  const [teamFilter, setTeamFilter] = useState(initial.teamFilter)
  const [sort, setSort] = useState<SortMode>(initial.sort)
  const [problemOnly, setProblemOnly] = useState(initial.problemOnly)
  const [riskOnly, setRiskOnly] = useState(initial.riskOnly)

  useEffect(() => {
    setSessionView({ round, level, classFilter, teamFilter, sort, problemOnly, riskOnly })
  }, [round, level, classFilter, teamFilter, sort, problemOnly, riskOnly])

  const load = useCallback(
    () =>
      getHeatmap({
        round,
        level,
        classFilter,
        teamFilter: teamFilter || undefined,
        sort,
        problemOnly,
        riskOnly,
      }),
    [round, level, classFilter, teamFilter, sort, problemOnly, riskOnly],
  )
  const page = useAsync(load)
  const data = page.data

  function changeLevel(v: HeatmapLevel) {
    setLevel(v)
    // 반이 바뀌면 팀 select가 달라지니, 팀까지 필요한 개인 단으로 직접 넘어올 때는
    // 항상 그 반의 첫 팀으로 다시 고른다(반을 그대로 두면 이전 팀이 다른 반 소속일
    // 수 있다).
    if (v === 'person') setTeamFilter('')
  }
  function changeClass(v: ClassName) {
    setClassFilter(v)
    setTeamFilter('')
  }
  function drillToTeam(cls: string) {
    setClassFilter(cls as ClassName)
    setTeamFilter('')
    setLevel('team')
  }
  function drillToPerson(cls: string, team: string) {
    setClassFilter(cls as ClassName)
    setTeamFilter(team)
    setLevel('person')
  }

  const crumb =
    `히트맵 › ${COHORT_NAME} › 담당 반` + (data?.crumb.length ? ' › ' + data.crumb.join(' › ') : '')

  return (
    <ConsoleShell role="manager">
      <PageHeader breadcrumb={crumb} title="히트맵" />

      <HeatmapToolbar
        round={round}
        level={level}
        classFilter={classFilter}
        teamFilter={data && data.level === 'person' ? teamFilter || data.teamFilter : teamFilter}
        teamOptions={data && data.level === 'person' ? data.teamOptions : []}
        sort={sort}
        problemOnly={problemOnly}
        riskOnly={riskOnly}
        onRoundChange={setRound}
        onLevelChange={changeLevel}
        onClassChange={changeClass}
        onTeamChange={setTeamFilter}
        onSortChange={setSort}
        onProblemOnlyChange={setProblemOnly}
        onRiskOnlyChange={setRiskOnly}
      />

      {page.loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="size-6" aria-label="히트맵을 불러오는 중" />
        </div>
      ) : page.failed ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>불러오지 못했습니다</EmptyTitle>
            <EmptyDescription>잠시 후 다시 시도해 주세요.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : data && data.round.resultStatus === 'PENDING' ? (
        <Empty className="min-h-70 border-dashed">
          <EmptyHeader className="max-w-md">
            <EmptyTitle>이 회차는 아직 결과가 없어요</EmptyTitle>
            <EmptyDescription>
              이해도 확인이 끝나면 여기에 표시됩니다.
              <br />
              지난 회차를 보려면 위에서 프로젝트를 바꾸세요.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        data && (
          <>
            <HeatmapLegend showLevelMeaning={data.level === 'person'} />
            <HeatmapTable
              result={data}
              onDrillTeam={drillToTeam}
              onDrillPerson={drillToPerson}
              traineePath={traineePath}
            />
            {data.round.isFirstRound && (
              <p className="mt-4 max-w-[920px] border-t border-border pt-4 text-xs text-fg-subtle">
                · <b className="font-semibold text-fg-muted">이번이 첫 회차입니다.</b> 비교할 지난
                회차가 없어 단계 하락은 판정하지 않습니다.
              </p>
            )}
          </>
        )
      )}
    </ConsoleShell>
  )
}
