import type { ReactNode } from 'react'
import { AlertTriangleIcon } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table'
import { getOverviewSnapshot, type Org, type OrgDetail } from '../../mockData'

/*
  와이어프레임 `.metrics`(4카드) + `.oinfo`(기관 메타) + 기수 표(읽기전용).
  오퍼레이터 0명(#noop)이면 상단에 경고 배너가 초대를 유도한다 — 정의서 §3
  "이 목록의 핵심 신호"를 개요 탭에서도 그대로 이어간다.
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

export default function OverviewTab({ org, detail }: { org: Org; detail: OrgDetail }) {
  const snapshot = getOverviewSnapshot(org)
  const ongoingCount = detail.cohorts.filter((c) => c.status === 'ONGOING').length
  const endedCount = detail.cohorts.filter((c) => c.status === 'ENDED').length
  const activeOperatorNames = detail.operators
    .filter((o) => o.status === 'ACTIVE')
    .map((o) => o.name)
    .filter((n): n is string => Boolean(n))
  const unassigned = org.operators.length === 0

  return (
    <div className="flex flex-col gap-4">
      {unassigned && (
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
          value={`${detail.cohorts.length}`}
          sub={
            detail.cohorts.length === 0
              ? '개설된 기수 없음'
              : `진행 ${ongoingCount} · 종료 ${endedCount}`
          }
        />
        <MetricCard
          label="교육생"
          value={org.traineeCount.toLocaleString()}
          sub={
            org.traineeCount === 0
              ? '명단은 오퍼레이터가 등록'
              : `활성 세션 ${snapshot.activeSessions}`
          }
        />
        <MetricCard
          label="이번 달 AI 비용"
          value={`$${org.monthlyAiCostUsd.toLocaleString()}`}
          sub={`예산 $${snapshot.budgetUsd.toLocaleString()} 대비 ${snapshot.budgetPct}%`}
        >
          {/* Progress는 Track·Indicator를 스스로 렌더한다 — children으로 또 넣지 않는다
              (OrgMetrics.tsx의 같은 경고 참고). */}
          <Progress
            value={Math.min(snapshot.budgetPct, 100)}
            className="mt-2 gap-0 [&_[data-slot=progress-track]]:h-1.5 [&_[data-slot=progress-track]]:bg-warning-soft [&_[data-slot=progress-indicator]]:bg-warning"
          />
        </MetricCard>
        <MetricCard
          label="저장량"
          value={`${snapshot.storageGb} GB`}
          sub={
            snapshot.storageGb === 0
              ? '—'
              : snapshot.storageDeltaPct === null
                ? undefined
                : `전월 대비 +${snapshot.storageDeltaPct}%`
          }
        />
      </div>

      <dl className="grid grid-cols-3 gap-x-6 gap-y-3 rounded-md border border-border bg-surface p-4 text-sm">
        <InfoRow k="org_id" v={<span className="font-mono text-xs">{org.id}</span>} />
        <InfoRow
          k="상태"
          v={
            <Badge variant={org.status === 'ACTIVE' ? 'success' : 'neutral'}>
              {org.status === 'ACTIVE' ? '활성' : '정지'}
            </Badge>
          }
        />
        <InfoRow k="생성일" v={org.createdAt} />
        <InfoRow
          k="오퍼레이터"
          v={
            unassigned ? (
              <span className="text-warning font-semibold">미배정</span>
            ) : activeOperatorNames.length > 0 ? (
              activeOperatorNames.join(' · ')
            ) : (
              <span className="text-fg-subtle">—</span>
            )
          }
        />
        <InfoRow k="데이터 보존기간" v={`${detail.settings.retentionDays}일`} />
        <InfoRow k="공개 범위 기본값" v={detail.settings.defaultVisibility} />
      </dl>

      <div>
        <p className="text-fg-muted mb-2 text-xs font-bold">
          기수 <span className="text-fg-subtle font-normal">· 읽기전용</span>
        </p>
        {detail.cohorts.length === 0 ? (
          <p className="text-fg-subtle rounded-md border border-dashed border-border-strong bg-surface-2 p-6 text-center text-sm">
            아직 개설된 기수가 없습니다.
          </p>
        ) : (
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
              {detail.cohorts.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-bold">{c.label}</TableCell>
                  <TableCell>
                    <Badge variant={c.status === 'ONGOING' ? 'success' : 'neutral'}>
                      {c.status === 'ONGOING' ? '진행 중' : '종료'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{c.classCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.traineeCount}</TableCell>
                  <TableCell className="text-fg-muted text-xs">{c.period}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
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
