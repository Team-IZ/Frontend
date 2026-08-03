import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import ConsoleShell from '@/shells/ConsoleShell'
import { Button } from '@/components/ui/Button'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import { Spinner } from '@/components/ui/Spinner'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import {
  getCohortScope,
  getConceptHistory,
  getProject,
  getProjectStatus,
  getToday,
  listCurricula,
  listProjects,
} from '../api'
import { CONCEPT_COUNT } from '../rules'
import { useAsync } from '../useAsync'
import { COHORT_ID } from '../cohortScope'
import type { ProjectTab } from '../types'
import DetailHeader from './components/DetailHeader'
import OverviewTab from './components/OverviewTab'
import StatusTab from './components/StatusTab'
import ConfigTab from './components/ConfigTab'
import PickConceptsDialog from './components/PickConceptsDialog'
import ChangeCurriculaDialog from './components/ChangeCurriculaDialog'
import EditRequirementsDialog from './components/EditRequirementsDialog'
import EditScheduleDialog from './components/EditScheduleDialog'
import DeleteProjectDialog from './components/DeleteProjectDialog'

/*
  OP-04 프로젝트 상세 — 이 회차를 **무엇으로 잴지** 정하고, 그 선택이 맞았는지 확인한다.

  **탭을 잠그지 않는다.** 정의서 §6은 검증 개념 3건 전까지 일정·현황을 잠그라고 했지만,
  잠긴 탭은 **왜 잠겼는지도 어떻게 열리는지도 말하지 못한다** — 체크리스트 C1이 금지한
  게이팅과 같은 문제다. 대신 **각 탭이 자기가 왜 비었는지**를 쓰고, 기다려도 안 채워지는
  것에는 다음 행동을 붙인다(02-layout §4의 `아직`/`없음` 구분).

  **탭 순서가 읽는 순서다** — 개요(무엇인가) → 현황(굴러가나) → 구성(무엇을 바꾸나).
  들어오면 개요가 먼저 보이므로 *"무엇이 비었는지"* 가 탭을 열기 전에 읽힌다.

  **이 파일은 조립만 한다.** 탭 내용은 각 컴포넌트가, 조회는 `api`가 갖는다.
*/
const TABS: { value: ProjectTab; label: string }[] = [
  { value: 'overview', label: '개요' },
  { value: 'status', label: '현황' },
  { value: 'config', label: '구성' },
]

const DEFAULT_TAB: ProjectTab = 'overview'

