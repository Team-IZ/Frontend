import { useNavigate, useSearchParams } from 'react-router'
import ConsoleShell from '@/shells/ConsoleShell'
import { useManagerCohort } from '@/stores/cohortScope'
import PageHeader from '@/components/common/PageHeader'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import { Alert, AlertTitle, AlertDescription, AlertAction } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import TableSkeleton from '@/components/common/TableSkeleton'
import { SlowNotice } from '@/components/common/Loading'
import StaleBlock from '@/components/common/StaleBlock'
import { errorCopy } from '@/lib/errorCopy'
import { useInbox } from './_/api/api'
import type { InboxBand } from './_/api/types'
import RunLine from './components/RunLine'
import InboxRow, { briefPath } from './components/InboxRow'

/*
  MG-01 매니저 대시보드 — "오늘 누구부터 처리할지" 한 목록(정의서 §1). 지표판이
  아니라 인박스라 KPI 카드 그리드는 없다. 정렬은 밴드 순서로 고정이고 사용자가
  못 고른다(MG-03 정렬과 같은 원칙).

  🔴 **「지난 방문 이후」/「전체」 칩을 걷어냈다.** 마지막 방문 시각을 **아무도
  갖고 있지 않다** — 응답에도 없고 우리 저장소에도 없다(목은 `7/26 14:20`이라는
  고정 문자열이었다). 서버 `since` 인자는 있는데 넣을 값이 없다. 지어낸 기준으로
  목록을 반 토막 내면 "새로 생긴 일이 없다"가 거짓말이 된다(36차 R4).

  🔴 **「처리됨 N」 접이 섹션도 걷어냈다.** 해소 이력을 주는 조회가 없다.

  🔴 **[체크] 버튼도 없다** — 사유는 `InboxRow.tsx` 머리말에.

  ⚠ **면담이 이 프로젝트의 회차 것만 온다.** 실데이터는 2~6차에 25건이 대기
  중인데 이 화면은 고른 프로젝트의 회차만 그린다(`_/api/api.ts` 참고, 36차 R5).
*/

const BAND_LABEL: Record<InboxBand, string> = {
  1: '응시 못 한 사람',
  2: '확인 필요',
  3: '면담 대기',
  4: '미제출·분석 실패',
}
const BAND_ORDER: InboxBand[] = [1, 2, 3, 4]

/**
 * [면담 목록에서 확인] 이동 — 그 사람이 뜨는 회차·반을 URL 쿼리로 미리 걸어
 * 준다(사용자 지시). 목록 화면(`InterviewListScreen`)이 세션 필터보다 이 값을
 * 우선해 읽는다 — `interviews/filterState.ts`를 직접 import하지 않는 이유는
 * feature 간 교차 import 금지(`no-restricted-imports`) 때문이다.
 */
function interviewsListPath(
  roundId: string,
  classId: string | null,
  cohortId: string | undefined,
): string {
  const params = new URLSearchParams({ round: roundId })
  /* ⚠ **`classId`다 — 반 이름이 아니다.** 목록의 `?class=`가 그대로 서버로 나간다 */
  if (classId) params.set('class', classId)
  /*
    🔴 33차 §9 — 기수를 안 실으면 목록이 `useManagerCohort`의 기본값(진행 중인
    기수)으로 물러선다. 면담 목록 조회는 `cohort`가 **필수**라, 여기서 빠뜨리면
    보고 있던 기수가 아닌 곳의 회차를 조회한다.
  */
  if (cohortId) params.set('cohort', cohortId)
  return `/manager/interviews?${params.toString()}`
}

