import {
  CheckIcon,
  CircleHelpIcon,
  ClockIcon,
  InboxIcon,
  LockIcon,
  MinusCircleIcon,
  PauseCircleIcon,
  RotateCcwIcon,
} from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import StatusMessageCard from '@/components/common/StatusMessageCard'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/Empty'
import { Spinner } from '@/components/ui/Spinner'
import { useAsync } from '@/lib/useAsync'
import ConsoleShell from '@/shells/ConsoleShell'
import { getReports } from './api'
import { buildRailNote, formatDate, formatRelativeMonths } from './labels'
import ConceptCard from './components/ConceptCard'
import RoundRail from './components/RoundRail'
import { askedConcepts, type ReportsData, type RoundReport } from './types'

/*
  StatusMessage(카드 없는 플로팅 텍스트)를 지운다 — 아이콘도 유니코드 손글씨
  글리프(◴ 🔒 – ? ◷)였다. 공용 StatusMessageCard(components/common)로 바꾸고
  Card로 감싸 TR-01·02가 이미 쓰는 "카드 안에 상태" 모양과 맞춘다.
*/
function ReportStatusCard(props: React.ComponentProps<typeof StatusMessageCard>) {
  return (
    <Card className="flex min-h-[360px] items-center justify-center p-10">
      <StatusMessageCard className="max-w-[560px]" {...props} />
    </Card>
  )
}

/*
  TR-04 내 리포트 — 좌 회차 목록 / 우 본문 마스터-디테일. 별도 아카이브 화면을 두지
  않는다(정의서 §3 "좌측 회차 목록이 곧 아카이브다").

  ?round= 은 TR-01 홈의 "리포트 보기" 링크가 넘기는 값이다 — 과거 회차를 눌렀는데
  최신이 열리면 링크가 거짓말이 된다.
  ?state= 는 API 명세가 없는 지금 12개 상태를 확인하기 위한 dev 오버라이드다 — 미프
  3차 한 라운드만 바꿔치기하고 나머지 두 라운드는 배경으로 남겨 마스터-디테일이 항상
  살아있게 한다.
*/
export default function MyReportScreen() {
  const [searchParams] = useSearchParams()
  const previewStatus = searchParams.get('state') ?? undefined
  const initialRoundId = searchParams.get('round') ?? undefined

  const load = useCallback(() => getReports(previewStatus), [previewStatus])
  const page = useAsync(load)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const effectiveSelectedId = selectedId ?? initialRoundId ?? page.data?.rounds[0]?.id ?? null

  return (
    <ConsoleShell role="trainee">
      {page.loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="size-6" aria-label="리포트를 불러오는 중" />
        </div>
      ) : page.failed || !page.data ? (
        <Empty className="border-solid bg-danger-soft border-danger-border">
          <EmptyHeader>
            <EmptyTitle>리포트를 불러오지 못했습니다</EmptyTitle>
            <EmptyDescription>잠시 후 다시 시도해 주세요.</EmptyDescription>
          </EmptyHeader>
          <Button variant="ghost" onClick={page.reload}>
            다시 시도
          </Button>
        </Empty>
      ) : page.data.rounds.length === 0 ? (
        <ReportStatusCard
          variant="default"
          icon={<InboxIcon className="size-5" />}
          title="아직 받은 리포트가 없어요"
          description="이해도 확인을 마치고 회차가 끝나면 여기에 쌓입니다."
        />
      ) : (
        <ReportsBody data={page.data} selectedId={effectiveSelectedId!} onSelect={setSelectedId} />
      )}
    </ConsoleShell>
  )
}

function ReportsBody({
  data,
  selectedId,
  onSelect,
}: {
  data: ReportsData
  selectedId: string
  onSelect: (id: string) => void
}) {
  const report = data.reportsById[selectedId]

  return (
    <div className="flex flex-col gap-4 md:flex-row md:gap-8">
      <RoundRail
        items={data.rounds.map((r) => ({
          id: r.id,
          label: r.label,
          note: buildRailNote(data.reportsById[r.id]),
          hasDot: r.hasPendingRetry,
        }))}
        selectedId={selectedId}
        onSelect={onSelect}
      />
      <div className="min-w-0 flex-1">
        <RoundBody report={report} />
      </div>
    </div>
  )
}

