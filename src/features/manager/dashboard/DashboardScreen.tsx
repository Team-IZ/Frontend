import { Fragment, useCallback, useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import ConsoleShell from '@/shells/ConsoleShell'
import { useManagerCohort } from '@/stores/cohortScope'
import PageHeader from '@/components/common/PageHeader'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import { Alert, AlertTitle, AlertAction } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils/cn'
import { useAsync } from '@/lib/useAsync'
import {
  getInbox,
  markContacted,
  type InboxItem,
  type InboxScope,
  type ItemBand,
  type RoundId,
} from './mockData'
import { getSessionView, setSessionView } from './viewState'
import RunLine from './components/RunLine'
import InboxRow, { briefPath } from './components/InboxRow'
import ResolvedRow from './components/ResolvedRow'

/*
  MG-01 매니저 대시보드 — "오늘 누구부터 처리할지" 한 목록(정의서 §1). 지표판이
  아니라 인박스라 KPI 카드 그리드는 없다 — 정렬은 `mockData.ts`가 밴드 순서로
  이미 고정해 둔다(사용자가 못 고른다, MG-03 정렬과 같은 원칙).

  ⚠ **프로젝트 select 추가(사용자 지시, 2026-08-08)** — 원래 "회차 필터가
  없다"(정의서 §1)였는데, 교육생·히트맵·면담 화면처럼 프로젝트 select로
  바꿨다. 처음엔 `HeatmapToolbar`처럼 별도 툴바 줄로 얹었는데, "한 줄로
  합쳐서 `RunLine`의 회차 라벨 자리를 대신하라"는 지적을 받아 `RunLine`
  내부로 옮겼다(`RunLine.tsx` 참고). `지난 방문 이후`/`전체` 필터는 회차
  select와 별개로 그대로 남는다(고른 회차 안에서의 시간 범위 필터라 서로
  안 겹친다).

  ⚠ **기본값·세션 기억(사용자 지시, 2026-08-08)** — 기본 회차는 가장 최근에
  생성된 프로젝트(`viewState.ts` 참고, heatmap과 같은 패턴). [브리프 열기]로
  면담 화면에 갔다가 뒤로가기로 돌아오면 이 화면이 다시 마운트되는데, 그때도
  방금 보던 회차를 그대로 유지한다 — `useState` 기본값으로만 두면 매번
  "가장 최근 프로젝트"로 리셋돼 버린다.

  **행에서 바로 처리한다**(정의서 §2) — 독촉은 이 화면 안에서 끝나고(모달 없음,
  MG-08과 같은 규약·다른 진입점), 무효 응시·면담만 다른 화면으로 넘어간다.
*/

const BAND_LABEL: Record<ItemBand, string> = {
  1: '마감 임박',
  2: '확인 필요',
  3: '면담 대기',
  4: '미제출',
}
const BAND_ORDER: ItemBand[] = [1, 2, 3, 4]

/**
 * [면담 목록에서 확인] 이동 — 그 사람이 뜨는 회차·반을 URL 쿼리로 미리 걸어
 * 준다(사용자 지시). 목록 화면(`InterviewListScreen`)이 세션 필터보다 이 값을
 * 우선해 읽는다 — `interviews/filterState.ts`를 직접 import하지 않는 이유는
 * feature 간 교차 import 금지(`no-restricted-imports`) 때문이다(D14 계열과
 * 같은 경계).
 */
function interviewsListPath(roundId: string, className: string): string {
  const params = new URLSearchParams({ round: roundId, class: className })
  return `/manager/interviews?${params.toString()}`
}

export default function DashboardScreen() {
  const navigate = useNavigate()
  /* 본문은 아직 목이지만 **스코프는 진짜다** — 헤더가 옆 화면과 다른 기수를 말하면 안 된다 */
  const { cohortName, cohorts, selectCohort } = useManagerCohort()
  const initial = getSessionView()
  const [round, setRound] = useState<RoundId>(initial.round)
  const [scope, setScope] = useState<InboxScope>('RECENT')
  const [foldOpen, setFoldOpen] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)

  useEffect(() => {
    setSessionView({ round })
  }, [round])

  const load = useCallback(() => getInbox(scope, round), [scope, round])
  const page = useAsync(load)
  const data = page.data

  // 실제로 메시지를 보내는 게 아니라 매니저가 직접 연락한 뒤 스스로 체크하는
  // 동작이라(D56 C절) 실패 분기가 없다 — 두 결과 다 화면을 새로고침한다.
  // ⚠ 정정(2026-08-08): 행은 "처리됨" 접이 섹션으로 내려가지 않는다 — 그
  // 섹션(`RESOLVED_HISTORY`)은 고정 시드고 이 액션과 무관하다. 실제로는
  // 같은 밴드 안에 남아 회색으로 흐려지고 버튼이 "체크함 · 방금" 텍스트로
  // 바뀐다(InboxRow `done` 분기). 이전에 반대로 적어놨던 주석 때문에 검증
  // 체크리스트도 잘못 안내했었다.
  async function handleContact(item: InboxItem) {
    setPendingId(item.id)
    try {
      const res = await markContacted(item.id)
      if (res.kind === 'ALREADY_RESOLVED') {
        toast('이미 제출했습니다')
      }
      page.reload()
    } finally {
      setPendingId(null)
    }
  }

  const byBand = (band: ItemBand) => data?.items.filter((i) => i.band === band) ?? []

  return (
    <ConsoleShell
      role="manager"
      cohort={cohortName ?? ''}
      cohorts={cohorts}
      onCohortChange={selectCohort}
    >
      {/*
        🔴 **기수는 헤더에 항상 있어야 한다**(사용자 지시). 이 화면은 아직 목이라
        `7기`가 빵부스러기에 박혀 있었고 헤더 스위처는 아예 비어 있었다 — 옆 화면들이
        `9기`를 말하는데 여기만 `7기`라 **같은 사람이 다른 기수를 보고 있는 것처럼**
        보였다. 본문이 목이어도 **스코프는 진짜를 쓴다.**
      */}
      <PageHeader
        breadcrumb={['대시보드', cohortName, '담당 반'].filter(Boolean).join(' › ')}
        title="대시보드"
      />

      {page.loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="size-6" aria-label="대시보드를 불러오는 중" />
        </div>
      ) : page.failed ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>불러오지 못했습니다</EmptyTitle>
            <EmptyDescription>잠시 후 다시 시도해 주세요.</EmptyDescription>
          </EmptyHeader>
          <Button variant="ghost" onClick={page.reload}>
            다시 시도
          </Button>
        </Empty>
      ) : (
        data && (
          <>
            <RunLine
              round={round}
              onRoundChange={setRound}
              run={data.run}
              nextRoundLabel="미프 4차 제출 시작 07-29"
            />

            <div className="mb-3 flex items-baseline gap-2">
              <span className="text-lg font-bold">할 일</span>
              <span className="text-primary text-lg font-bold tabular-nums">
                {data.items.length}
              </span>
              <span className="ml-auto flex items-center gap-2">
                <ScopeChip active={scope === 'RECENT'} onClick={() => setScope('RECENT')}>
                  지난 방문 이후
                  <span className="text-fg-subtle ml-1 font-normal">
                    {data.lastVisitedLabel} 이후
                  </span>
                </ScopeChip>
                <ScopeChip active={scope === 'ALL'} onClick={() => setScope('ALL')}>
                  전체
                </ScopeChip>
              </span>
            </div>

            {!data.run ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>진행 중인 프로젝트가 없습니다</EmptyTitle>
                  <EmptyDescription>
                    미프 4차가 <b className="text-fg">07-29</b>에 시작합니다.
                    <br />
                    제출이 들어오면 여기에 할 일이 쌓입니다.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : data.items.length === 0 ? (
              <Empty className="border-solid bg-surface">
                <EmptyHeader className="max-w-md">
                  <EmptyTitle>
                    {scope === 'RECENT'
                      ? '지난 방문 이후 새로 생긴 일이 없습니다'
                      : '지금은 처리할 일이 없습니다'}
                  </EmptyTitle>
                  {scope === 'RECENT' && (
                    <EmptyDescription>
                      마감이 임박한 건도, 확인할 판정도 없어요.
                      <br />
                      <b className="text-fg">전체</b>로 바꾸면 남아 있는 일을 볼 수 있습니다.
                    </EmptyDescription>
                  )}
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="border-border bg-surface overflow-hidden rounded-md border">
                {BAND_ORDER.map((band) => {
                  const items = byBand(band)
                  if (band === 2 && data.bandTwoFailed) {
                    return (
                      <Fragment key={band}>
                        <BandLabel band={band} />
                        <Alert variant="danger" className="rounded-none border-x-0 border-t-0">
                          <AlertTitle>무효 응시 확인 목록을 불러오지 못했습니다</AlertTitle>
                          <AlertAction>
                            <Button variant="ghost" size="sm" onClick={page.reload}>
                              다시 시도
                            </Button>
                          </AlertAction>
                        </Alert>
                      </Fragment>
                    )
                  }
                  if (items.length === 0) return null
                  return (
                    <Fragment key={band}>
                      <BandLabel band={band} />
                      {items.map((item) => (
                        <InboxRow
                          key={item.id}
                          item={item}
                          pending={pendingId === item.id}
                          onContact={() => void handleContact(item)}
                          onOpenBrief={() =>
                            item.kind === 'INTERVIEW' && navigate(briefPath(item.caseId))
                          }
                          onReviewVoid={() =>
                            item.kind === 'INVALID' &&
                            navigate(interviewsListPath(item.roundId, item.className))
                          }
                        />
                      ))}
                    </Fragment>
                  )
                })}

                {data.resolvedHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFoldOpen((v) => !v)}
                    className="text-fg-subtle hover:bg-surface-2 flex w-full items-center gap-1.5 border-t border-border px-5 py-2.5 text-left text-sm"
                  >
                    <span aria-hidden>{foldOpen ? '▾' : '▸'}</span>
                    처리됨 <b className="text-fg-muted">{data.resolvedHistory.length}</b>
                    {scope === 'RECENT' && <span> · 지난 방문 이후</span>}
                  </button>
                )}
                {foldOpen && data.resolvedHistory.map((r) => <ResolvedRow key={r.id} item={r} />)}
              </div>
            )}
          </>
        )
      )}
    </ConsoleShell>
  )
}

function BandLabel({ band }: { band: ItemBand }) {
  return (
    <div className="bg-surface-2 text-fg-subtle border-t border-border px-5 py-1.5 text-2xs font-bold tracking-wide first:border-t-0">
      {BAND_LABEL[band]}
    </div>
  )
}

function ScopeChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1.5 text-xs',
        active
          ? 'border-primary/25 bg-primary-soft text-primary font-semibold'
          : 'border-border-strong bg-surface-2 text-fg-muted',
      )}
    >
      {children}
    </button>
  )
}
