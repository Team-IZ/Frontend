import { useEffect, useState } from 'react'
import { ClockIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress'
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
import {
  getOrgUsage,
  USAGE_PERIOD_OPTIONS,
  type Org,
  type OrgUsage,
  type UsagePeriod,
} from '../../mockData'

/*
  SA-02 §3 "사용량 · AI 비용 탭" · 케이스 6(USAGE_UNAVAILABLE). getOrgUsage는
  이 화면 하나만 감싼다 — 실패해도 다른 탭·기관 정보는 그대로 보여야 한다(§6
  "이 영역만 막는다"). 그래서 이 컴포넌트는 로딩·실패·성공 3상태를 자체적으로
  들고 있고, 부모(OrgDetailScreen)는 org만 넘긴다.

  기간(와이어 `.filter` "기간 ▾")은 이 탭 안의 상태다 — 다른 탭에는 없는 이
  탭 전용 컨트롤이라 OrgDetailScreen까지 끌어올리지 않는다. 옵션 구성 근거는
  mockData.ts의 "사용량 · 기간" 섹션 주석에 있다(월 단위로 나눈 이유).

  표시되는 비용 총액은 org.monthlyAiCostUsd(전역 "이번 달" 값)를 쓰지 않고
  usage.models 합계로 직접 계산한다 — 기간을 지난 달·2개월 전으로 바꾸면
  org.monthlyAiCostUsd는 더 이상 화면에 보이는 기간의 값이 아니게 된다.
*/

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; usage: OrgUsage }

function formatTokens(n: number): string {
  if (n === 0) return '0'
  return `${(n / 1_000_000).toFixed(1)}M`
}

export default function UsageTab({ org }: { org: Org }) {
  const [period, setPeriod] = useState<UsagePeriod>('CURRENT')
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    setState({ status: 'loading' })
    let cancelled = false
    getOrgUsage(org.id, period).then(
      (usage) => {
        if (!cancelled) setState({ status: 'ready', usage })
      },
      () => {
        if (!cancelled) setState({ status: 'error' })
      },
    )
    return () => {
      cancelled = true
    }
  }, [org.id, period, attempt])

  const periodLabel = USAGE_PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? '이번 달'

  const periodSelect = (
    <div className="mb-1 flex items-center justify-end gap-2">
      <span className="text-fg-subtle text-xs">기간</span>
      <Select
        value={period}
        onValueChange={(v) => setPeriod((v as UsagePeriod) ?? period)}
        items={Object.fromEntries(USAGE_PERIOD_OPTIONS.map((o) => [o.value, o.label]))}
      >
        <SelectTrigger className="w-32" aria-label="기간">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {USAGE_PERIOD_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  if (state.status === 'loading') {
    return (
      <div className="flex flex-col gap-4">
        {periodSelect}
        <p className="text-fg-subtle py-16 text-center text-sm">불러오는 중…</p>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="flex flex-col gap-4">
        {periodSelect}
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
          <Button variant="ghost" onClick={() => setAttempt((n) => n + 1)}>
            다시 불러오기
          </Button>
        </Empty>
      </div>
    )
  }

  const { usage } = state
  const totalCostUsd = usage.models.reduce((sum, m) => sum + m.costUsd, 0)
  const budgetPct =
    usage.monthBudgetUsd > 0 ? Math.round((totalCostUsd / usage.monthBudgetUsd) * 100) : 0
  const totalTokens = usage.models.reduce(
    (sum, m) => ({ in: sum.in + m.inputTokens, out: sum.out + m.outputTokens }),
    { in: 0, out: 0 },
  )
  const totalCalls = usage.models.reduce((sum, m) => sum + m.calls, 0)

  return (
    <div className="flex flex-col gap-4">
      {periodSelect}

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-md border border-border bg-surface p-4">
          <div className="mb-3 flex items-baseline justify-between">
            <h4 className="text-sm font-bold">저장량 구성</h4>
            <span className="text-fg-subtle text-xs">총 {usage.totalStorageGb} GB</span>
          </div>
          {usage.storageBreakdown.length === 0 ? (
            <p className="text-fg-subtle text-sm">저장된 데이터가 없습니다.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {usage.storageBreakdown.map((row) => (
                <div key={row.label}>
                  <div className="mb-1 flex items-baseline justify-between text-xs">
                    <span className="text-fg-muted">{row.label}</span>
                    <span className="tabular-nums font-medium">{row.gb} GB</span>
                  </div>
                  <Progress
                    value={usage.totalStorageGb > 0 ? (row.gb / usage.totalStorageGb) * 100 : 0}
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
            <UsageRow k="활성 교육생" v={usage.activeTrainees.toLocaleString()} />
            <UsageRow k="완료 세션" v={usage.completedSessions.toLocaleString()} />
            <UsageRow k="채점 회차" v={usage.gradingRounds.toLocaleString()} />
            <UsageRow k="발행 리포트" v={usage.publishedReports.toLocaleString()} />
          </dl>
        </div>
      </div>

      <div className="rounded-md border border-border bg-surface p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h4 className="text-sm font-bold">AI 비용 · 모델별</h4>
          <span className="text-fg-subtle text-xs">
            {periodLabel} ${totalCostUsd.toLocaleString()} / 예산 $
            {usage.monthBudgetUsd.toLocaleString()}
            {usage.costDeltaPct !== 0 && (
              <span className="text-danger ml-1.5 font-bold">전월 +{usage.costDeltaPct}%</span>
            )}
          </span>
        </div>
        <Progress
          value={Math.min(budgetPct, 100)}
          className="mb-4 gap-0 [&_[data-slot=progress-track]]:h-1.5 [&_[data-slot=progress-track]]:bg-warning-soft [&_[data-slot=progress-indicator]]:bg-warning"
        />
        {/* 이 표는 이미 테두리·배경이 있는 패널(위 div) 안에 있다 — Table 자체의 면을
            또 두면 이중 테두리가 된다(Table.tsx 주석 "카드 안에 이미 들어 있는 경우"
            참고). 개요·오퍼레이터 탭의 표는 이런 바깥 패널이 없어 그대로(기본값) 둔다. */}
        {usage.models.length === 0 ? (
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
              {usage.models.map((m) => (
                <TableRow key={`${m.purpose}-${m.model}`}>
                  <TableCell>
                    {m.purpose}{' '}
                    <span className="text-fg-subtle text-xs">
                      {m.tierLabel} · <span className="font-mono">{m.model}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {m.calls.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {formatTokens(m.inputTokens)} / {formatTokens(m.outputTokens)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    ${m.costUsd.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell>합계</TableCell>
                <TableCell className="text-right tabular-nums">
                  {totalCalls.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {formatTokens(totalTokens.in)} / {formatTokens(totalTokens.out)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  ${totalCostUsd.toLocaleString()}
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
