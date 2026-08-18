import { useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/Empty'
import { Spinner } from '@/components/ui/Spinner'
import { isApiError } from '@/api/_contract'
import { formatDateTime } from '@/lib/format'
import ConsoleShell from '@/shells/ConsoleShell'
import { useSubmission, useSubmitZip } from './_/api/api'
import type { SubmissionView } from './_/api/types'
import { buildStateBanner, submitFailureOf, type SubmitFailure } from './labels'
import StateBanner from './components/StateBanner'
import SubmissionForm from './components/SubmissionForm'
import SubmittedContentCard from './components/SubmittedContentCard'

/*
  TR-02 코드 제출 — 레포를 내고 분석이 끝날 때까지의 상태를 본다.

  **상태 6종을 서버가 정한다**(`DRAFT`·`ANALYZING`·`READY`·`LOCKED`·`ANALYSIS_FAILED`·
  `SUBMISSION_CLOSED`). 16차로 요청한 이름이 글자까지 그대로 와서 목일 때의 분기가 그대로 산다.

  **낙관적 전환을 걷어냈다.** 목은 제출 즉시 화면이 `ANALYZING` 카드를 지어냈는데, 지금은
  서버가 접수만 하고 분석을 비동기로 돌리므로 **제출 후 다시 읽어** 서버가 준 상태를 그린다.
*/
export default function SubmissionScreen() {
  const { data, isPending, isError, refetch } = useSubmission()
  const submit = useSubmitZip()
  const [resubmitting, setResubmitting] = useState(false)

  const handleSubmit = async (file: File) => {
    if (!data) return
    await submit.mutateAsync({
      assessmentRoundId: data.assessmentRoundId,
      /*
        **제출 버튼을 누른 이 순간 키를 만든다.** 재시도(타임아웃·5xx)는 같은 키라야
        서버가 최초 결과를 돌려주고, 사용자가 다시 제출하면 새 키가 되어 별개 제출이
        된다 — `mutateAsync` 한 번이 곧 한 제출이라 여기가 그 경계다.
      */
      idempotencyKey: crypto.randomUUID(),
      file,
    })
    setResubmitting(false)
  }

  return (
    <ConsoleShell role="trainee">
      {/*
        TR-01과 같은 860px — 한 플로우(홈→제출→홈) 안에서 폭이 화면마다 바뀌는 것이
        더 어색하다. 제출 폼의 입력칸은 한두 줄이라 넓어져도 가독성 손해가 없다.
      */}
      <div className="mx-auto flex max-w-[860px] flex-col gap-4">
        {/* flex-col 부모의 stretch 때문에 클릭 영역이 컨테이너 폭으로 늘어나 있었다 */}
        <Link to="/trainee/home" className="self-start text-sm text-fg-subtle hover:underline">
          ← 홈
        </Link>

        {isPending ? (
          <div className="flex justify-center py-16">
            <Spinner className="size-6" aria-label="제출 현황을 불러오는 중" />
          </div>
        ) : isError || !data ? (
          <Empty className="border-solid bg-danger-soft border-danger-border">
            <EmptyHeader>
              <EmptyTitle>제출 현황을 불러오지 못했습니다</EmptyTitle>
              <EmptyDescription>잠시 후 다시 시도해 주세요.</EmptyDescription>
            </EmptyHeader>
            <Button variant="ghost" onClick={() => refetch()}>
              다시 시도
            </Button>
          </Empty>
        ) : (
          <SubmissionBody
            view={data}
            resubmitting={resubmitting}
            submitting={submit.isPending}
            failure={
              submit.isError
                ? submitFailureOf(isApiError(submit.error) ? submit.error.code : null)
                : null
            }
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
  failure,
  onResubmitClick,
  onCancelResubmit,
  onSubmit,
}: {
  view: SubmissionView
  resubmitting: boolean
  submitting: boolean
  /** 접수가 거절된 이유. 성공했거나 아직 안 눌렀으면 `null` */
  failure: SubmitFailure | null
  onResubmitClick: () => void
  onCancelResubmit: () => void
  onSubmit: (file: File) => void
}) {
  // 재제출 폼을 펴면 "분석이 끝났어요" 성공 배너를 감춘다 — 지금 하려는 일과 반대되는
  // 메시지("시작하세요")가 폼 위에 남으면 서로 부딪힌다.
  const banner = resubmitting ? null : buildStateBanner(view)

  return (
    <>
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-bold">{view.roundLabel} 코드 제출</h1>
        <DueLabel view={view} />
      </header>

      {banner && <StateBanner {...banner} />}

      {/*
        **서버가 준 이유를 그대로 옮긴다.** 접수 거절 코드가 13종인데 하나로 뭉치면
        학생이 무엇을 해야 하는지 모른다 — 압축을 다시 하면 되는 경우와 기다려야 하는
        경우가 섞인다. 재시도가 의미 없는 경우에는 그 말을 하지 않는다(`labels.ts`).
      */}
      {failure && (
        <div className="rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">
          {failure.message}
        </div>
      )}

      {/*
        **실패했을 때 무엇이 실패했는지 먼저 보인다.** 다시 낼 파일을 고르기 전에
        지난번에 무엇을 냈는지 알아야 같은 파일을 또 올리지 않는다 — 서버가 실패한
        제출의 `content`도 그대로 주므로(23차 R3) 폼 위에 얹는다.
      */}
      {view.status === 'ANALYSIS_FAILED' && view.content && <SubmittedContentCard view={view} />}

      {(view.status === 'DRAFT' || view.status === 'ANALYSIS_FAILED') && (
        <SubmissionForm
          submitting={submitting}
          availableMethods={view.availableMethods}
          onSubmit={onSubmit}
        />
      )}

      {view.status === 'ANALYZING' && (
        <SubmittedContentCard
          view={view}
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
              availableMethods={view.availableMethods}
              onSubmit={onSubmit}
            />
          </div>
        ) : (
          <SubmittedContentCard
            view={view}
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
          view={view}
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
  if (view.status === 'ANALYZING' && view.submittedAt)
    return (
      <span className="text-sm text-fg-subtle">제출 완료 {formatDateTime(view.submittedAt)}</span>
    )
  if ((view.status === 'READY' || view.status === 'LOCKED') && view.analyzedAt)
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