export default function ProjectDetailScreen() {
  const { id = '', tab } = useParams()
  const navigate = useNavigate()
  const [pickOpen, setPickOpen] = useState(false)
  const [curriculaOpen, setCurriculaOpen] = useState(false)
  const [requirementsOpen, setRequirementsOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const loadProject = useCallback(() => getProject(id), [id])
  const loadCurricula = useCallback(() => listCurricula(COHORT_ID), [])
  const loadHistory = useCallback(() => getConceptHistory(id), [id])
  const loadStatus = useCallback(() => getProjectStatus(id), [id])
  // 재시험 창이 다음 회차 제출일을 참조한다 — 목록에서 그 값을 찾는다
  const loadSiblings = useCallback(() => listProjects({ cohortId: COHORT_ID, sort: 'DUE' }), [])
  // 기수 기간은 일정 수정 달력만 쓴다 — 열기 전에는 부르지 않는다(#64 ②)
  const loadCohort = useCallback(() => getCohortScope(COHORT_ID), [])

  const project = useAsync(loadProject)
  const curricula = useAsync(loadCurricula)

  const data = project.data
  const requested = TABS.find((t) => t.value === tab)?.value
  const active = requested ?? DEFAULT_TAB

  /*
    **필요할 때만 부른다.** 탭이 안 잠기니 *"잠긴 탭은 안 부른다"* 는 근거가 사라졌다 —
    이제 기준은 **그 탭이 그 값을 실제로 그리나**다.

    `history`는 **모달을 열 때만** 부른다. 개념이 확정된 회차라고 미리 부르면 개요만 보고
    나가는 대부분의 경우에 쓰지 않을 조회가 나간다. `siblings`는 마감이 있어야 재시험 창을
    계산할 수 있으므로 그때만, `status`는 개념 3건이 있어야 집계가 존재하므로 그때만.
  */
  const status = useAsync(
    loadStatus,
    active === 'status' && data?.concepts.length === CONCEPT_COUNT,
  )
  const siblings = useAsync(loadSiblings, active === 'overview' && !!data?.dueAt)
  const history = useAsync(loadHistory, pickOpen)
  const cohort = useAsync(loadCohort, scheduleOpen)

  /*
    모르는 탭으로 들어오면 **주소도** 되돌린다. 내용만 개요로 바꾸면 주소는 `/bogus`인데
    화면은 개요라 어긋난 채 남고, 이미 활성인 탭을 눌러도 `onValueChange`가 안 와서
    스스로 안 고쳐진다. 탭이 아예 없는 주소(`/projects/:id`)는 그대로 둔다 — 정상 진입이다.
  */
  useEffect(() => {
    if (!tab || requested) return
    navigate(`/operator/projects/${id}/${DEFAULT_TAB}`, { replace: true })
  }, [tab, requested, id, navigate])

  /*
    조기 반환이 조회 **뒤**에 온다 — 훅은 조건부로 부를 수 없으므로(rules-of-hooks)
    `enabled`로 실행 여부를 넘기고 반환은 그다음에 한다.
  */
  if (!data) {
    if (project.failed) {
      return (
        <ConsoleShell role="operator">
          <Empty>
            <EmptyHeader>
              <EmptyTitle>회차를 찾을 수 없습니다</EmptyTitle>
              <EmptyDescription>지워졌거나 주소가 잘못됐을 수 있습니다.</EmptyDescription>
            </EmptyHeader>
            <Button variant="ghost" onClick={() => navigate('/operator/projects')}>
              프로젝트 목록으로
            </Button>
          </Empty>
        </ConsoleShell>
      )
    }
    return (
      <ConsoleShell role="operator">
        <div className="flex justify-center py-16">
          <Spinner className="size-6" aria-label="회차를 불러오는 중" />
        </div>
      </ConsoleShell>
    )
  }

  /** 다음 회차 — 마감이 이번보다 뒤인 것 중 가장 이른 것(목록이 마감순으로 정렬돼 있다) */
  const next =
    siblings.data?.items.find(
      (p) => p.id !== data.id && p.dueAt && data.dueAt && p.dueAt > data.dueAt,
    ) ?? null

  const goTab = (t: ProjectTab) => navigate(`/operator/projects/${id}/${t}`, { replace: true })

  return (
    <ConsoleShell role="operator">
      <DetailHeader project={data} now={getToday()} />

      <Tabs value={active} onValueChange={(v) => goTab(v as ProjectTab)}>
        <TabsList className="mb-4">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab
            project={data}
            curricula={curricula.data ?? []}
            now={getToday()}
            nextDueAt={next?.dueAt ?? null}
            nextProjectName={next?.name ?? null}
            onEditSchedule={() => setScheduleOpen(true)}
          />
        </TabsContent>

        <TabsContent value="status">
          <StatusTab
            project={data}
            report={status.data}
            loading={status.loading}
            failed={status.failed}
            onRetry={status.reload}
            onGoConfig={() => goTab('config')}
          />
        </TabsContent>

        <TabsContent value="config">
          <ConfigTab
            project={data}
            curricula={curricula.data ?? []}
            onPickConcepts={() => setPickOpen(true)}
            onChangeCurricula={() => setCurriculaOpen(true)}
            onEditRequirements={() => setRequirementsOpen(true)}
            onDelete={() => setDeleteOpen(true)}
          />
        </TabsContent>
      </Tabs>

      <PickConceptsDialog
        open={pickOpen}
        onOpenChange={setPickOpen}
        project={data}
        curricula={curricula.data ?? []}
        history={history.data ?? []}
        onSaved={project.reload}
      />

      <ChangeCurriculaDialog
        open={curriculaOpen}
        onOpenChange={setCurriculaOpen}
        project={data}
        curricula={curricula.data ?? []}
        onSaved={project.reload}
      />

      <EditRequirementsDialog
        open={requirementsOpen}
        onOpenChange={setRequirementsOpen}
        project={data}
        onSaved={project.reload}
      />

      <DeleteProjectDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        project={data}
        curricula={curricula.data ?? []}
        // 지워진 회차의 상세에 남아 있을 수 없다 — 뒤로 가기로 돌아오지 못하게 replace
        onDeleted={() => navigate('/operator/projects', { replace: true })}
      />

      <EditScheduleDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        project={data}
        cohort={cohort.data}
        nextDueAt={next?.dueAt ?? null}
        nextProjectName={next?.name ?? null}
        onSaved={() => {
          project.reload()
          // 마감이 바뀌면 다음 회차 판정(재시험 창)도 다시 계산해야 한다
          siblings.reload()
        }}
      />
    </ConsoleShell>
  )
}
