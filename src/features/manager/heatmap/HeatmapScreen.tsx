import { useEffect, useState } from 'react'
import ConsoleShell from '@/shells/ConsoleShell'
import PageHeader from '@/components/common/PageHeader'
import { Button } from '@/components/ui/Button'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import StaleBlock from '@/components/common/StaleBlock'
import { useManagerCohort } from '@/stores/cohortScope'
import { useHeatmap, useHeatmapRounds } from './_/api/api'
import type { HeatmapLevel, ScopeOption } from './_/api/types'
import { getSessionView, setSessionView } from './viewState'
import HeatmapToolbar from './components/HeatmapToolbar'
import HeatmapLegend from './components/HeatmapLegend'
import HeatmapTable from './components/HeatmapTable'
import HeatmapSkeleton from './components/HeatmapSkeleton'

/*
  MG-02 히트맵 — "개인 문제인가, 반 문제인가"(정의서 §1). 계층(반 › 팀 › 팀원)마다
  화면이 바뀐다(URL은 그대로다). 조립은 여기가, **집계·판정은 서버가** 갖는다 —
  목일 때는 `mockData.ts`가 평균과 집단 미달을 계산했다.

  **드릴다운은 두 갈래다** — 표의 행 클릭(아래로 한 단만) vs 툴바 버튼(어느 단으로든).
  버튼으로 내려갈 때는 **스코프를 먼저 채우고** 계층을 바꾼다. 서버가 `TEAM`에 반을,
  `TRAINEE`에 반과 팀을 필수로 요구해서(400) 빈 채로는 못 부른다.

  ⚠ **스코프를 언제 비우나** — 셋 다 하드닝 실측에서 정해졌다.
  · 계층을 올리면 아래 스코프는 뜻을 잃는다
  · 반을 바꾸면 이전 팀은 다른 반 소속이다(400)
  · **회차를 바꾸면 팀은 뜻을 잃는다** — 팀은 프로젝트에 매인다. 이건 400도 아니라
    200 + 빈 결과가 와서, 안 비우면 화면이 「결과 없음」이라고 거짓말한다
*/
const traineePath = (id: string) => `/manager/trainees/${id}`

