import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import ConsoleShell from '@/shells/ConsoleShell'
import { Alert, AlertTitle } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import ErrorState from '@/components/common/ErrorState'
import { SlowNotice } from '@/components/common/Loading'
import { Skeleton } from '@/components/ui/Skeleton'
import { ConfigSkeleton, OverviewSkeleton, StatusSkeleton } from './components/DetailSkeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import {
  getToday,
  useCohortScope,
  useConceptCandidates,
  useLinkableCurricula,
  useProjectDetail,
  useProjectList,
  useProjectStatus,
} from '../queries'
import { CONCEPT_COUNT } from '../rules'
import { useCohortId } from '@/stores/cohortScope'
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
  /*
    생성이 중간에 끊겨 넘어온 경우 — 무엇이 안 붙었는지를 여기서 말한다.
    **주소에 실어 온다**(`location.state`) — 스토어를 만들면 이 한 줄 때문에 전역 상태가
    생기고, 새로고침하면 사라지는 편이 맞다(이미 본 안내다).
  */
  const notice = (useLocation().state as { notice?: string } | null)?.notice
  /*
    상단 스위처 라벨용이다 — **조회에는 쓰지 않는다.**

    형제 회차·교안·기수 기간은 **이 회차가 속한 기수**(`data.cohortId`)로 부른다.
    한때 여기서 얻은 "지금 보고 있는 기수"로 불렀는데, 주소로 직접 들어오면
    (딥링크·새로고침·다른 기수 회차 링크) **화면이 두 기수를 섞어 보여준다** —
    10기 회차를 열었는데 9기의 교안 목록과 형제 회차를 조회했다. 렌더로 잡았다.
  */
  const { cohortName } = useCohortId()
  const [pickOpen, setPickOpen] = useState(false)
  const [curriculaOpen, setCurriculaOpen] = useState(false)
  const [requirementsOpen, setRequirementsOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const project = useProjectDetail(id)
  /*
    조회 기준은 **응답이 알려준 기수**다 — "지금 보고 있는 기수"로 부르면 주소로 직접
    들어왔을 때 화면이 두 기수를 섞는다.
  */
  const cohortId = project.data?.cohortId

  const data = project.data
  const requested = TABS.find((t) => t.value === tab)?.value
  const active = requested ?? DEFAULT_TAB

  /*
    **필요할 때만 부른다.** 탭이 안 잠기니 *"잠긴 탭은 안 부른다"* 는 근거가 사라졌다 —
    이제 기준은 **그 탭이 그 값을 실제로 그리나**다.

    `candidates`·`curricula`는 **개념 선택 모달을 열 때만** 부른다. 개념이 확정된 회차라고
    미리 부르면 개요만 보고 나가는 대부분의 경우에 쓰지 않을 조회가 둘 나간다.
    `siblings`는 마감이 있어야 재시험 창을 계산할 수 있으므로 그때만, `status`는 개념
    3건이 있어야 집계가 존재하므로 그때만.

    **교안 목록도 모달용이다.** 개요·구성 탭은 상세 응답이 준 교안 이름을 그리므로
    따로 조회할 필요가 없어졌다(9차 R1) — 후보를 교안별로 묶을 때만 이름표로 쓴다.
  */
  const status = useProjectStatus(id, active === 'status' && data?.conceptCount === CONCEPT_COUNT)
  const siblings = useProjectList(
    active === 'overview' && data?.endDate && cohortId ? { cohortId, sort: 'DUE' } : undefined,
  )
  const candidates = useConceptCandidates(id, pickOpen)
  /*
    **교안 목록은 두 모달이 같은 조회를 쓴다.** 개념 선택은 후보를 묶을 이름표로,
    교안 변경은 연결 가능한 전량으로 — 목적은 다르지만 응답이 같아서 캐시가 공유된다.
    한때 둘을 따로 불렀는데 같은 요청이 두 번 나갔다.
  */
  const curricula = useLinkableCurricula(cohortId, pickOpen || curriculaOpen)
  const cohort = useCohortScope(cohortId, scheduleOpen)

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
    if (project.isError) {
      /*
        **모든 실패를 "찾을 수 없습니다"로 쓰지 않는다.** 서버가 500을 주는 동안 주소가
        틀렸다고 말하면 사용자가 **없는 문제를 고치러 간다**(async-states §3-1).
        문구·재시도 여부는 `errorCopy`가 `status`·코드를 보고 정한다.
      */
      return (
        <ConsoleShell role="operator" cohort={cohortName ?? ''}>
          <ErrorState
            error={project.error}
            subject="회차"
            onRetry={() => project.refetch()}
            retrying={project.isFetching}
            action={
              <Button variant="ghost" onClick={() => navigate('/operator/projects')}>
                프로젝트 목록으로
              </Button>
            }
          />
        </ConsoleShell>
      )
    }
    /*
      **OP-01·02·03과 같이 스켈레톤이다.** 여기만 스피너로 남아 있었다 — 같은 콘솔
      안에서 기다리는 모양이 화면마다 다를 이유가 없다(async-states §1-2).

      **주소가 가리키는 탭의 모양으로** 그린다. 개요 자리에 현황 모양을 그리면 도착 순간
      구조가 통째로 바뀌어 스피너와 다를 것이 없다.

      **스피너를 같이 두지 않는다.** 스켈레톤이 이미 「기다려」를 말하고 있어서 밑에
      스피너가 또 돌면 어수선하기만 하다. 다만 12초를 넘기면 그 사실은 말해야 한다 —
      없는 회차는 서버가 404 대신 매단다(18차 R7).
    */
    const TabSkeleton =
      active === 'status' ? StatusSkeleton : active === 'config' ? ConfigSkeleton : OverviewSkeleton
    return (
      <ConsoleShell role="operator" cohort={cohortName ?? ''}>
        <div aria-hidden className="mb-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-7 w-52" />
          <div className="mt-5 flex gap-5">
            {TABS.map((t) => (
              <Skeleton key={t.value} className="h-4 w-9" />
            ))}
          </div>
        </div>
        <TabSkeleton />
        <SlowNotice />
      </ConsoleShell>
    )
  }

  /** 다음 회차 — 마감이 이번보다 뒤인 것 중 가장 이른 것(목록이 마감순으로 정렬돼 있다) */
  const next =
    siblings.data?.items.find(
      (p) =>
        p.projectId !== data.projectId && p.endDate && data.endDate && p.endDate > data.endDate,
    ) ?? null

  const goTab = (t: ProjectTab) => navigate(`/operator/projects/${id}/${t}`, { replace: true })

  return (
    <ConsoleShell role="operator" cohort={cohortName ?? ''}>
      <DetailHeader project={data} now={getToday()} />

      {notice && (
        <Alert variant="warning" className="mb-4">
          <AlertTitle>{notice}</AlertTitle>
        </Alert>
      )}

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
            now={getToday()}
            nextDueAt={next?.endDate ?? null}
            nextProjectName={next?.name ?? null}
            onEditSchedule={() => setScheduleOpen(true)}
            onGoConfig={() => goTab('config')}
          />
        </TabsContent>

        <TabsContent value="status">
          <StatusTab
            project={data}
            report={status.data}
            /*
              데이터 유무로 판정한다 — `enabled`가 조건부라 `isLoading`은 조회가 시작되기
              전에도 `false`다. 개념 미확정이면 `StatusTab`이 그 앞에서 반환하므로
              「영원히 로딩」이 되지 않는다.
            */
            loading={!status.data && !status.isError}
            failed={status.isError}
            onRetry={() => status.refetch()}
            onGoConfig={() => goTab('config')}
          />
        </TabsContent>

        <TabsContent value="config">
          <ConfigTab
            project={data}
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
        candidates={candidates.data ?? []}
        /*
          ⚠ `isLoading`은 **모달을 열기 전에도 false**다(`enabled: pickOpen`) — 조회가
          시작조차 안 했기 때문이다. 그러면 여는 순간 한 프레임 동안 「후보가 없습니다」가
          스친다. 판정은 **데이터 유무**로 한다(async-states §1-9).
        */
        loadingCandidates={!candidates.data && !candidates.isError}
        curricula={curricula.data ?? []}
      />

      <ChangeCurriculaDialog
        open={curriculaOpen}
        onOpenChange={setCurriculaOpen}
        project={data}
        curricula={curricula.data ?? []}
        loading={!curricula.data && !curricula.isError}
      />

      <EditRequirementsDialog
        open={requirementsOpen}
        onOpenChange={setRequirementsOpen}
        project={data}
      />

      <DeleteProjectDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        project={data}
        // 지워진 회차의 상세에 남아 있을 수 없다 — 뒤로 가기로 돌아오지 못하게 replace
        onDeleted={() => navigate('/operator/projects', { replace: true })}
      />

      <EditScheduleDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        project={data}
        cohort={cohort.data}
        nextDueAt={next?.endDate ?? null}
        nextProjectName={next?.name ?? null}
      />
    </ConsoleShell>
  )
}
