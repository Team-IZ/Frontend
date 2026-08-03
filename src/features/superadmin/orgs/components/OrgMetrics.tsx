import type { ReactNode } from 'react'
import { Card } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'
import type { Org } from '../mockData'
import { PLATFORM_SNAPSHOT } from '../mockData'

/*
  와이어프레임 `.metrics`(4카드) — v1 콘솔 셸을 그대로 쓴다는 문서 첫머리 설명대로,
  기관별 데이터가 아닌 플랫폼 스냅샷이다. PageHeader의 총 개수를 여기서 대신하므로
  (CLAUDE.md §6 "메트릭 카드가 있으면 제목 총개수 생략") PageHeader엔 count를 안 준다.

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

export default function OrgMetrics({ orgs }: { orgs: Org[] }) {
  const activeCount = orgs.filter((o) => o.status === 'ACTIVE').length
  const suspendedCount = orgs.filter((o) => o.status === 'SUSPENDED').length
  const totalTrainees = orgs.reduce((sum, o) => sum + o.traineeCount, 0)
  const totalCostUsd = orgs.reduce((sum, o) => sum + o.monthlyAiCostUsd, 0)
  const budgetPct = Math.round((totalCostUsd / PLATFORM_SNAPSHOT.budgetUsd) * 100)
  const storageAvg = (PLATFORM_SNAPSHOT.storageGb / Math.max(orgs.length, 1)).toFixed(1)

  return (
    <div className="mb-5 grid grid-cols-4 gap-4">
      <MetricCard
        label="총 기관"
        value={`${orgs.length}`}
        sub={`활성 ${activeCount} · 정지 ${suspendedCount}`}
      />
      <MetricCard
        label="총 교육생"
        value={totalTrainees.toLocaleString()}
        sub={`활성 세션 ${PLATFORM_SNAPSHOT.activeSessions}`}
      />
      <MetricCard
        label="이번 달 AI 비용"
        value={`$${totalCostUsd.toLocaleString()}`}
        sub={
          <>
            예산 ${PLATFORM_SNAPSHOT.budgetUsd.toLocaleString()} 대비{' '}
            <span className="text-warning font-semibold">{budgetPct}%</span> · 전월{' '}
            <span className="text-danger font-bold">+{PLATFORM_SNAPSHOT.costDeltaPct}%</span>
          </>
        }
      >
        {/*
          Progress는 Track·Indicator를 스스로 렌더한다(components/ui/Progress.tsx) — children으로
          또 넣으면 바가 두 겹으로 그려진다(app/UiPreviewScreen.tsx의 같은 경고 참고). 막대 색은
          data-slot 셀렉터로 자동 렌더된 Indicator에 입힌다 — 64%(budgetPct)와 같은 warning 계열.
        */}
        <Progress
          value={budgetPct}
          className="mt-2 gap-0 [&_[data-slot=progress-track]]:h-1.5 [&_[data-slot=progress-indicator]]:bg-warning"
        />
      </MetricCard>
      <MetricCard
        label="저장량"
        value={`${PLATFORM_SNAPSHOT.storageGb} GB`}
        sub={`전월 대비 +${PLATFORM_SNAPSHOT.storageDeltaPct}% · 기관 평균 ${storageAvg}GB`}
      />
    </div>
  )
}
