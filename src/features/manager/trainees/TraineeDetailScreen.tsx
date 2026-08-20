import { useParams } from 'react-router'
import ConsoleShell from '@/shells/ConsoleShell'
import { Alert, AlertTitle, AlertDescription, AlertAction } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import { Skeleton } from '@/components/ui/Skeleton'
import { isApiError } from '@/api/_contract'
import { useManagerCohort } from '@/stores/cohortScope'
import { DetailHeader } from './components/DetailHeader'
import { RoundReachGrid } from './components/RoundReachGrid'
import { Timeline } from './components/Timeline'
import { useTraineeDetail, useTraineeTimeline } from './_/api/api'

/*
  MG-06 · 이슈 #47 — 교육생 상세는 단일 타임라인이다. 회차 격자·배지는 **상세 조회**가
  주고, 그 사이 사건(이해도 확인·다시 보기·리포트·면담)은 **타임라인 조회**가 준다.
  서버가 두 조회로 나눈 이유가 있다 — 타임라인은 커서 페이징이고 격자는 아니다.

  ⚠ **조회 둘을 하나의 로딩으로 묶지 않는다**(async-states §2-1). 격자가 먼저 오면
  먼저 그린다 — 가장 느린 쪽에 맞추면 화면이 통째로 스피너가 된다.

  D-1(조회 권한 없는 교육생): 목일 때는 "id가 배열에 있나"로 갈랐는데, 이제 **서버가
  판정한다.** 매니저는 담당 반만 볼 수 있고 그 밖은 404(`MANAGER_SCOPE_NOT_FOUND`)로
  온다 — 빈 결과와 권한 없음이 다른 응답이라 화면이 둘을 구분해 말할 수 있다.
*/
/*
  스켈레톤 둘 — **높이를 이 화면에서 재서 박는다.** 눈대중으로 맞추면 도착할 때 그만큼
  튀고, 그러면 스켈레톤을 쓴 이유가 없어진다(`TableSkeleton` 주석과 같은 이유).

    머리 34 + mb 16 · 격자 183.6 + mb 16 · 이력 머리 30 · 회차 줄 38.6 · 이벤트 줄 47

  공용으로 올리지 않는다 — 쓰는 곳이 여기뿐이다(D14: 두 번째에 올린다).
*/
function HeadSkeleton() {
  return (
    <div aria-hidden>
      <div className="mb-4 flex h-[34px] items-center gap-3">
        <Skeleton className="size-[34px] rounded-full" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="border-border bg-surface mb-4 h-[183.6px] rounded-md border p-5">
        <Skeleton className="h-3.5 w-56" />
      </div>
    </div>
  )
}

/**
 * 회차 줄 + 기본으로 펼쳐지는 **최근 2회차**의 이벤트 자리(§4).
 *
 * `rounds`를 받는 이유 — 이력은 격자보다 늦게 온다(실측 5.6초 → 9.1초). 그 사이에는
 * **회차 수를 이미 안다**(격자가 왔다). 6으로 박아 두면 회차가 다른 사람에게 그만큼
 * 튄다 — 실제로 이벤트가 적은 교육생에서 34px 어긋났다.
 */
