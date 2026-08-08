import { useMemo, useState } from 'react'
import { ClockIcon, TriangleAlertIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress'
import { Skeleton } from '@/components/ui/Skeleton'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/Empty'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table'
import { useFindUsage } from '@/api/usage/useUsageQueries'
import { formatBytes, formatChangeRate, formatCost } from '../../labels'

/*
  SA-02 ③ 사용량 · AI 비용.

  ## 표시된 비용이 실제보다 적을 수 있다
  스펙이 요구한다 — *"`costComplete`가 false면 단가 미설정 호출이 섞여 있어 **실제 청구액이
  이 값보다 크다.** 화면은 `일부 단가 미설정`을 함께 표시해야 한다."*

  단가가 아직 등록 안 된 모델의 호출은 **합계에서 통째로 빠진다**(0으로 더하지도 않는다).
  그 사실을 안 보여주면 슈퍼어드민이 "예산 안에 있네"로 잘못 판단한다. 모델 행에도
  `pricingMissing`으로 같은 표시가 온다.

  ## 합계를 화면에서 더하지 않는다
  목일 때는 `models`를 `reduce`로 합쳤는데, 서버가 `total`(호출·토큰·비용)과 `budgetUsageRate`를
  준다. 단가 미설정 호출이 섞이면 **화면 합계와 서버 합계가 갈리므로** 서버 값을 쓴다.

  ## 기간
  `period`는 `yyyy-MM`이고 생략하면 이번 달(UTC)이다 — 상대 표기(`CURRENT` 등)는 받지 않는다.
  화면의 `이번 달`·`지난 달`·`2개월 전`을 그때그때 계산해 넘긴다.
*/

/** 최근 3개월치 `yyyy-MM` — 렌더마다 새로 만들면 쿼리 키가 흔들린다 */
function useRecentMonths() {
  return useMemo(() => {
    const now = new Date()
    return [0, 1, 2].map((back) => {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1))
      const value = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
      return { value, label: back === 0 ? '이번 달' : back === 1 ? '지난 달' : `${back}개월 전` }
    })
  }, [])
}

const formatTokens = (n: number) => (n === 0 ? '0' : `${(n / 1_000_000).toFixed(1)}M`)