function RoundBody({ report }: { report: RoundReport }) {
  switch (report.status) {
    case 'PENDING_PUBLISH':
      return (
        <ReportStatusCard
          variant="default"
          icon={<ClockIcon className="size-5" />}
          title="아직 발행 전이에요"
          description="리포트는 회차 마감 후 한꺼번에 발행됩니다."
          aux={`발행되면 알려드릴게요 · 발행 예정 ${formatDate(report.publishAfter)} 이후`}
        />
      )
    case 'PENDING_VISIBILITY':
      return (
        <ReportStatusCard
          variant="default"
          icon={<LockIcon className="size-5" />}
          title="아직 공개되지 않았어요"
          description="담당 매니저가 공개 범위를 정하면 확인할 수 있어요."
          aux="회차는 끝났고 결과도 나와 있습니다 — 여는 시점만 남았어요"
        />
      )
    case 'NOT_ATTEMPTED':
      return (
        <ReportStatusCard
          variant="default"
          icon={<MinusCircleIcon className="size-5" />}
          title="이 회차는 리포트가 없어요"
          description="이해도 확인에 응시하지 않아 만들 내용이 없습니다."
          aux="사정이 있었다면 매니저에게 알려 주세요"
        />
      )
    case 'VOID_ATTEMPT':
      return (
        <ReportStatusCard
          variant="warning"
          icon={<CircleHelpIcon className="size-5" />}
          title="응시 기록을 확인하고 있어요"
          description="답변이 거의 남지 않아 결과를 만들지 못했습니다. 매니저가 확인한 뒤 다시 응시할 수 있어요."
          aux="연결 문제였거나 실수로 넘어갔을 수 있어요 — 확인되면 알려드립니다"
        />
      )
    case 'STOPPED':
      return (
        <ReportStatusCard
          variant="warning"
          icon={<PauseCircleIcon className="size-5" />}
          title="답한 데까지만 기록됐어요"
          description={
            <>
              이해도 확인을 끝까지 마치지 못했어요.
              <br />
              답한 문제까지는 그대로 결과에 들어가고, 남은 문제는 답하지 않은 것으로 남습니다.
            </>
          }
          aux="사정이 있었다면 매니저에게 알려 주세요 — 다시 응시할지는 매니저가 정합니다"
        />
      )
    case 'PUBLISHED':
      return <PublishedBody report={report} />
  }
}

function PublishedBody({ report }: { report: Extract<RoundReport, { status: 'PUBLISHED' }> }) {
  // 문항 없음은 재시험 대상이 아니다 — 못한 게 아니라 안 물어본 것이라 다시 볼 것도 없다
  const retryCount = askedConcepts(report.concepts).filter((c) => c.isRetryTarget).length
  const relative = formatRelativeMonths(report.publishedAt, Date.now())

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-fg">{report.label}</h2>
        <p className="text-sm text-fg-subtle">
          발행 {formatDate(report.publishedAt)}
          {report.retryState === 'DONE' &&
            report.retryCompletedAt &&
            ` · 다시 보기 ${formatDate(report.retryCompletedAt)}`}{' '}
          · 교안 {report.curriculum}
          {relative && ` · ${relative}`}
        </p>
      </div>

      {report.retryState === 'PENDING' && report.retryDueAt && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-md bg-warning-soft px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <RotateCcwIcon className="size-5 shrink-0 text-warning" />
            <div>
              <b className="text-warning">다시 볼 수 있는 문제가 {retryCount}개 있어요</b>
              <div className="text-xs text-fg-subtle">
                {formatDate(report.retryDueAt)}까지 · 결과는 기록에만 남고 지금 결과는 그대로예요
              </div>
            </div>
          </div>
          <Button
            size="sm"
            className="shrink-0"
            nativeButton={false}
            render={<Link to="/trainee/session?retry=1" />}
          >
            다시 보기
          </Button>
        </div>
      )}

      {report.retryState === 'DONE' && (
        <div className="flex items-center gap-3 rounded-md bg-info-soft px-4 py-3 text-info">
          <CheckIcon className="size-5 shrink-0" />
          <div>
            <b>다시 보기를 마쳤어요</b>
            <div className="text-xs text-fg-subtle">
              자세한 해설이 열렸습니다 · 다시 본 결과는 <b>성적에 반영되지 않아요</b>
            </div>
          </div>
        </div>
      )}

      {/*
        gap 대신 각 카드가 자기 아래쪽 여백(pb)을 갖는다 — 타임라인 선이 그 여백을
        뚫고 다음 카드까지 이어져야 해서다. flex gap은 형제 "사이" 공간이라 어느
        카드도 그 공간의 선을 그릴 수 없다(실제로 겪은 정렬 어긋남의 원인).
      */}
      <div className="flex flex-col">
        {report.concepts.map((concept, i) => (
          <ConceptCard
            key={concept.name}
            concept={concept}
            isLast={i === report.concepts.length - 1}
          />
        ))}
      </div>
    </div>
  )
}
