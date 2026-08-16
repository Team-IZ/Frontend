import { useParams, useNavigate } from 'react-router'
import ConsoleShell from '@/shells/ConsoleShell'
import { Button } from '@/components/ui/Button'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import { Spinner } from '@/components/ui/Spinner'
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

  ⚠ **탭 배지에 쓸 값을 세 조회가 나눠 갖는다** — 팀 수는 제출 현황이(같은 담당 반
  모집단이다), 발행 여부는 결과가 준다. 배지 때문에 진입하자마자 셋을 다 부르는
  셈인데, 탭을 눌러야 부르면 배지가 나중에 채워져 숫자가 뛴다. 셋 다 담당 반
  스코프라 크기가 크지 않아 함께 읽는 쪽을 골랐다.
*/

type TabValue = 'team' | 'submission' | 'result'

function defaultTab(status: string): TabValue {
  if (status === 'CLOSED') return 'result'
  if (status === 'RUNNING') return 'submission'
  return 'team'
}

export default function ProjectDetailScreen() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { cohortName, cohorts, selectCohort } = useManagerCohort()

  const project = useProject(id)
  const submission = useSubmissionStatus(id)
  const classProgress = useClassProgress(id)
  const evaluation = useEvaluationSummary(id)

  const shell = (children: React.ReactNode) => (
    <ConsoleShell
      role="manager"
      cohort={cohortName ?? ''}
      cohorts={cohorts}
      onCohortChange={selectCohort}
    >
      {children}
    </ConsoleShell>
  )

  if (project.isPending) {
    return shell(
      <div className="flex justify-center py-16">
        <Spinner className="size-6" aria-label="회차를 불러오는 중" />
      </div>,
    )
  }

  if (project.isError || !project.data) {
    return shell(
      <Empty>
        <EmptyHeader>
          <EmptyTitle>회차를 찾을 수 없습니다</EmptyTitle>
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

      <Tabs defaultValue={defaultTab(p.status)}>
        <TabsList className="mb-4">
          <TabsTrigger value="team">
            팀{' '}
            <span className="text-fg-subtle ml-1 font-normal">
              {sub ? `${sub.summary.teamCount}팀` : '—'}
            </span>
          </TabsTrigger>
          <TabsTrigger value="submission">
            제출 현황{' '}
            <span className="text-fg-subtle ml-1 font-normal">
              {/* 잠김 판정은 서버 값 하나로 한다 — 단계 이름으로 다시 세지 않는다 */}
              {!sub
                ? '—'
                : sub.submissionOpened
                  ? `제출 ${sub.summary.submittedTeamCount}/${sub.summary.teamCount}`
                  : '잠김'}
            </span>
          </TabsTrigger>
          <TabsTrigger value="result">
            결과{' '}
            <span className="text-fg-subtle ml-1 font-normal">
              {!evaluation.data ? '—' : evaluation.data.reportPublished ? '발행 완료' : '발행 전'}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="team">
          <TeamTab projectId={id} stage={sub?.teamFormationStage} locked={sub?.locked ?? false} />
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
