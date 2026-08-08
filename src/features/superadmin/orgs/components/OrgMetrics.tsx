import type { ReactNode } from 'react'
import { Card } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'
import type { findPlatformSummary_Response } from '@/api/organization/organizationTypes'
import { formatChangeRate, formatCost, formatGb } from '../labels'

/*
  와이어프레임 `.metrics`(4카드) — 기관별 데이터가 아닌 **플랫폼 집계**다.
  PageHeader의 총 개수를 여기서 대신하므로 PageHeader엔 count를 안 준다
  (CLAUDE.md §6 "메트릭 카드가 있으면 제목 총개수 생략").

  **네 값 모두 서버가 계산해 준다**(`GET /organizations/summary`). 예전에는 목록 배열을
  `reduce`해서 만들었는데, 그러면 **페이지가 나뉘는 순간 한 페이지 합계가 전체인 척**한다.
  집계는 전체 모집단 기준이라 서버 일이다(api-boundary.md 2절).

  Card 자신은 세로 패딩(--card-spacing)만 갖고 가로 패딩이 없다(CardContent가 있어야
  px가 붙는다) — 여기선 헤더/콘텐츠로 안 나누는 단순 카드라 px-4를 직접 준다.
*/

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

export default function OrgMetrics({ summary }: { summary: findPlatformSummary_Response }) {
  const { organizations, traineeCount, aiCost, storage } = summary
  const budgetPct = aiCost.budgetUsageRate == null ? null : Math.round(aiCost.budgetUsageRate * 100)
  const costChange = formatChangeRate(aiCost.changeRateVsPrevMonth)
  const storageChange = formatChangeRate(storage.changeRateVsPrevMonth)

  return (
    <div className="mb-5 grid grid-cols-4 gap-4">
      <MetricCard
        label="총 기관"
        value={`${organizations.total}`}
        sub={`활성 ${organizations.active} · 정지 ${organizations.suspended}`}
      />
      {/*
        `activeSessionCount`는 서버가 **항상 0**을 준다(세션 테이블이 아직 없다 — 스펙 명시).
        `활성 세션 0`을 그리면 "지금 아무도 안 하고 있다"는 거짓 정보가 되므로 그 줄을 뺐다.
        세션 API가 생기면 되살린다.
      */}
      <MetricCard label="총 교육생" value={traineeCount.toLocaleString()} />
      <MetricCard
        label="이번 달 AI 비용"
        value={formatCost(aiCost.totalCost, aiCost.currencyCode)}
        sub={
          <>
            예산 {formatCost(aiCost.totalMonthlyBudget, aiCost.currencyCode)} 대비{' '}
            {budgetPct == null ? (
              // 예산이 0이면 소진율이 null이다 — 나눌 수 없는 값을 0%로 그리지 않는다
              <span className="text-fg-subtle">— </span>
            ) : (
              <span className="text-warning font-semibold">{budgetPct}%</span>
            )}
            {costChange && (
              <>
                {' · 전월 '}
                <span className="text-danger font-bold">{costChange}</span>
              </>
            )}
          </>
        }
      >
        {/*
          Progress는 Track·Indicator를 스스로 렌더한다(components/ui/Progress.tsx) — children으로
          또 넣으면 바가 두 겹으로 그려진다. 막대 색은 data-slot 셀렉터로 입힌다.
        */}
        {budgetPct != null && (
          <Progress
            value={budgetPct}
            className="mt-2 gap-0 [&_[data-slot=progress-track]]:h-1.5 [&_[data-slot=progress-track]]:bg-warning-soft [&_[data-slot=progress-indicator]]:bg-warning"
          />
        )}
      </MetricCard>
      <MetricCard
        label="저장량"
        value={formatGb(storage.totalBytes)}
        sub={[
          storageChange && `전월 대비 ${storageChange}`,
          `기관 평균 ${formatGb(storage.averageBytesPerOrganization)}`,
        ]
          .filter(Boolean)
          .join(' · ')}
      />
    </div>
  )
}
