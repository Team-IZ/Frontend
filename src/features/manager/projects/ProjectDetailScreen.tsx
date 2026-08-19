import { useParams, useNavigate, useSearchParams } from 'react-router'
import ConsoleShell from '@/shells/ConsoleShell'
import { Button } from '@/components/ui/Button'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import { Skeleton } from '@/components/ui/Skeleton'
import TableSkeleton from '@/components/common/TableSkeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { useManagerCohort } from '@/stores/cohortScope'
import {
  useProject,
  useSubmissionStatus,
  useClassProgress,
  useEvaluationSummary,
} from './_/api/api'
import DetailHeader from './components/DetailHeader'
import TeamTab from './components/TeamTab'
import SubmissionTab from './components/SubmissionTab'
import ResultTab from './components/ResultTab'

/*
  MG-08 프로젝트 상세 — 이 파일은 조립만 한다(OP-04 ProjectDetailScreen과 같은 원칙,
  탭 내용은 각 컴포넌트가, 조회는 `_/api`가 갖는다).

  **`구성` 탭이 없다**(정의서 §3) — 교안·검증 개념·요구사항은 OP-04가 정하고
  여기선 헤더 한 줄로만 읽는다.

  탭 순서 자체가 회차 진행 순서(팀 편성 → 제출 현황 → 결과)라 그 순서를 강제하지
  않는다 — 3탭 다 항상 눌러볼 수 있고, 진입 시 기본 탭만 회차 상태를 따라간다.

  ⚠ **진입하자마자 조회 넷을 다 부른다.** 한때는 탭 배지 때문이었는데 배지는
  규칙 E대로 걷어냈다(아래). 그래도 함께 부르는 이유가 남는다.

    · 기본 탭이 **회차 상태에 따라 달라진다** — 어느 탭이든 즉시 열릴 수 있다
    · 팀 탭이 제출 현황의 `teamFormationStage`·`locked`를 **읽어야 액션을 정한다**
    · 넷 다 담당 반 스코프라 크기가 작다

  탭을 눌러야 부르게 하면 그때부터 5초를 기다린다 — 지금은 탭 전환이 즉시다.
*/

type TabValue = 'team' | 'submission' | 'result'
const TABS: TabValue[] = ['team', 'submission', 'result']

function defaultTab(status: string): TabValue {
  if (status === 'CLOSED') return 'result'
  if (status === 'RUNNING') return 'submission'
  return 'team'
}

