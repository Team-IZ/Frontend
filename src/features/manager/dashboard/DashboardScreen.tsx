import { Fragment, useCallback, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import ConsoleShell from '@/shells/ConsoleShell'
import PageHeader from '@/components/common/PageHeader'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import { Alert, AlertTitle, AlertAction } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils/cn'
import { useAsync } from '@/lib/useAsync'
import { getInbox, nudgeItem, type InboxItem, type InboxScope, type ItemBand } from './mockData'
import RunLine from './components/RunLine'
import InboxRow, { briefPath } from './components/InboxRow'
import ResolvedRow from './components/ResolvedRow'

/*
  MG-01 매니저 대시보드 — "오늘 누구부터 처리할지" 한 목록(정의서 §1). 지표판이
  아니라 인박스라 KPI 카드·회차 필터가 없다 — 있는 필터는 `지난 방문 이후`/`전체`
  하나뿐이고, 정렬은 `mockData.ts`가 밴드 순서로 이미 고정해 둔다(사용자가 못
  고른다, MG-03 정렬과 같은 원칙).

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
  const [scope, setScope] = useState<InboxScope>('RECENT')
  const [foldOpen, setFoldOpen] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set())

  const load = useCallback(() => getInbox(scope), [scope])
  const page = useAsync(load)
  const data = page.data

  async function handleNudge(item: InboxItem) {
    setPendingId(item.id)
    setFailedIds((s) => {
      const next = new Set(s)
      next.delete(item.id)
      return next
    })
    try {
      const res = await nudgeItem(item.id)
      if (res.kind === 'ALREADY_RESOLVED') {
        toast('이미 제출했습니다')
        page.reload()
      } else if (res.kind === 'FAILED') {
        setFailedIds((s) => new Set(s).add(item.id))
      } else {
        page.reload()
      }
    } finally {
      setPendingId(null)
    }
  }

  const byBand = (band: ItemBand) => data?.items.filter((i) => i.band === band) ?? []

  return (
    <ConsoleShell role="manager">
      <PageHeader breadcrumb="대시보드 › 7기 › 담당 반" title="대시보드" />

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
            <RunLine run={data.run} nextRoundLabel="미프 4차 제출 시작 07-29" />

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
                          failed={failedIds.has(item.id)}
                          onNudge={() => void handleNudge(item)}
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
