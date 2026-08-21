import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/Empty'
import ConsoleShell from '@/shells/ConsoleShell'
import HomeSkeleton from './components/HomeSkeleton'
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
          <HomeSkeleton />
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
              「이번 회차 리포트」 줄을 지웠다(2026-08-21). **목적지가 갈렸을 때만 필요한
              우회로였다** — 카드 버튼이 세션으로 가던 시절에 "일단 읽고 싶다"는 학생의
              길이었는데, 이제 카드 버튼도 리포트로 간다. 같은 곳으로 가는 링크가 둘이면
              학생이 매번 "뭐가 다르지"를 고른다.
            */}

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
                        **`canViewReport`를 서버가 판정한다.** 아직 발행 전이면 false라
                        링크를 걸지 않는다 — 화면이 발행 상태를 다시 보지 않는다.
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
