import { useEffect, useState } from 'react'
import ConsoleShell from '@/shells/ConsoleShell'
import PageHeader from '@/components/common/PageHeader'
import { Button } from '@/components/ui/Button'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import { Spinner } from '@/components/ui/Spinner'
import { staleProps } from '@/lib/listQuery'
import { useManagerCohort } from '@/stores/cohortScope'
import { useHeatmap, useHeatmapRounds } from './_/api/api'
import type { AttemptView, HeatmapLevel } from './_/api/types'
import { getSessionView, setSessionView } from './viewState'
import HeatmapToolbar from './components/HeatmapToolbar'
import HeatmapLegend from './components/HeatmapLegend'
import HeatmapTable from './components/HeatmapTable'

/*
  MG-02 히트맵 — "개인 문제인가, 반 문제인가"(정의서 §1). 계층(반 › 팀 › 팀원)마다
  화면이 바뀐다(URL은 그대로다). 조립은 여기가, **집계·판정은 서버가** 갖는다 —
  목일 때는 `mockData.ts`가 평균과 집단 미달을 계산했다.

  **드릴다운은 두 갈래다** — 표의 행 클릭(아래로 한 단만) vs 툴바 버튼(어느 단으로든).
  버튼으로 팀·팀원에 들어가면 아직 반을 안 골랐을 수 있어 **서버가 준 첫 선택지**를
  기본값으로 둔다 — 서버가 `classroomId`를 필수로 요구하므로(400) 빈 채로 못 부른다.

  ⚠ **계층을 바꾸면 아래 스코프를 비운다.** 반이 바뀌면 이전 팀은 다른 반 소속일 수
  있고, 그대로 두면 서버가 400을 낸다.
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
  const [attemptView, setAttemptView] = useState<AttemptView>(initial.attemptView)

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
          attemptView,
          /* `CLASS`는 스코프가 없고, 그 아래는 서버가 필수로 요구한다 */
          classroomId: level === 'CLASS' ? undefined : classroomId || undefined,
          teamId: level === 'TRAINEE' ? teamId || undefined : undefined,
        }
      : undefined,
  )
  const view = heatmap.data

  /*
    스코프가 비어 있으면 **서버가 준 첫 선택지로 채운다.** 툴바 버튼으로 팀·팀원에
    바로 들어오면 반을 안 고른 상태인데, 그대로 부르면 400이다.
  */
  useEffect(() => {
    if (level !== 'CLASS' && !classroomId && view?.navigation.classrooms[0]) {
      setClassroomId(view.navigation.classrooms[0].classroomId)
    }
    if (level === 'TRAINEE' && !teamId && view?.navigation.teams[0]) {
      setTeamId(view.navigation.teams[0].teamId)
    }
  }, [level, classroomId, teamId, view])

  useEffect(() => {
    setSessionView({
      round: picked?.assessmentRoundId ?? '',
      level,
      classroomId,
      teamId,
      attemptView,
    })
  }, [picked, level, classroomId, teamId, attemptView])

  function changeLevel(next: HeatmapLevel) {
    setLevel(next)
    /* 위로 올라가면 아래 스코프는 뜻을 잃는다 — 비워서 서버 선택지로 다시 채운다 */
    if (next === 'CLASS') {
      setClassroomId('')
      setTeamId('')
    } else if (next === 'TEAM') {
      setTeamId('')
    }
  }

  function changeClass(next: string) {
    setClassroomId(next)
    setTeamId('') // 반이 바뀌면 이전 팀은 다른 반 소속이다
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
      cohort={cohortName ?? ''}
      cohorts={cohorts}
      onCohortChange={selectCohort}
    >
      {/* 있는 것만 잇는다 — 스코프가 오기 전 `히트맵 › › ` 가 되지 않게(MG-03과 같은 건) */}
      <PageHeader breadcrumb={crumb.join(' › ')} title="히트맵" />

      <HeatmapToolbar
        round={picked?.assessmentRoundId ?? ''}
        rounds={roundList}
        level={level}
        attemptView={attemptView}
        classroomId={view?.scope?.classroomId ?? classroomId}
        teamId={view?.scope?.teamId ?? teamId}
        navigation={view?.navigation ?? { classrooms: [], teams: [] }}
        onRoundChange={setRound}
        onLevelChange={changeLevel}
        onClassChange={changeClass}
        onTeamChange={setTeamId}
        onAttemptViewChange={setAttemptView}
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
      ) : rounds.isPending || heatmap.isPending ? (
        <div className="flex justify-center py-16">
          <Spinner className="size-6" aria-label="히트맵을 불러오는 중" />
        </div>
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
        /* 옛 값을 그리는 동안 그 사실을 숨기지 않는다 — `lib/listQuery` */
        <div {...staleProps(heatmap.isPlaceholderData)}>
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
        </div>
      )}
    </ConsoleShell>
  )
}
