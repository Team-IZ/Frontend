import {
  CheckIcon,
  CircleHelpIcon,
  ClockIcon,
  InboxIcon,
  MinusCircleIcon,
  PauseCircleIcon,
  RotateCcwIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import StatusMessageCard from '@/components/common/StatusMessageCard'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/Empty'
import ConsoleShell from '@/shells/ConsoleShell'
import ReportSkeleton from './components/ReportSkeleton'
import { useReports } from './_/api/api'
import { buildRailNote, formatDate, formatRelativeMonths } from './labels'
import ConceptCard from './components/ConceptCard'
import RoundRail from './components/RoundRail'
import { askedConcepts, type ReportsData, type RoundReport } from './_/api/types'

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

  **한 번의 `GET /reports`가 전부 준다.** 회차를 바꿔도 요청이 없다 — 마스터-디테일이
  캐시 안에서 움직인다.
*/
export default function MyReportScreen() {
  const [searchParams] = useSearchParams()
  const initialRoundId = searchParams.get('round') ?? undefined

  const page = useReports()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  /*
    **모르는 회차 id는 버린다.** `?round=`는 주소창에 있어 사람이 고칠 수 있고, 실제로
    홈이 한동안 `reportId`(회차 id가 아닌 값)를 넘기고 있었다 — 그때 이 화면이
    `reportsById[없는 키]`를 그리다 통째로 터졌다. 모르면 최신 회차를 연다.
  */
  const known = (id: string | null | undefined) =>
    id != null && page.data?.reportsById[id] != null ? id : null
  const effectiveSelectedId =
    known(selectedId) ?? known(initialRoundId) ?? page.data?.rounds[0]?.id ?? null

  return (
    <ConsoleShell role="trainee">
      {page.isPending ? (
        <ReportSkeleton />
      ) : page.isError || !page.data ? (
        <Empty className="border-solid bg-danger-soft border-danger-border">
          <EmptyHeader>
            <EmptyTitle>리포트를 불러오지 못했습니다</EmptyTitle>
            <EmptyDescription>잠시 후 다시 시도해 주세요.</EmptyDescription>
          </EmptyHeader>
          <Button variant="ghost" onClick={() => page.refetch()}>
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
          title="리포트를 만들고 있어요"
          description="리포트는 회차 마감 후 한꺼번에 발행됩니다."
          /* 서버가 발행 예정일을 아직 안 정했을 수 있다 — 날짜를 지어내지 않고 뒷문장만 남긴다 */
          aux={
            report.publishAfter
              ? `다 되면 바로 볼 수 있어요 · 발행 예정 ${formatDate(report.publishAfter)} 이후`
              : '다 되면 바로 볼 수 있어요'
          }
        />
      )
    /*
      2026-08-20 추가 — 백엔드가 응시 미완료(코드 제출 전·분석 중·이해도 확인 세션
      준비/진행 중)를 PENDING_PUBLISH("응시 완료")로 잘못 내려보내던 버그를 고치며
      새로 생긴 상태다. `PENDING_PUBLISH`와 같은 문구를 쓰면 안 된다 — 이해도 확인을
      마쳤는지가 갈리는 축이다. 세부 단계는 이 화면 계약에 없다 — 홈의 스테퍼가
      더 자세히 보여주므로 여기서는 "가서 이어서 하라"는 안내만 한다.
    */
    case 'IN_PROGRESS':
      return (
        <ReportStatusCard
          variant="default"
          icon={<ClockIcon className="size-5" />}
          title="아직 진행 중이에요"
          description="코드 제출부터 이해도 확인까지 마치면 리포트가 만들어집니다."
          aux="홈에서 진행 상황을 이어서 확인할 수 있어요"
        />
      )
    /*
      **`NOT_STARTED`와 `NOT_ATTEMPTED`는 정반대다**(26차 A1). 둘 다 "응시 기록이
      없다"지만 제출 마감을 기준으로 갈린다 — 앞은 아직 시간이 있는 정상이고, 뒤는
      기회가 지나간 것이다. 그래서 매니저 안내(`aux`)는 **뒤에만** 붙는다. 마감 전
      학생에게 "사정이 있었다면 알려 주세요"라고 하면 없는 일을 사고로 만든다.
    */
    case 'NOT_STARTED':
      return (
        <ReportStatusCard
          variant="default"
          icon={<ClockIcon className="size-5" />}
          title="아직 시작하지 않았어요"
          description="코드를 제출하고 이해도 확인을 마치면 리포트가 만들어집니다."
          aux="아직 시간이 있어요 — 홈에서 이어서 하면 됩니다"
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

      {/*
        🔴 **`retryCount > 0`을 같이 본다.** 서버 실데이터에 `retryState: PENDING`인데
        재시험 대상 개념이 하나도 없는 회차가 있다(24차로 문의). 그대로 그리면
        *"다시 볼 수 있는 문제가 0개 있어요"* 라는 배너 아래에 아무것도 없고, 버튼을
        누르면 빈 세션으로 들어간다. 할 일이 없으면 할 일이 있다고 말하지 않는다.
      */}
      {report.retryState === 'PENDING' && report.retryDueAt && retryCount > 0 && (
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

      {/*
        🔴 **리포트 단위 잠금은 없어졌다.** 남는 가림막은 도달 2단 미만 개념의
        `qa`·`explanation`뿐이고, 다시 보기를 마치면 그 개념만 열린다(개념 단위) —
        그래서 여기 배너 대신 `ConceptCard`가 잠긴 개념마다 각자 안내한다.
      */}

      {/*
        **AI 생성이 실패해 빠진 개념**(23차 Q1). 문항 없음(`asked: false`)과 다르다 —
        그건 "코드에 그 개념이 없어 안 물었다"는 정상이고, 이건 학생 잘못이 아닌데
        결과가 덜 나온 장애다. 같은 문구를 쓰면 한쪽이 거짓말이 되므로 따로 말한다.
      */}
      {report.missingConceptCount > 0 && (
        <div className="flex items-center gap-3 rounded-md bg-warning-soft px-4 py-3 text-warning">
          <TriangleAlertIcon className="size-5 shrink-0" />
          <div>
            <b>개념 {report.missingConceptCount}개의 결과를 만들지 못했어요</b>
            <div className="text-xs text-fg-subtle">
              시스템 문제라 응시한 내용과는 관계가 없어요 · 매니저에게 알려 주세요
            </div>
          </div>
        </div>
      )}

      {report.retryState === 'DONE' && (
        <div className="flex items-center gap-3 rounded-md bg-info-soft px-4 py-3 text-info">
          <CheckIcon className="size-5 shrink-0" />
          <div>
            <b>다시 보기를 마쳤어요</b>
            {/*
              **"해설이 열렸다"고 말하지 않는다**(24차 R1 회신) — 해설을 여는 것은
              매니저의 공개 범위이지 다시 보기가 아니다. 마쳤는데도 SUMMARY로 잠긴
              회차가 실제로 있어서, 그 학생에게는 이 문장이 거짓이 된다.
            */}
            <div className="text-xs text-fg-subtle">
              다시 본 결과는 <b>성적에 반영되지 않아요</b>
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
