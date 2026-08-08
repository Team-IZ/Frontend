import type { ReactNode } from 'react'
import { AlertTriangleIcon } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table'
import { useFindOrganizationCohorts } from '@/api/organization/useOrganizationQueries'
import { useFindUsage } from '@/api/usage/useUsageQueries'
import type { findOrganization_Response } from '@/api/organization/organizationTypes'
import {
  cohortStatusBadge,
  formatBytes,
  formatChangeRate,
  formatCost,
  formatDate,
  formatPeriod,
  orgStatusBadge,
} from '../../labels'

/*
  SA-02 ① 개요 — 지표 카드 4 + 기관 메타 + 기수 표(읽기전용).

  ## 서버가 판정해 주는 것을 화면이 다시 계산하지 않는다
  | | |
  |---|---|
  | `operatorUnassigned` | 배너를 띄울지. **`operators.length === 0`으로 유추하지 않는다** |
  | `budgetUsageRate` | 예산 소진율. 화면에서 나눗셈하지 않는다 |
  | `activeSessionCount` | 진행 중 세션 수 |

  목일 때는 셋 다 화면이 추정하고 있었다(세션 수는 `교육생 × 0.04`, 저장량 증감률은
  `+8%` 하드코딩). 같은 결론이 나오는 두 경로가 있으면 유추하는 쪽이 언젠가 틀린다.

  ## 조회가 둘로 갈린다
  기관 정보는 화면이 이미 갖고 있고(헤더가 조회한다), **기수 목록과 저장량만** 여기서 읽는다.
  저장량은 사용량 탭과 같은 API라 **탭을 오가도 캐시가 재사용된다**(같은 쿼리 키).
*/

type Org = findOrganization_Response

function MetricCard({
  label,
  value,
  sub,
  children,
}: {
  label: string
  value: string
  sub?: ReactNode
  children?: ReactNode
}) {
  return (
    <Card size="sm" className="gap-1.5 px-4">
      <p className="text-fg-subtle text-xs font-semibold">{label}</p>
      <p className="text-2xl font-bold tracking-[-0.02em] tabular-nums">{value}</p>
      {sub && <p className="text-fg-subtle text-xs">{sub}</p>}
      {children}
    </Card>
  )
}

