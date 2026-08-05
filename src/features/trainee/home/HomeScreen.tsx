import { useCallback } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/Empty'
import { Spinner } from '@/components/ui/Spinner'
import { useAsync } from '@/lib/useAsync'
import ConsoleShell from '@/shells/ConsoleShell'
import { getHome } from './api'
import RoundListRow from './components/RoundListRow'
import StatusCard from './components/StatusCard'
import type { RoundStatus } from './types'

/*
  TR-01 교육생 홈 — "지금 무엇을 해야 하는지" 카드 하나.

  상태 9종(회차 없음 포함)은 전부 서버가 정한 `currentRound.status` 하나로 갈린다 —
  화면이 제출·분석·응시 여부를 조합해 유추하지 않는다(api-boundary.md §1 ②).

  ?state= 는 API 명세가 없는 지금, 상태 9종 + 조회 실패를 눌러서 확인하기 위한
  dev 전용 오버라이드다(mock-first-screens.md §1-4 "조건 × 상태 표"). 연동 시
  `api.ts`의 `previewStatus` 파라미터와 함께 지운다 — 실서버는 이 값을 안 받는다.
*/
const PREVIEW_TO_STATUS: Record<string, RoundStatus | 'NONE' | 'ERROR'> = {
  todo: 'NOT_SUBMITTED',
  analyzing: 'ANALYZING',
  ready: 'READY_TO_VERIFY',
  done: 'VERIFY_DONE',
  retry: 'RETRY_AVAILABLE',
  failed: 'ANALYSIS_FAILED',
  closed: 'VERIFICATION_CLOSED',
  missed: 'SUBMISSION_CLOSED',
  none: 'NONE',
  error: 'ERROR',
}

export default function HomeScreen() {
  const [searchParams] = useSearchParams()
  const previewKey = searchParams.get('state')
  const previewStatus = previewKey ? PREVIEW_TO_STATUS[previewKey] : undefined

  const load = useCallback(() => getHome(previewStatus), [previewStatus])
  const page = useAsync(load)

  return (
    <ConsoleShell role="trainee">
      <div className="mx-auto max-w-[860px]">
        {page.loading ? (
          <div className="flex justify-center py-16">
            <Spinner className="size-6" aria-label="홈을 불러오는 중" />
          </div>
        ) : page.failed || !page.data ? (
          <Empty className="border-solid bg-danger-soft border-danger-border">
            <EmptyHeader>
              <EmptyTitle>홈을 불러오지 못했습니다</EmptyTitle>
              <EmptyDescription>잠시 후 다시 시도해 주세요.</EmptyDescription>
            </EmptyHeader>
            <Button variant="ghost" onClick={page.reload}>
              다시 시도
            </Button>
          </Empty>
        ) : (
          <div className="flex flex-col gap-6">
            <div>
              <div className="mb-2 text-xs font-semibold text-fg-subtle">지금 할 일</div>
              {page.data.currentRound ? (
                <StatusCard round={page.data.currentRound} onVerifyWindowExpire={page.reload} />
              ) : (
                <Card className="bg-surface-2 p-5">
                  <div className="text-sm text-fg-subtle">
                    {page.data.scope.cohort} · {page.data.scope.classTeam}
                  </div>
                  <h3 className="mt-1 text-lg font-semibold text-fg">
                    지금은 예정된 일정이 없어요
                  </h3>
                  <p className="mt-2 text-sm text-fg-muted">
                    다음 프로젝트가 시작되면 여기에 표시됩니다.
                  </p>
                </Card>
              )}
            </div>

            {page.data.currentRound?.status === 'RETRY_AVAILABLE' && (
              <div>
                <div className="mb-2 text-xs font-semibold text-fg-subtle">이번 회차 리포트</div>
                <Card className="gap-0 divide-y divide-border py-0">
                  <RoundListRow
                    kind="past"
                    label={page.data.currentRound.roundLabel}
                    detail="발행됨 · 자세한 해설은 다시 보기 후 열려요"
                    to={`/trainee/report?round=${page.data.currentRound.reportRoundId}`}
                  />
                </Card>
              </div>
            )}

            {page.data.upcomingRound && (
              <div>
                <div className="mb-2 text-xs font-semibold text-fg-subtle">예정</div>
                <Card className="gap-0 divide-y divide-border py-0">
                  <RoundListRow
                    kind="upcoming"
                    label={page.data.upcomingRound.roundLabel}
                    detail={page.data.upcomingRound.scheduleLabel}
                  />
                </Card>
              </div>
            )}

            <div>
              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-fg-subtle">
                지난 회차
                <Link to="/trainee/report" className="font-medium text-primary hover:underline">
                  전체 보기 → 내 리포트
                </Link>
              </div>
              {page.data.pastRounds.length === 0 ? (
                <Empty>
                  <EmptyDescription>아직 지난 회차가 없어요.</EmptyDescription>
                </Empty>
              ) : (
                <Card className="gap-0 divide-y divide-border py-0">
                  {page.data.pastRounds.map((r) => (
                    <RoundListRow
                      key={r.id}
                      kind="past"
                      label={r.roundLabel}
                      detail={r.summary}
                      to={`/trainee/report?round=${r.id}`}
                    />
                  ))}
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </ConsoleShell>
  )
}
