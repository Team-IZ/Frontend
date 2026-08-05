import { useCallback } from 'react'
import { useParams, useNavigate } from 'react-router'
import ConsoleShell from '@/shells/ConsoleShell'
import { Button } from '@/components/ui/Button'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import { Spinner } from '@/components/ui/Spinner'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { useAsync } from '@/lib/useAsync'
import { PROJECTS, getProjectDetail } from './mockData'
import DetailHeader from './components/DetailHeader'
import TeamTab from './components/TeamTab'
import SubmissionTab from './components/SubmissionTab'
import ResultTab from './components/ResultTab'

/*
  MG-08 프로젝트 상세 — 이 파일은 조립만 한다(OP-04 ProjectDetailScreen과 같은 원칙,
  탭 내용은 각 컴포넌트가, 조회는 `mockData`가 갖는다).

  **`구성` 탭이 없다**(정의서 §3) — 교안·검증 개념·요구사항은 OP-04가 정하고
  여기선 헤더 한 줄로만 읽는다.

  탭 순서 자체가 회차 진행 순서(팀 편성 → 제출 현황 → 결과)라 그 순서를 강제하지
  않는다 — 3탭 다 항상 눌러볼 수 있고, 진입 시 기본 탭만 회차 상태를 따라간다
  (예정=팀 편성부터, 진행 중=제출 현황부터, 종료=결과부터).
*/

type TabValue = 'team' | 'submission' | 'result'

function defaultTab(status: 'PLANNED' | 'RUNNING' | 'DONE'): TabValue {
  if (status === 'DONE') return 'result'
  if (status === 'RUNNING') return 'submission'
  return 'team'
}

export default function ProjectDetailScreen() {
  const { id = '' } = useParams()
  const navigate = useNavigate()

  const project = PROJECTS.find((p) => p.id === id)
  const loadDetail = useCallback(() => getProjectDetail(id), [id])
  const detail = useAsync(loadDetail)

  if (!project) {
    return (
      <ConsoleShell role="manager">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>회차를 찾을 수 없습니다</EmptyTitle>
            <EmptyDescription>지워졌거나 주소가 잘못됐을 수 있습니다.</EmptyDescription>
          </EmptyHeader>
          <Button variant="ghost" onClick={() => navigate('/manager/projects')}>
            프로젝트 목록으로
          </Button>
        </Empty>
      </ConsoleShell>
    )
  }

  if (!detail.data) {
    return (
      <ConsoleShell role="manager">
        <DetailHeader project={project} />
        <div className="flex justify-center py-16">
          <Spinner className="size-6" aria-label="회차를 불러오는 중" />
        </div>
      </ConsoleShell>
    )
  }

  const d = detail.data
  const submittedCount = d.teams.filter((t) => d.submissions[t.id]?.submittedAt).length
  const submissionOpened = d.teamPhase === 'LOCKED' || d.teamPhase === 'SUBMITTING'

  return (
    <ConsoleShell role="manager">
      <DetailHeader project={project} />

      <Tabs defaultValue={defaultTab(project.status)}>
        <TabsList className="mb-4">
          <TabsTrigger value="team">
            팀 <span className="text-fg-subtle ml-1 font-normal">{d.teams.length}팀</span>
          </TabsTrigger>
          <TabsTrigger value="submission">
            제출 현황{' '}
            <span className="text-fg-subtle ml-1 font-normal">
              {submissionOpened ? `제출 ${submittedCount}/${d.teams.length}` : '잠김'}
            </span>
          </TabsTrigger>
          <TabsTrigger value="result">
            결과{' '}
            <span className="text-fg-subtle ml-1 font-normal">
              {!d.result ? '—' : d.result.reportPublished ? '발행 완료' : '발행 전'}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="team">
          <TeamTab projectId={id} detail={d} onReload={detail.reload} />
        </TabsContent>

        <TabsContent value="submission">
          <SubmissionTab projectId={id} detail={d} onReload={detail.reload} />
        </TabsContent>

        <TabsContent value="result">
          <ResultTab
            projectId={id}
            result={d.result}
            locked={d.locked}
            onReload={detail.reload}
            dueAt={project.dueAt}
          />
        </TabsContent>
      </Tabs>
    </ConsoleShell>
  )
}