export default function ProjectDetailScreen() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { cohortId, cohortName, cohorts, selectCohort } = useManagerCohort()

  const project = useProject(id)
  const submission = useSubmissionStatus(id)
  const classProgress = useClassProgress(id)
  const evaluation = useEvaluationSummary(id)

  const shell = (children: React.ReactNode) => (
    <ConsoleShell
      role="manager"
      cohort={cohortId ?? ''}
      cohorts={cohorts}
      onCohortChange={selectCohort}
    >
      {children}
    </ConsoleShell>
  )

  if (!project.data && !project.isError) {
    /*
      실측 — 머리 56 + mb 16 · 탭 줄 36.6 + mb 16 = 109px.

      **본문 자리까지 잡는다.** 처음엔 머리와 탭 줄만 그렸는데, 회차가 도착하는 순간
      `109 → 518·703·1584`로 튀었다(탭마다). 어느 탭이 기본인지는 `status`를 받아야
      알아서 여기서는 정할 수 없으므로, **표 여덟 줄**로 「표가 온다」까지만 말한다 —
      정확히는 못 맞춰도 100px대에서 뛰는 것보다 낫다. 탭이 열리고 나면 각 탭이
      자기 실측 자리를 그린다.
    */
    return shell(
      <div aria-hidden>
        <div className="mb-4 flex h-[56px] flex-col justify-center gap-2">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-3 w-80" />
        </div>
        <div className="mb-4 flex h-[36.6px] items-center gap-4">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-10" />
        </div>
        <TableSkeleton
          rows={8}
          cols={['w-[22%]', 'w-[14%]', null, 'w-[12%]', 'w-[16%]']}
          rowH={47}
          footerH={0}
        />
      </div>,
    )
  }

  if (project.isError || !project.data) {
    return shell(
      <Empty>
        <EmptyHeader>
          <EmptyTitle>프로젝트를 찾을 수 없습니다</EmptyTitle>
          <EmptyDescription>지워졌거나 주소가 잘못됐을 수 있습니다.</EmptyDescription>
        </EmptyHeader>
        <Button variant="ghost" onClick={() => navigate('/manager/projects')}>
          프로젝트 목록으로
        </Button>
      </Empty>,
    )
  }

  const p = project.data
  const sub = submission.data
  const cp = classProgress.data

  /* 담당 반 문구 — 반 이름과 인원 모두 서버가 준다(목은 상수로 박아 뒀다) */
  const classScope = cp
    ? `${cp.classes.map((c) => c.className).join('·')} · ${cp.summary.targetTraineeCount}명`
    : undefined

  return shell(
    <>
      <DetailHeader project={p} classScope={classScope} />

      {/*
        **탭은 주소가 갖는다**(화면 규칙 J) — 새로고침·뒤로가기가 따라오고, 다른 화면이
        「이 프로젝트의 결과 탭」으로 보낼 수 있다. `?tab=`이 없거나 모르는 값이면 프로젝트 상태가
        고르는 기본 탭으로 떨어진다(남이 보낸 링크가 낡았을 수 있다).

        `replace`로 바꾼다 — 탭을 다섯 번 누르고 뒤로가기를 다섯 번 하게 만들지 않는다.
      */}
      <Tabs
        value={
          TABS.includes(params.get('tab') as TabValue) ? params.get('tab')! : defaultTab(p.status)
        }
        onValueChange={(v) =>
          setParams(
            (prev) => {
              const next = new URLSearchParams(prev)
              next.set('tab', String(v))
              return next
            },
            { replace: true },
          )
        }
      >
        {/*
          🔴 **탭 이름 옆에 숫자를 두지 않는다**(화면 규칙 E). 조회가 도착해야 아는 값인데
          탭 줄은 진입 즉시 그려진다 — `—`로 메웠다가 값이 오면 탭 폭이 **8 · 34 · 38px**
          씩 늘어난다(실측 · 총 80px). 눌러야 할 것이 옆으로 미끄러진다.

          그 수는 **탭을 열면 머리가 크게 말한다** — 셋 다 이미 그렇게 하고 있다.

            팀        「편성 전 · 6팀 · 미배정 0명」
            제출 현황 「제출 6/6팀 · 분석 실패 1팀」
            결과      「프로젝트 종합 · 발행 완료」
        */}
        <TabsList className="mb-4">
          <TabsTrigger value="team">팀</TabsTrigger>
          <TabsTrigger value="submission">제출 현황</TabsTrigger>
          <TabsTrigger value="result">결과</TabsTrigger>
        </TabsList>

        <TabsContent value="team">
          {/*
            ⚠ **`?? false` · `?? 0`으로 메우지 않는다**(규칙 E). 제출 현황은 팀 목록보다
            늦게 오는데, 그 사이 `locked`를 `false`로 두면 **종료된 프로젝트에서 3.8초 동안
            [팀 추가]·[자동 배분]이 열려 있었다**(실측). `undefined`를 그대로 넘기고
            모르는 동안에는 `TeamTab`이 액션 줄을 안 그린다.
          */}
          <TeamTab
            projectId={id}
            stage={sub?.teamFormationStage}
            locked={sub?.locked}
            submittedTeamCount={sub?.summary.submittedTeamCount}
          />
        </TabsContent>

        <TabsContent value="submission">
          <SubmissionTab query={submission} classProgress={cp} />
        </TabsContent>

        <TabsContent value="result">
          <ResultTab projectId={id} query={evaluation} />
        </TabsContent>
      </Tabs>
    </>,
  )
}