export default function OverviewTab({ org }: { org: Org }) {
  const cohorts = useFindOrganizationCohorts({ path: { organizationId: org.organizationId } })
  const usage = useFindUsage({ path: { organizationId: org.organizationId } })

  const rows = cohorts.data?.content ?? []
  const running = rows.filter((c) => c.status === 'RUNNING').length
  const closed = rows.filter((c) => c.status === 'CLOSED').length
  /*
    상세 응답의 `operators`에는 상태가 없다(이름·이메일뿐). **정지된 사람도 섞여 온다.**
    상태별로 갈라 보여주려면 오퍼레이터 탭의 `findOperators`가 필요한데, 개요는 "누가
    맡고 있나"만 보여주는 자리라 여기서 조회를 하나 더 늘리지 않는다 — 그 구분은 탭에 있다.
  */
  const operatorNames = org.operators.map((o) => o.name)

  // 소진율은 0~1로 온다. 예산이 0이면 null — 나눌 수 없다는 뜻이라 %를 지어내지 않는다
  const budgetPct = org.budgetUsageRate == null ? null : Math.round(org.budgetUsageRate * 100)
  const storageChange = formatChangeRate(usage.data?.storage.changeRateVsPrevMonth)

  return (
    <div className="flex flex-col gap-4">
      {org.operatorUnassigned && (
        <Alert variant="warning">
          <AlertTriangleIcon />
          <AlertTitle>오퍼레이터가 없어 이 기관은 아직 시작되지 않았습니다</AlertTitle>
          <AlertDescription>
            기수·반·명단을 만들 수 있는 사람이 없습니다. 첫 오퍼레이터를 초대하면 그 뒤부터는 기관
            안에서 매니저를 직접 초대합니다. <b className="text-fg-muted">오퍼레이터</b> 탭에서
            초대할 수 있습니다.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          label="기수"
          value={cohorts.isPending ? '—' : `${rows.length}`}
          sub={
            cohorts.isPending
              ? undefined
              : rows.length === 0
                ? '개설된 기수 없음'
                : `진행 ${running} · 종료 ${closed}`
          }
        />
        <MetricCard
          label="교육생"
          value={org.traineeCount.toLocaleString()}
          sub={
            org.traineeCount === 0
              ? '명단은 오퍼레이터가 등록'
              : `활성 세션 ${org.activeSessionCount.toLocaleString()}`
          }
        />
        <MetricCard
          label="이번 달 AI 비용"
          value={formatCost(org.currentMonthAiCost, org.currencyCode)}
          sub={
            `예산 ${formatCost(org.monthlyAiBudget, org.currencyCode)}` +
            (budgetPct === null ? ' · 미설정' : ` 대비 ${budgetPct}%`)
          }
        >
          {/* Progress는 Track·Indicator를 스스로 렌더한다 — children으로 또 넣지 않는다
              (OrgMetrics.tsx의 같은 경고 참고). */}
          {budgetPct !== null && (
            <Progress
              value={Math.min(budgetPct, 100)}
              className="mt-2 gap-0 [&_[data-slot=progress-track]]:h-1.5 [&_[data-slot=progress-track]]:bg-warning-soft [&_[data-slot=progress-indicator]]:bg-warning"
            />
          )}
        </MetricCard>
        <MetricCard
          label="저장량"
          value={usage.isPending ? '—' : formatBytes(usage.data?.storage.totalBytes ?? 0)}
          sub={storageChange ? `전월 대비 ${storageChange}` : undefined}
        />
      </div>

      <dl className="grid grid-cols-3 gap-x-6 gap-y-3 rounded-md border border-border bg-surface p-4 text-sm">
        <InfoRow k="org_id" v={<span className="font-mono text-xs">{org.organizationId}</span>} />
        <InfoRow
          k="상태"
          v={
            <Badge variant={orgStatusBadge(org).variant}>
              {/* 헤더 배지와 같은 함수를 쓴다 — 두 곳이 각자 판정하면 우선순위가 갈린다 */}
              {orgStatusBadge(org).label}
            </Badge>
          }
        />
        <InfoRow k="생성일" v={formatDate(org.createdAt)} />
        <InfoRow
          k="오퍼레이터"
          v={
            org.operatorUnassigned ? (
              <span className="text-warning font-semibold">미배정</span>
            ) : operatorNames.length > 0 ? (
              operatorNames.join(' · ')
            ) : (
              <span className="text-fg-subtle">—</span>
            )
          }
        />
        <InfoRow k="데이터 보존기간" v={`${org.dataRetentionDays}일`} />
        {/* 활성 정책이 없으면 null이 온다 — 설정한 적이 없다는 뜻이라 대시로 둔다 */}
        <InfoRow
          k="공개 범위 기본값"
          v={(org.defaultDisclosureScope && DISCLOSURE_LABEL[org.defaultDisclosureScope]) ?? '—'}
        />
      </dl>

      <div>
        <p className="text-fg-muted mb-2 text-xs font-bold">
          기수 <span className="text-fg-subtle font-normal">· 읽기전용</span>
        </p>
        <CohortTable query={cohorts} />
      </div>
    </div>
  )
}

/** 서버 enum → 화면 문구. 세 값 그대로 보여준다(지금 화면이 2값이던 것을 맞췄다) */
const DISCLOSURE_LABEL: Record<string, string> = {
  SUMMARY: '요약',
  PRIVATE: '비공개',
  FULL: '전체',
}

function CohortTable({ query }: { query: ReturnType<typeof useFindOrganizationCohorts> }) {
  if (query.isPending) return <Skeleton className="h-32 w-full" />

  if (query.isError) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>기수를 불러오지 못했습니다</EmptyTitle>
          <EmptyDescription>잠시 후 다시 시도해 주세요.</EmptyDescription>
        </EmptyHeader>
        <Button variant="ghost" onClick={() => query.refetch()}>
          다시 시도
        </Button>
      </Empty>
    )
  }

  const rows = query.data.content
  if (rows.length === 0) {
    return (
      <p className="text-fg-subtle rounded-md border border-dashed border-border-strong bg-surface-2 p-6 text-center text-sm">
        아직 개설된 기수가 없습니다.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-32">기수</TableHead>
          <TableHead className="w-28">상태</TableHead>
          <TableHead className="w-20 text-right">반</TableHead>
          <TableHead className="w-24 text-right">교육생</TableHead>
          <TableHead>기간</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((c) => {
          const badge = cohortStatusBadge(c.status)
          const period = formatPeriod(c.startDate, c.endDate)
          return (
            <TableRow key={c.cohortId}>
              <TableCell className="font-bold">{c.name}</TableCell>
              <TableCell>
                <Badge variant={badge.variant}>{badge.label}</Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">{c.classCount}</TableCell>
              <TableCell className="text-right tabular-nums">{c.traineeCount}</TableCell>
              <TableCell className="text-fg-muted text-xs">{period ?? '—'}</TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

function InfoRow({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="text-fg-subtle w-28 shrink-0 text-xs">{k}</dt>
      <dd className="text-fg text-sm font-medium">{v}</dd>
    </div>
  )
}