export default function UsageTab({ org }: { org: { organizationId: string } }) {
  const months = useRecentMonths()
  const [period, setPeriod] = useState(months[0].value)
  const { data, isPending, isError, refetch } = useFindUsage({
    path: { organizationId: org.organizationId },
    query: { period },
  })

  const periodLabel = months.find((m) => m.value === period)?.label ?? period

  const periodSelect = (
    <div className="mb-1 flex items-center justify-end gap-2">
      <span className="text-fg-subtle text-xs">기간</span>
      <Select
        value={period}
        onValueChange={(v) => setPeriod(v ?? period)}
        items={Object.fromEntries(months.map((m) => [m.value, m.label]))}
      >
        <SelectTrigger className="w-32" aria-label="기간">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {months.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        {periodSelect}
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col gap-4">
        {periodSelect}
        {/* 이 영역만 막는다 — 기관 정보·다른 탭은 그대로 보여야 한다 */}
        <Empty className="py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClockIcon />
            </EmptyMedia>
            <EmptyTitle>사용량을 불러오지 못했습니다</EmptyTitle>
            <EmptyDescription>
              잠시 후 다시 시도해 주세요.
              <br />
              저장량 · 사용 규모 · AI 비용은 지금 확인할 수 없습니다.
            </EmptyDescription>
          </EmptyHeader>
          <Button variant="ghost" onClick={() => refetch()}>
            다시 불러오기
          </Button>
        </Empty>
      </div>
    )
  }

  const { storage, activity, aiCost, currencyCode } = data
  const budgetPct = aiCost.budgetUsageRate == null ? null : Math.round(aiCost.budgetUsageRate * 100)
  const costChange = formatChangeRate(aiCost.changeRateVsPrevMonth)

  /*
    총량은 `totalBytes`를 그대로 쓴다 — 스펙 경고: *"원천이 ORG_TOTAL 행을 제공하면 그
    값을 쓰고, 없으면 세부 합으로 계산한다. **둘을 함께 더하면 이중 계산된다.**"*
  */
  const breakdown = [
    { label: '코드 제출물', bytes: storage.codeSubmissionBytes },
    { label: '문답 원문', bytes: storage.sessionLogBytes },
    { label: '채점 근거', bytes: storage.gradingEvidenceBytes },
    { label: '리포트', bytes: storage.reportBytes },
  ].filter((r) => r.bytes > 0)

  return (
    <div className="flex flex-col gap-4">
      {periodSelect}

      {!aiCost.costComplete && (
        <Alert variant="warning">
          <TriangleAlertIcon />
          <AlertTitle>일부 호출의 단가가 설정되지 않았습니다</AlertTitle>
          <AlertDescription>
            호출 {aiCost.unpricedCallCount.toLocaleString()}건이 비용 합계에서 빠져 있습니다.{' '}
            <b className="text-fg-muted">실제 청구액은 아래 값보다 큽니다.</b> 플랫폼 설정에서 해당
            모델의 단가를 등록하면 반영됩니다.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-md border border-border bg-surface p-4">
          <div className="mb-3 flex items-baseline justify-between">
            <h4 className="text-sm font-bold">저장량 구성</h4>
            <span className="text-fg-subtle text-xs">총 {formatBytes(storage.totalBytes)}</span>
          </div>
          {breakdown.length === 0 ? (
            <p className="text-fg-subtle text-sm">저장된 데이터가 없습니다.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {breakdown.map((row) => (
                <div key={row.label}>
                  <div className="mb-1 flex items-baseline justify-between text-xs">
                    <span className="text-fg-muted">{row.label}</span>
                    <span className="tabular-nums font-medium">{formatBytes(row.bytes)}</span>
                  </div>
                  <Progress
                    value={storage.totalBytes > 0 ? (row.bytes / storage.totalBytes) * 100 : 0}
                    className="gap-0 [&_[data-slot=progress-track]]:h-1.5"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-md border border-border bg-surface p-4">
          <div className="mb-3 flex items-baseline justify-between">
            <h4 className="text-sm font-bold">사용 규모</h4>
            <span className="text-fg-subtle text-xs">{periodLabel}</span>
          </div>
          <dl className="flex flex-col gap-2.5 text-sm">
            <UsageRow k="활성 교육생" v={activity.activeTrainees.toLocaleString()} />
            <UsageRow k="완료 세션" v={activity.completedSessions.toLocaleString()} />
            <UsageRow k="채점 회차" v={activity.gradingRounds.toLocaleString()} />
            <UsageRow k="발행 리포트" v={activity.generatedReports.toLocaleString()} />
          </dl>
        </div>
      </div>

      <div className="rounded-md border border-border bg-surface p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h4 className="text-sm font-bold">AI 비용 · 모델별</h4>
          <span className="text-fg-subtle text-xs">
            {periodLabel} {formatCost(aiCost.totalCost, currencyCode)} / 예산{' '}
            {formatCost(aiCost.monthlyBudget, currencyCode)}
            {costChange && <span className="text-danger ml-1.5 font-bold">전월 {costChange}</span>}
          </span>
        </div>
        {budgetPct !== null && (
          <Progress
            value={Math.min(budgetPct, 100)}
            className="mb-4 gap-0 [&_[data-slot=progress-track]]:h-1.5 [&_[data-slot=progress-track]]:bg-warning-soft [&_[data-slot=progress-indicator]]:bg-warning"
          />
        )}
        {/* 이 표는 이미 테두리·배경이 있는 패널(위 div) 안에 있다 — Table 자체의 면을
            또 두면 이중 테두리가 된다(Table.tsx 주석 "카드 안에 이미 들어 있는 경우"
            참고). 개요·오퍼레이터 탭의 표는 이런 바깥 패널이 없어 그대로(기본값) 둔다. */}
        {aiCost.models.length === 0 ? (
          <p className="text-fg-subtle text-center text-sm">{periodLabel} 사용 내역이 없습니다.</p>
        ) : (
          <Table className="border-0 bg-transparent">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>용도 · 모델</TableHead>
                <TableHead className="text-right">호출</TableHead>
                <TableHead className="text-right">토큰(입력/출력)</TableHead>
                <TableHead className="text-right">비용</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aiCost.models.map((m) => (
                <TableRow key={`${m.usageType}-${m.model}-${m.tier}`}>
                  <TableCell>
                    {m.usageType}{' '}
                    <span className="text-fg-subtle text-xs">
                      {m.tier} · <span className="font-mono">{m.model}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {m.calls.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {formatTokens(m.inputTokens)} / {formatTokens(m.outputTokens)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {/* 단가가 없으면 비용이 0인 게 아니라 **셀 수 없는 것**이다 */}
                    {m.pricingMissing || m.cost == null ? (
                      <span className="text-warning text-xs font-semibold">단가 미설정</span>
                    ) : (
                      formatCost(m.cost, currencyCode)
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell>합계</TableCell>
                <TableCell className="text-right tabular-nums">
                  {aiCost.total.calls.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {formatTokens(aiCost.total.inputTokens)} /{' '}
                  {formatTokens(aiCost.total.outputTokens)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCost(aiCost.total.cost, currencyCode)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </div>
    </div>
  )
}

function UsageRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-fg-subtle">{k}</dt>
      <dd className="tabular-nums font-medium">{v}</dd>
    </div>
  )
}