export default function DashboardScreen() {
  const navigate = useNavigate()
  const { cohortId, cohortName, failed, cohorts, selectCohort } = useManagerCohort()
  /*
    **프로젝트 스코프는 주소가 갖는다**(규칙 J). 세션 메모리에 두고 있었는데,
    그러면 ① 다른 화면이 「이 프로젝트의 할 일」로 보낼 수 없고 ② 새로고침에
    안 따라오고 ③ 브리프를 열었다 뒤로가기로 돌아올 때 원래 화면인지 우연인지
    구분이 안 된다. 주소에 두면 셋 다 저절로 된다.

    ⚠ `replace: true` — 프로젝트를 바꾼 것은 **다른 화면으로 간 것이 아니라**
    같은 화면의 범위를 바꾼 것이라, 뒤로가기가 그 횟수만큼 걸리면 안 된다.

    ⚠ 주소의 값이 목록에 없으면(지워진 프로젝트 링크) 어댑터가 진행 중인 것으로
    떨어뜨린다 — 아래 `data.projectId`가 실제로 고른 것을 되돌려 준다.
  */
  const [params, setParams] = useSearchParams()
  const picked = params.get('project')
  const setPicked = (v: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('project', v)
        return next
      },
      { replace: true },
    )

  const inbox = useInbox(cohortId, picked ?? undefined)
  const data = inbox.data

  const shell = (children: React.ReactNode) => (
    <ConsoleShell
      role="manager"
      cohort={cohortId ?? ''}
      cohorts={cohorts}
      onCohortChange={selectCohort}
    >
      <PageHeader
        breadcrumb={['대시보드', cohortName, '담당 반'].filter(Boolean).join(' › ')}
        title="대시보드"
        /*
          🔴 **아직 오는 중이면 개수를 안 적는다**(컨트롤 전수에서 잡았다).
          목록 조회들이 옛 값을 들고 있어서, `PLANNED` 프로젝트로 바꾸면
          본문은 스켈레톤인데 **머리만 직전 프로젝트의 「2건」을 계속 말했다.**
          비우는 것과 틀린 수를 말하는 것 중에는 비우는 쪽이다(규칙 D).
        */
        /* 실패 화면에서도 이 머리를 쓴다 — 그때 개수를 적으면 본문과 다른 말이 된다 */
        count={
          data && !inbox.isError && !data.runPending && !data.itemsPending
            ? `${data.items.length}건`
            : undefined
        }
      />
      {children}
    </ConsoleShell>
  )

  if (failed) {
    return shell(
      <Empty>
        <EmptyHeader>
          <EmptyTitle>담당 기수가 없습니다</EmptyTitle>
          <EmptyDescription>반 배정이 끝나면 할 일이 여기에 쌓입니다.</EmptyDescription>
        </EmptyHeader>
      </Empty>,
    )
  }

  /*
    ⚠ `isPending`이 아니라 **값 유무**로 가른다(하드닝 규칙 E) — 기수를 아직 못
    받아 `enabled: false`인 동안 `isPending`이 거짓이라 빈 화면이 스친다.

    조회 넷 중 가장 느린 것이 `/projects`(실측 7.0초)라 그동안 자리를 잡아 둔다.
  */
  if (!data && !inbox.isError) {
    return shell(
      <>
        <div className="border-border bg-surface mb-5 h-[49px] rounded-md border" aria-hidden />
        <TableSkeleton
          rows={6}
          cols={['w-[92px]', 'w-[130px]', null, 'w-24']}
          rowH={53}
          footerH={0}
        />
        <SlowNotice />
      </>,
    )
  }

  if (!data) {
    /*
      D41 — `data`가 아예 없을 때(최초 진입 실패)만 전면 에러로 막는다. 배경
      재조회만 실패했으면(`projects.isError`나 `progress.isError`) 아래 정상
      렌더에서 배너로만 알린다 — `useInbox`(`_/api/api.ts`)는 이미 그렇게
      짜여 있었고, 버그는 이 화면의 소비 조건에 있었다(D46 패턴, decision-log D47).

      ⚠ `action`을 주지 않는다 — 이 인자는 **어간**을 받아 `${action}하지`로 붙는다
      (「삭제」→「삭제하지」). 「불러오기」를 넘겼더니 **「불러오기하지 못했습니다」**가
      나왔다(가로채기에서 잡았다). 빼면 기본이 「불러오지 못했습니다」다.
    */
    const copy = errorCopy(inbox.error, { subject: '할 일 목록' })
    return shell(
      <Empty variant="failed">
        <EmptyHeader>
          <EmptyTitle>{copy.title}</EmptyTitle>
          <EmptyDescription>{copy.description}</EmptyDescription>
        </EmptyHeader>
        {copy.retry && (
          <Button variant="ghost" onClick={inbox.refetch}>
            다시 시도
          </Button>
        )}
      </Empty>,
    )
  }

  return shell(
    <>
      {inbox.isError && (
        <Alert variant="warning" className="mb-4">
          <AlertTitle>할 일 목록을 새로고침하지 못했습니다</AlertTitle>
          <AlertDescription>마지막으로 불러온 목록을 보여드리고 있어요.</AlertDescription>
          <AlertAction>
            <Button variant="ghost" size="sm" onClick={inbox.refetch}>
              다시 시도
            </Button>
          </AlertAction>
        </Alert>
      )}
      <RunLine
        projects={data.projects}
        projectId={data.projectId}
        onProjectChange={setPicked}
        run={data.run}
        pending={data.runPending}
      />

      <StaleBlock stale={inbox.isStale} label="할 일을 불러오는 중">
        {data.runPending || data.itemsPending ? (
          /* 아직 다 안 왔다 — **절반짜리 목록을 완성된 것처럼 그리지 않는다** */
          <TableSkeleton
            rows={4}
            cols={['w-[92px]', 'w-[130px]', null, 'w-24']}
            rowH={53}
            footerH={0}
          />
        ) : !data.run ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>진행 중인 프로젝트가 없습니다</EmptyTitle>
              <EmptyDescription>
                위에서 프로젝트를 고르면 그 회차의 할 일을 볼 수 있습니다.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : data.items.length === 0 && Object.keys(data.failedBands).length === 0 ? (
          <Empty className="bg-surface border-solid">
            <EmptyHeader className="max-w-md">
              <EmptyTitle>지금은 처리할 일이 없습니다</EmptyTitle>
              <EmptyDescription>미응시도, 확인할 판정도, 대기 중인 면담도 없어요.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="border-border bg-surface overflow-hidden rounded-md border">
            {BAND_ORDER.map((band) => {
              const items = data.items.filter((i) => i.band === band)
              /* 실패 문구·재시도 여부는 **서버 코드가 정한다**(규칙 I) */
              const bandError = data.failedBands[band]
              const failed = band in data.failedBands
              const bandCopy = failed
                ? errorCopy(bandError, { subject: BAND_LABEL[band] })
                : undefined
              if (items.length === 0 && !failed) return null
              return (
                <section key={band} aria-label={`${BAND_LABEL[band]} ${items.length}건`}>
                  <h2 className="bg-surface-2 text-fg-subtle border-border border-t px-5 py-1.5 text-2xs font-bold tracking-wide">
                    {BAND_LABEL[band]}
                  </h2>
                  {/*
                    🔴 **그 줄만 실패로 표시한다**(`async-states` §3-5). 조회 하나가
                    죽었다고 화면을 통째로 덮으면 멀쩡한 나머지 밴드까지 못 본다 —
                    가로채기에서 signals 하나가 500일 때 22건이 통째로 사라졌다.
                  */}
                  {bandCopy && (
                    <Alert
                      variant={bandCopy.tone === 'pending' ? 'info' : 'danger'}
                      className="rounded-none border-x-0 border-t-0"
                    >
                      <AlertTitle>{bandCopy.title}</AlertTitle>
                      <AlertDescription>{bandCopy.description}</AlertDescription>
                      {/* 🔴 다시 눌러도 같은 답이면 버튼을 안 그린다 — 403이 그렇다 */}
                      {bandCopy.retry && (
                        <AlertAction>
                          <Button variant="ghost" size="sm" onClick={inbox.refetch}>
                            다시 시도
                          </Button>
                        </AlertAction>
                      )}
                    </Alert>
                  )}
                  {/*
                    🔴 **목록에 시맨틱이 없었다**(키보드 축에서 잡았다). `div` 더미라
                    스크린리더가 「몇 건 중 몇 번째」를 못 읽고 밴드 경계도 안 읽혔다.
                    밴드는 `section`(이름에 건수를 넣는다), 행은 `ul > li`다.
                  */}
                  <ul>
                    {items.map((item) => (
                      <InboxRow
                        key={item.id}
                        item={item}
                        projectId={data.projectId}
                        cohortId={cohortId}
                        onOpenBrief={() =>
                          item.kind === 'INTERVIEW' &&
                          navigate(briefPath(item.caseId, item.briefState, cohortId))
                        }
                        onReviewVoid={() =>
                          item.kind === 'INVALID' &&
                          navigate(
                            interviewsListPath(item.assessmentRoundId, item.classId, cohortId),
                          )
                        }
                      />
                    ))}
                  </ul>
                </section>
              )
            })}
          </div>
        )}
      </StaleBlock>
    </>,
  )
}
