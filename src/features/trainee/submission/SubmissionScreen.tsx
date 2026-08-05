import { useCallback, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/Empty'
import { Spinner } from '@/components/ui/Spinner'
import { formatDateTime } from '@/lib/format'
import { useAsync } from '@/lib/useAsync'
import ConsoleShell from '@/shells/ConsoleShell'
import { getSubmission, submitCode } from './api'
import { buildStateBanner } from './labels'
import StateBanner from './components/StateBanner'
import SubmissionForm from './components/SubmissionForm'
import SubmittedContentCard from './components/SubmittedContentCard'
import type { SubmissionView, SubmitInput } from './types'

/*
  TR-02 코드 제출 — 레포를 내고 분석이 끝날 때까지의 상태를 본다.

  `#page-closed`가 `#page-locked`를 복붙한 목업 버그를 케이스표 기준으로 고쳐서
  구현했다(types.ts 머리 주석). SUBMISSION_CLOSED는 폼·카드 없이 안내만 — TR-01
  `missed`와 같은 모양이다.

  제출 후 다음 상태로의 전환은 실제 서버 없이 로컬에서 흉내낸다(design-checklist I1
  "누르면 결과를 같이 그린다"). 연동 시 이 낙관적 전환 로직은 지우고 `page.reload()`만
  남는다 — 실제로는 서버가 분석 상태를 갖고 있다.
*/

const PREVIEW_STATUSES = new Set<SubmissionView['status'] | 'ERROR'>([
  'DRAFT',
  'ANALYZING',
  'READY',
  'LOCKED',
  'ANALYSIS_FAILED',
  'SUBMISSION_CLOSED',
  'ERROR',
])

export default function SubmissionScreen() {
  const [searchParams] = useSearchParams()
  const stateParam = searchParams.get('state')?.toUpperCase()
  const previewStatus =
    stateParam && PREVIEW_STATUSES.has(stateParam as SubmissionView['status'])
      ? (stateParam as SubmissionView['status'] | 'ERROR')
      : undefined

  const load = useCallback(() => getSubmission(previewStatus), [previewStatus])
  const page = useAsync(load)

  const [override, setOverride] = useState<SubmissionView | null>(null)
  const [resubmitting, setResubmitting] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const view = override ?? page.data

  const handleSubmit = async (input: SubmitInput) => {
    if (!view) return
    setSubmitting(true)
    await submitCode(input)
    setSubmitting(false)
    setResubmitting(false)
    // ponytail: ZIP 제출의 "제출한 내용" 표시 형태는 기획에 없다 — 저장소·브랜치 형태를
    // 그대로 빌려 쓴다. 실제 API 문서가 정해지면 이 합성 로직을 지운다.
    const content =
      input.method === 'GITHUB'
        ? {
            repoUrl: input.repoUrl,
            branch: input.branch,
            lastCommit: {
              sha: '방금 제출됨',
              message: '분석 대기 중',
              at: formatDateTime(new Date().toISOString()),
            },
          }
        : {
            repoUrl: `ZIP · ${input.file.name}`,
            branch: '-',
            lastCommit: {
              sha: '-',
              message: 'ZIP 업로드',
              at: formatDateTime(new Date().toISOString()),
            },
          }
    setOverride({
      status: 'ANALYZING',
      roundLabel: view.roundLabel,
      submissionDueAt: view.submissionDueAt,
      submittedAt: new Date().toISOString(),
      content,
    })
  }

  return (
    <ConsoleShell role="trainee">
      {/*
        TR-01과 같은 860px — 목업은 홈 860 · 제출 620으로 서로 다르게 그렸지만(폼은
        좁게, 읽기는 넓게가 원 원칙), 실제로 나란히 써 보면 한 플로우(홈→제출→홈) 안에서
        폭이 화면마다 바뀌는 게 더 어색하다. 제출 폼의 입력칸(저장소 URL·브랜치)은
        한두 줄이라 넓어져도 가독성 손해가 없어 홈 쪽 값으로 맞춘다.
      */}
      <div className="mx-auto flex max-w-[860px] flex-col gap-4">
        {/* flex-col 부모의 stretch 기본값 때문에 클릭 영역이 컨테이너 전체 폭으로 늘어나
            있었다(시각적으로는 안 보이지만 호버·포커스 영역이 실제 텍스트보다 훨씬 넓음) */}
        <Link to="/trainee/home" className="self-start text-sm text-fg-subtle hover:underline">
          ← 홈
        </Link>

        {page.loading ? (
          <div className="flex justify-center py-16">
            <Spinner className="size-6" aria-label="제출 현황을 불러오는 중" />
          </div>
        ) : page.failed || !view ? (
          <Empty className="border-solid bg-danger-soft border-danger-border">
            <EmptyHeader>
              <EmptyTitle>제출 현황을 불러오지 못했습니다</EmptyTitle>
              <EmptyDescription>잠시 후 다시 시도해 주세요.</EmptyDescription>
            </EmptyHeader>
            <Button variant="ghost" onClick={page.reload}>
              다시 시도
            </Button>
          </Empty>
        ) : (
          <SubmissionBody
            view={view}
            resubmitting={resubmitting}
            submitting={submitting}
            onResubmitClick={() => setResubmitting(true)}
            onCancelResubmit={() => setResubmitting(false)}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </ConsoleShell>
  )
}

function SubmissionBody({
  view,
  resubmitting,
  submitting,
  onResubmitClick,
  onCancelResubmit,
  onSubmit,
}: {
  view: SubmissionView
  resubmitting: boolean
  submitting: boolean
  onResubmitClick: () => void
  onCancelResubmit: () => void
  onSubmit: (input: SubmitInput) => void
}) {
  // 재제출 폼을 펴면 "분석이 끝났어요" 성공 배너를 감춘다 — 지금 하려는 일(다시 제출)과
  // 반대되는 메시지("시작하세요")가 폼 위에 그대로 남으면 서로 부딪힌다.
  const banner = resubmitting ? null : buildStateBanner(view)

  return (
    <>
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-bold">{view.roundLabel} 코드 제출</h1>
        <DueLabel view={view} />
      </header>

      {banner && <StateBanner {...banner} />}

      {view.status === 'DRAFT' && <SubmissionForm submitting={submitting} onSubmit={onSubmit} />}

      {view.status === 'ANALYSIS_FAILED' && (
        <SubmissionForm
          submitting={submitting}
          onSubmit={onSubmit}
          initial={{ repoUrl: view.content.repoUrl, branch: view.content.branch }}
        />
      )}

      {view.status === 'ANALYZING' && (
        <SubmittedContentCard
          content={view.content}
          actions={
            <Button variant="ghost" nativeButton={false} render={<Link to="/trainee/home" />}>
              홈으로
            </Button>
          }
        />
      )}

      {view.status === 'READY' &&
        (resubmitting ? (
          <div className="flex flex-col gap-2">
            <Button variant="ghost" size="sm" className="self-start" onClick={onCancelResubmit}>
              ← 취소
            </Button>
            <SubmissionForm
              submitting={submitting}
              onSubmit={onSubmit}
              initial={{ repoUrl: view.content.repoUrl, branch: view.content.branch }}
            />
          </div>
        ) : (
          <SubmittedContentCard
            content={view.content}
            actions={
              <>
                <span className="mr-auto text-xs text-fg-subtle">
                  다시 제출하면 분석도 다시 돌아가요
                </span>
                <Button variant="ghost" onClick={onResubmitClick}>
                  다시 제출
                </Button>
                <Button nativeButton={false} render={<Link to="/trainee/home" />}>
                  홈으로
                </Button>
              </>
            }
          />
        ))}

      {view.status === 'LOCKED' && (
        <SubmittedContentCard
          content={view.content}
          actions={
            <Button nativeButton={false} render={<Link to="/trainee/home" />}>
              홈으로
            </Button>
          }
        />
      )}

      {view.status === 'SUBMISSION_CLOSED' && (
        <Card className="bg-surface-2 p-5">
          <h3 className="text-lg font-semibold text-fg">제출 기한이 지났어요</h3>
          <p className="mt-2 text-sm text-fg-muted">
            제출 마감은 {formatDateTime(view.submissionDueAt)}이었어요. 이번 회차는 미제출로
            기록됩니다. 사정이 있었다면 매니저에게 알려 주세요.
          </p>
        </Card>
      )}
    </>
  )
}

function DueLabel({ view }: { view: SubmissionView }) {
  if (view.status === 'ANALYZING')
    return (
      <span className="text-sm text-fg-subtle">제출 완료 {formatDateTime(view.submittedAt)}</span>
    )
  if (view.status === 'READY')
    return (
      <span className="text-sm text-fg-subtle">분석 완료 {formatDateTime(view.analyzedAt)}</span>
    )
  if (view.status === 'LOCKED')
    return (
      <span className="text-sm text-fg-subtle">분석 완료 {formatDateTime(view.analyzedAt)}</span>
    )
  if (view.status === 'SUBMISSION_CLOSED')
    return (
      <span className="text-sm text-fg-subtle">
        제출 마감 {formatDateTime(view.submissionDueAt)} · 지남
      </span>
    )
  return (
    <span className="text-sm text-fg-subtle">제출 마감 {formatDateTime(view.submissionDueAt)}</span>
  )
}
