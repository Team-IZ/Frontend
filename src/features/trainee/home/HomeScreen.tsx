import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/Empty'
import { Spinner } from '@/components/ui/Spinner'
import ConsoleShell from '@/shells/ConsoleShell'
import { useHome } from './_/api/api'
import { pastSummary, upcomingSchedule } from './labels'
import RoundListRow from './components/RoundListRow'
import StatusCard from './components/StatusCard'

/*
  TR-01 교육생 홈 — "지금 무엇을 해야 하는지" 카드 하나.

  **요청 하나로 세 구획이 다 온다**(`GET /assessment-rounds`). 서버가 대표 상태·기본
  버튼·경고 배지를 계산해서 주므로 화면은 제출·분석·응시 여부를 조합하지 않는다
  (api-boundary §1-②).

  **"회차 없음" 분기가 없다.** 진행 회차가 없으면 서버가 `NO_ACTIVE_ROUND` 합성 카드를
  만들어 주므로 `current`는 항상 있다 — 목일 때 있던 `currentRound === null` 갈래가
  연동하면서 사라졌다.
*/
export default function HomeScreen() {
  const { data, isPending, isError, refetch } = useHome()

  return (
    <ConsoleShell role="trainee">
      <div className="mx-auto max-w-[860px]">
        {isPending ? (
          <div className="flex justify-center py-16">
            <Spinner className="size-6" aria-label="홈을 불러오는 중" />
          </div>
        ) : isError || !data ? (
          <Empty className="border-solid bg-danger-soft border-danger-border">
            <EmptyHeader>
              <EmptyTitle>홈을 불러오지 못했습니다</EmptyTitle>
              <EmptyDescription>잠시 후 다시 시도해 주세요.</EmptyDescription>
            </EmptyHeader>
            <Button variant="ghost" onClick={() => refetch()}>
              다시 시도
            </Button>
          </Empty>
        ) : (
          <div className="flex flex-col gap-6">
            <div>
              <div className="mb-2 text-xs font-semibold text-fg-subtle">지금 할 일</div>
              <StatusCard round={data.current} onVerifyWindowExpire={() => refetch()} />
            </div>

            {/*
              이번 회차 리포트 — 다시 보기 대상일 때만. 카드의 CTA는 다시 보기로 가므로
              리포트로 가는 길을 여기 따로 둔다(어디를 다시 볼지는 리포트가 알려준다).
            */}
            {data.current.status === 'REVIEW_REQUIRED' &&
              data.current.canViewReport &&
              data.current.reportId && (
                <div>
                  <div className="mb-2 text-xs font-semibold text-fg-subtle">이번 회차 리포트</div>
                  <Card className="gap-0 divide-y divide-border py-0">
                    <RoundListRow
                      kind="past"
                      label={data.current.roundName ?? '이번 회차'}
                      detail="발행됨 · 자세한 해설은 다시 보기 후 열려요"
                      to={`/trainee/report?round=${data.current.id}`}
                    />
                  </Card>
                </div>
              )}

            {data.upcoming.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-semibold text-fg-subtle">예정</div>
                <Card className="gap-0 divide-y divide-border py-0">
                  {data.upcoming.map((r) => (
                    <RoundListRow
                      key={r.id}
                      kind="upcoming"
                      label={r.roundName}
                      detail={upcomingSchedule(
                        r.assessmentOpenAt,
                        r.assessmentDueAt,
                        r.submissionDueAt,
                      )}
                    />
                  ))}
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
              {data.past.length === 0 ? (
                <Empty>
                  <EmptyDescription>아직 지난 회차가 없어요.</EmptyDescription>
                </Empty>
              ) : (
                <Card className="gap-0 divide-y divide-border py-0">
                  {data.past.map((r) => (
                    <RoundListRow
                      key={r.id}
                      kind="past"
                      label={r.roundName}
                      detail={pastSummary(r.status, r.completedReviewCount)}
                      /*
                        **`canViewReport`를 서버가 판정한다.** 매니저가 아직 안 열었으면
                        false라 링크를 걸지 않는다 — 화면이 발행 상태를 다시 보지 않는다.
                      */
                      to={
                        /*
                          **회차 id를 넘긴다** — 리포트 화면이 회차로 찾는다.
                          `reportId`를 넘기면 못 찾아 화면이 통째로 터진다(실측).
                        */
                        r.canViewReport && r.reportId ? `/trainee/report?round=${r.id}` : undefined
                      }
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