function TimelineSkeleton({ rounds = 6 }: { rounds?: number }) {
  return (
    <div aria-hidden>
      <div className="mb-3 flex h-[30px] items-center gap-2">
        <Skeleton className="h-3.5 w-10" />
        <Skeleton className="h-3 w-16" />
        <div className="ml-auto flex gap-1.5">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-[29px] w-16 rounded-full" />
          ))}
        </div>
      </div>
      <div className="border-border bg-surface overflow-hidden rounded-md border">
        {Array.from({ length: rounds }, (_, i) => (
          <div key={i}>
            <div className="border-border bg-surface-2 flex h-[38.6px] items-center border-t px-5 first:border-t-0">
              <Skeleton className="h-3 w-48" />
            </div>
            {i < 2 &&
              Array.from({ length: 2 }, (_, j) => (
                <div
                  key={j}
                  className="border-border flex h-[47px] items-center gap-4 border-t px-5"
                >
                  <Skeleton className="h-3 w-11" />
                  <Skeleton className="size-[22px] rounded-full" />
                  <Skeleton className="h-3 flex-1" />
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function TraineeDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const { cohortId, failed: cohortFailed, cohorts, selectCohort } = useManagerCohort()
  const detail = useTraineeDetail(cohortId, id)
  const timeline = useTraineeTimeline(cohortId, id)

  const notFound = detail.isError && isApiError(detail.error) && detail.error.status === 404

  return (
    /*
      🔴 기수를 안 넘기면 헤더가 `ConsoleShell`의 자리값 `7기`를 그린다 — 목록에서
      `9기`를 보다 상세로 들어오면 기수가 바뀐 것처럼 보인다(렌더에서 잡았다).
    */
    <ConsoleShell
      role="manager"
      cohort={cohortId ?? ''}
      cohorts={cohorts}
      onCohortChange={selectCohort}
    >
      {notFound || cohortFailed ? (
        <Alert variant="danger">
          <AlertTitle>조회 권한 없는 교육생입니다</AlertTitle>
          <AlertDescription>
            담당하는 반의 교육생만 볼 수 있습니다. 반 배정이 바뀌었을 수도 있어요.
          </AlertDescription>
        </Alert>
      ) : !detail.data && !detail.isError ? (
        /*
          ⚠ `isPending`이 아니라 **값이 있나 없나**로 가른다 — 기수를 아직 못 받아
          `enabled: false`인 동안에도 값은 없다(MG-03·05와 같은 판정).
        */
        <>
          <HeadSkeleton />
          <TimelineSkeleton />
        </>
      ) : !detail.data ? (
        /*
          D41 — `detail.data`가 아예 없을 때(최초 진입 실패)만 전면 에러로 막는다.
          배경 재조회만 실패한 경우는 아래 배너가 알리고 기존 화면을 그대로 보여준다
          (D46 패턴, decision-log D47).
        */
        <Empty>
          <EmptyHeader>
            <EmptyTitle>교육생 정보를 불러오지 못했습니다</EmptyTitle>
            <EmptyDescription>잠시 후 다시 시도해 주세요.</EmptyDescription>
          </EmptyHeader>
          <Button variant="ghost" onClick={() => detail.refetch()}>
            다시 시도
          </Button>
        </Empty>
      ) : (
        <>
          {detail.isError && (
            <Alert variant="warning" className="mb-4">
              <AlertTitle>교육생 정보를 새로고침하지 못했습니다</AlertTitle>
              <AlertDescription>마지막으로 불러온 정보를 보여드리고 있어요.</AlertDescription>
              <AlertAction>
                <Button variant="ghost" size="sm" onClick={() => void detail.refetch()}>
                  다시 시도
                </Button>
              </AlertAction>
            </Alert>
          )}
          <DetailHeader
            name={detail.data.name}
            cohortName={detail.data.cohortName}
            className={detail.data.className}
            riskKind={detail.data.riskCode}
            why={detail.data.riskWhy}
          />
          <RoundReachGrid rounds={detail.data.rounds} />

          {/* 이력만 따로 늦게 온다 — 격자를 기다리게 하지 않는다 */}
          {!timeline.data && !timeline.isError ? (
            <TimelineSkeleton rounds={detail.data.rounds.length} />
          ) : !timeline.data ? (
            <Empty>
              <EmptyTitle>이력을 불러오지 못했습니다</EmptyTitle>
              <EmptyDescription>잠시 후 다시 시도해 주세요.</EmptyDescription>
              <Button variant="ghost" onClick={() => timeline.refetch()}>
                다시 시도
              </Button>
            </Empty>
          ) : (
            <>
              {timeline.isError && (
                <Alert variant="warning" className="mb-4">
                  <AlertTitle>이력을 새로고침하지 못했습니다</AlertTitle>
                  <AlertDescription>마지막으로 불러온 이력을 보여드리고 있어요.</AlertDescription>
                  <AlertAction>
                    <Button variant="ghost" size="sm" onClick={() => void timeline.refetch()}>
                      다시 시도
                    </Button>
                  </AlertAction>
                </Alert>
              )}
              <Timeline
                groups={timeline.data}
                traineeId={detail.data.id}
                badges={Object.fromEntries(
                  detail.data.rounds.map((r) => [r.assessmentRoundId, r.badge]),
                )}
              />
            </>
          )}
        </>
      )}
    </ConsoleShell>
  )
}
