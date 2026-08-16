import { useParams } from 'react-router'
import ConsoleShell from '@/shells/ConsoleShell'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import { Spinner } from '@/components/ui/Spinner'
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
export default function TraineeDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const { cohortId, cohortName, failed: cohortFailed, cohorts, selectCohort } = useManagerCohort()
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
      cohort={cohortName ?? ''}
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
      ) : detail.isPending ? (
        <div className="flex justify-center py-16">
          <Spinner className="size-6" aria-label="교육생 정보를 불러오는 중" />
        </div>
      ) : detail.isError || !detail.data ? (
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
          <DetailHeader
            name={detail.data.name}
            cohortName={detail.data.cohortName}
            className={detail.data.className}
            riskKind={detail.data.riskCode}
            why={detail.data.riskWhy}
          />
          <RoundReachGrid rounds={detail.data.rounds} />

          {/* 이력만 따로 늦게 온다 — 격자를 기다리게 하지 않는다 */}
          {timeline.isPending ? (
            <div className="flex justify-center py-10">
              <Spinner className="size-5" aria-label="이력을 불러오는 중" />
            </div>
          ) : timeline.isError || !timeline.data ? (
            <Empty>
              <EmptyTitle>이력을 불러오지 못했습니다</EmptyTitle>
              <EmptyDescription>잠시 후 다시 시도해 주세요.</EmptyDescription>
              <Button variant="ghost" onClick={() => timeline.refetch()}>
                다시 시도
              </Button>
            </Empty>
          ) : (
            <Timeline
              groups={timeline.data}
              traineeId={detail.data.id}
              badges={Object.fromEntries(
                detail.data.rounds.map((r) => [r.assessmentRoundId, r.badge]),
              )}
            />
          )}
        </>
      )}
    </ConsoleShell>
  )
}