export default function HeatmapScreen() {
  const { cohortId, cohortName, failed: cohortFailed, cohorts, selectCohort } = useManagerCohort()

  // 개인 히트맵 → 교육생 상세 → 뒤로가기로 돌아왔을 때 같은 화면(같은 반·팀·회차)을
  // 다시 보여주기 위해 초기값을 세션에서 복원한다(viewState.ts, 사용자 지시).
  const initial = getSessionView()
  const [round, setRound] = useState(initial.round)
  const [level, setLevel] = useState<HeatmapLevel>(initial.level)
  const [classroomId, setClassroomId] = useState(initial.classroomId)
  const [teamId, setTeamId] = useState(initial.teamId)
  /* 본 적 있는 반·팀 — 아래 `useEffect` 주석 참고 */
  const [knownClassrooms, setKnownClassrooms] = useState<ScopeOption[]>([])
  const [knownTeams, setKnownTeams] = useState<ScopeOption[]>([])

  const rounds = useHeatmapRounds(cohortId)
  const roundList = rounds.data ?? []
  /* 서버가 준 마지막 회차를 기본으로 — 회차가 늘어도 안 깨진다 */
  const picked =
    roundList.find((r) => r.assessmentRoundId === round) ?? roundList[roundList.length - 1]

  const heatmap = useHeatmap(
    cohortId && picked
      ? {
          cohortId,
          projectId: picked.projectId,
          assessmentRoundId: picked.assessmentRoundId,
          level,
          /* `CLASS`는 스코프가 없고, 그 아래는 서버가 필수로 요구한다 */
          classroomId: level === 'CLASS' ? undefined : classroomId || undefined,
          teamId: level === 'TRAINEE' ? teamId || undefined : undefined,
        }
      : undefined,
  )
  const view = heatmap.data

  /*
    스켈레톤을 **직전에 본 격자 모양**으로 그린다 — 개념 수·행 수가 계층마다 달라
    고정값으로 두면 도착할 때 그만큼 튄다(스켈레톤을 쓰는 이유가 없어진다).
  */
  const [lastCols, setLastCols] = useState(3)
  const [lastRows, setLastRows] = useState(2)

  /*
    🔴 **본 계층의 `rows[]`도 선택지다**(하드닝 실측에서 잡았다).

    `navigation`은 **지금 계층보다 위**의 선택지만 준다 — `CLASS`에서는 통째로 비어
    온다. 아래 단계 항목은 `rows[]`에 있고 그 `rowId`가 곧 `classroomId`·`teamId`다.

    이걸 몰라서 툴바 「팀」·「팀원」 버튼이 **400에서 빠져나오지 못했다.** 계층만
    바꾸면 스코프가 빈 채로 나가 `HEATMAP_SCOPE_INVALID`가 되고, 채울 값을 빈
    `navigation`에서 찾으니 영영 안 채워진다. 실측:

        level=TEAM     반 없이  → 400 HEATMAP_SCOPE_INVALID
        level=TRAINEE  팀 없이  → 400 (반만으로는 부족하다)

    그래서 **본 것을 기억한다.** 반·팀 목록은 자주 바뀌지 않고, 계층을 오갈 때마다
    다시 받을 수도 없다(그 요청이 바로 스코프를 요구한다).
  */
  useEffect(() => {
    if (!view) return
    setLastCols(view.concepts.length || 3)
    setLastRows((view.summary ? 1 : 0) + view.rows.length || 2)
    const fromRows = view.rows
      .filter((r) => r.rowId)
      .map((r) => ({ id: r.rowId!, name: r.rowName ?? '', memberCount: r.memberCount }))

    if (view.level === 'CLASS') {
      setKnownClassrooms(fromRows)
    } else if (view.level === 'TEAM') {
      setKnownTeams(fromRows)
      if (view.navigation.classrooms.length > 0) {
        setKnownClassrooms(
          view.navigation.classrooms.map((c) => ({
            id: c.classroomId,
            name: c.classroomName,
            memberCount: c.memberCount,
          })),
        )
      }
    }
  }, [view])

  useEffect(() => {
    setSessionView({
      round: picked?.assessmentRoundId ?? '',
      level,
      classroomId,
      teamId,
    })
  }, [picked, level, classroomId, teamId])

  /**
   * 계층 버튼 — **내려갈 때는 스코프를 먼저 채우고 바꾼다.** 비운 채 바꾸면 400이다.
   *
   * `TRAINEE`는 반과 팀이 둘 다 있어야 하는데, 팀 목록은 `TEAM` 계층을 한 번
   * 봐야 생긴다 — 아직 모르면 그 버튼을 잠그고 왜인지 말한다(툴바). 여기서
   * 임의로 `TEAM`에 내려놓으면 사용자가 누른 것과 다른 화면이 뜬다.
   */
  function changeLevel(next: HeatmapLevel) {
    if (next === 'CLASS') {
      setClassroomId('')
      setTeamId('')
    } else {
      const cls = classroomId || knownClassrooms[0]?.id
      if (!cls) return
      setClassroomId(cls)
      if (next === 'TEAM') {
        setTeamId('')
      } else {
        const team = teamId || knownTeams[0]?.id
        if (!team) return
        setTeamId(team)
      }
    }
    setLevel(next)
  }

  /**
   * 반을 바꾸면 이전 팀은 **다른 반 소속**이라 못 쓴다.
   *
   * 그래서 `TRAINEE`에 머물 수 없다 — 새 반의 팀 목록을 아직 모르고, 그걸 알려면
   * 그 반의 `TEAM` 격자를 한 번 받아야 한다. 빈 팀으로 밀어 넣으면 400이다.
   */
  function changeClass(next: string) {
    setClassroomId(next)
    setTeamId('')
    setKnownTeams([])
    if (level === 'TRAINEE') setLevel('TEAM')
  }

  /**
   * 회차를 바꾸면 **팀은 뜻을 잃는다** — 팀은 프로젝트에 매인 것이라 회차마다 다시
   * 짠다. 반은 기수 소속이라 그대로 쓴다.
   *
   * 🔴 이걸 안 비우면 **화면이 거짓말을 한다.** 다른 회차의 `teamId`를 넣어도 서버가
   * 400이 아니라 **200 + 빈 결과**를 준다(하드닝 실측) — 그러면 화면이 「이 범위에는
   * 아직 결과가 없습니다」라고 말하는데, 사실은 그 팀이 이 회차에 없는 것이다.
   */
  function changeRound(next: string) {
    setRound(next)
    setTeamId('')
    setKnownTeams([])
    if (level === 'TRAINEE') setLevel('TEAM')
  }

  /** 행을 눌러 한 단 내려간다 */
  function drill(rowId: string) {
    if (level === 'CLASS') {
      setClassroomId(rowId)
      setTeamId('')
      setLevel('TEAM')
    } else if (level === 'TEAM') {
      setTeamId(rowId)
      setLevel('TRAINEE')
    }
  }

  const crumb = ['히트맵', cohortName, view?.scope?.classroomName, view?.scope?.teamName].filter(
    Boolean,
  )

  return (
    <ConsoleShell
      role="manager"
      cohort={cohortId ?? ''}
      cohorts={cohorts}
      onCohortChange={selectCohort}
    >
      {/* 있는 것만 잇는다 — 스코프가 오기 전 `히트맵 › › ` 가 되지 않게(MG-03과 같은 건) */}
      <PageHeader breadcrumb={crumb.join(' › ')} title="히트맵" />

      <HeatmapToolbar
        round={picked?.assessmentRoundId ?? ''}
        rounds={roundList}
        level={level}
        classroomId={view?.scope?.classroomId ?? classroomId}
        teamId={view?.scope?.teamId ?? teamId}
        classrooms={knownClassrooms}
        teams={knownTeams}
        onRoundChange={changeRound}
        onLevelChange={changeLevel}
        onClassChange={changeClass}
        onTeamChange={setTeamId}
      />

      {cohortFailed ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>담당 기수가 없습니다</EmptyTitle>
            <EmptyDescription>
              반 배정이 끝나면 여기에 담당 반의 도달 현황이 나타납니다.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : !view && !heatmap.isError && !rounds.isError ? (
        /*
          🔴 **첫 진입은 스켈레톤이다**(화면 규칙 E · async-states §1-2). 스피너 자리
          128px와 실제 격자 181px이 달라 도착하는 순간 본문이 튀었다.

          ⚠ **`isPending`으로 판정하지 않는다** — 회차를 아직 못 받아 `enabled: false`인
          동안 `isPending`이 거짓이라 그 분기가 안 그려지고, 빈 화면이 잠깐 스친다.
          **값이 있나 없나**로 가른다.
        */
        <HeatmapSkeleton cols={lastCols} rows={lastRows} />
      ) : rounds.isError || heatmap.isError || !view ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>불러오지 못했습니다</EmptyTitle>
            <EmptyDescription>잠시 후 다시 시도해 주세요.</EmptyDescription>
          </EmptyHeader>
          <Button variant="ghost" onClick={() => void heatmap.refetch()}>
            다시 시도
          </Button>
        </Empty>
      ) : view.concepts.length === 0 ? (
        /*
          열이 하나도 없으면 그릴 격자가 없다 — 아직 문항이 만들어지지 않은 회차다.
          `rows`가 비는 것과 다른 상태라 문구를 가른다.
        */
        <Empty className="min-h-70 border-dashed">
          <EmptyHeader className="max-w-md">
            <EmptyTitle>이 회차는 아직 결과가 없어요</EmptyTitle>
            <EmptyDescription>
              이해도 확인이 끝나면 여기에 표시됩니다.
              <br />
              지난 회차를 보려면 위에서 회차를 바꾸세요.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        /*
          🔴 **조건을 바꾸는 동안 흐림만 두지 않는다**(화면 규칙 E). 회차·계층을 바꾸면
          2~3초가 걸리는데, 그동안 툴바는 새 조건을 말하고 격자는 옛 조건의 결과를
          보여준다 — 흐림은 그것을 설명하지 못한다. `StaleBlock`이 덮고·못 누르게 하고·
          「불러오는 중」이라고 말한다(옛 행을 눌러 다른 팀으로 내려가는 사고도 막는다).
        */
        <StaleBlock stale={heatmap.isPlaceholderData} label="격자를 불러오는 중">
          <HeatmapLegend showLevelMeaning={view.level === 'TRAINEE'} />
          <HeatmapTable
            view={view}
            onDrill={view.level === 'TRAINEE' ? undefined : drill}
            traineePath={traineePath}
          />
          {view.asOfAt && (
            <p className="mt-4 text-xs text-fg-subtle">
              · {view.asOfAt.slice(0, 10)} 기준 집계입니다. 회차마다 검증 개념도 과제도 달라 단계를
              회차 간에 그대로 견주지 않습니다.
            </p>
          )}
        </StaleBlock>
      )}
    </ConsoleShell>
  )
}
