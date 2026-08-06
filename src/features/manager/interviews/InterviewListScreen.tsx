import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import ConsoleShell from '@/shells/ConsoleShell'
import PageHeader from '@/components/common/PageHeader'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import { Alert, AlertTitle, AlertDescription, AlertAction } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { useAsync } from '@/lib/useAsync'
import {
  excludeCase,
  listInterviews,
  shortDateLabel,
  undoExclude,
  type CaseRisk,
  type ClassName,
  type InterviewCase,
} from './mockData'
import {
  ALL,
  getSessionFilters,
  INITIAL_FILTERS,
  isNarrowed,
  setSessionFilters,
  type FilterValues,
} from './filterState'
import InterviewStatusBadge from './components/InterviewStatusBadge'
import RiskBadge, { RiskReason } from './components/RiskBadge'
import InterviewFilters from './components/InterviewFilters'
import VoidConfirmDialog from './components/VoidConfirmDialog'

/*
  MG-03 면담 목록 — "위험 판정이 켜진 학생의 작업 큐"(정의서 §1). 조회 화면이
  아니라 처리하는 화면이라, MG-07처럼 조립만 하고 셀 분기는 `RiskBadge`·
  `InterviewStatusBadge`가, 목 데이터·정렬·mock API는 `mockData.ts`가 갖는다.

  **체크박스가 없다**(정의서 §3) — 위험 판정이 켜지면 자동 등재되므로 여기 있는
  사람이 곧 대상이다. 빼는 것은 행의 `[제외]` 버튼 하나뿐이다.

  **행 전체 클릭을 만들지 않는다** — 이름 클릭(MG-06 조회)과 `[브리프 열기]`
  (MG-04 작업)은 목적지가 다른 별개 동작이다(정의서 §5).

  ⚠ 제외는 확인 다이얼로그 없이 즉시 실행된다(목업 `#exclude` 장면 — 클릭 즉시
  상태가 바뀌고 인라인 배너로 되돌리기를 남긴다). 정의서 §6 "제외는 되돌릴 수
  있다"가 이미 안전장치라 판단해, 되돌릴 수 없는 조작에나 쓰는 확인 모달을 여기
  또 얹지 않았다(TeamTab 팀 삭제·ResultTab 마감 전 발행처럼 **되돌릴 수 없는**
  조작에만 AlertDialog를 쓰는 이 레포 관례와 일관된다).
*/

const briefPath = (caseId: string) => `/manager/interviews/${caseId}/brief`
const traineePath = (traineeId: string) => `/manager/trainees/${traineeId}`

export default function InterviewListScreen() {
  const navigate = useNavigate()
  // 브리프로 갔다가 "← 목록으로"로 돌아와도 회차·검색·상태가 그대로 있어야 한다
  // (사용자 지시) — 세션 동안만 기억하는 모듈 전역값에서 초기화한다. 새로고침하면
  // 사라진다(filterState.ts 판단 기록).
  const [filters, setFilters] = useState<FilterValues>(getSessionFilters)
  const [voidTarget, setVoidTarget] = useState<InterviewCase | null>(null)
  const [undoBanner, setUndoBanner] = useState<{ caseId: string; name: string } | null>(null)
  const [rowPending, setRowPending] = useState<string | null>(null)
  const [rowFailed, setRowFailed] = useState<string | null>(null)

  const loadInterviews = useCallback(
    () =>
      listInterviews({
        round: filters.round,
        search: filters.search || undefined,
        status: filters.status === ALL ? undefined : filters.status,
        riskType: filters.riskType === ALL ? undefined : (filters.riskType as CaseRisk['type']),
        classFilter: filters.classFilter === ALL ? undefined : (filters.classFilter as ClassName),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters],
  )
  const page = useAsync(loadInterviews)
  const narrowed = isNarrowed(filters)

  useEffect(() => {
    setSessionFilters(filters)
  }, [filters])

  /**
   * 회차를 바꾸면 검색·상태·위험 유형·반 필터를 전부 초기화한다(사용자 질문에 대한
   * 판단, decision-log D52) — 회차마다 케이스 구성 자체가 다르다(위험 유형·상태
   * 분포가 회차마다 갈린다). 이전 회차에서 걸어둔 필터를 그대로 들고 가면 새
   * 회차에서 "왜 아무것도 안 보이지"로 이어지기 쉽다. 브리프를 열었다 돌아오는
   * 것(같은 회차 안에서의 이동)은 필터를 유지해야 하는 다른 경우라 여기 영향
   * 없다 — `getSessionFilters`가 이미 그건 처리한다.
   */
  function changeFilters(patch: Partial<FilterValues>) {
    if (patch.round) {
      setUndoBanner(null)
      setFilters({ ...INITIAL_FILTERS, round: patch.round })
      return
    }
    setFilters((f) => ({ ...f, ...patch }))
  }

  async function handleExclude(c: InterviewCase) {
    setRowPending(c.id)
    setRowFailed(null)
    try {
      await excludeCase(filters.round, c.id)
      setUndoBanner({ caseId: c.id, name: c.name })
      page.reload()
    } catch {
      setRowFailed(c.id)
    } finally {
      setRowPending(null)
    }
  }

  /**
   * 되돌리기 — id만 받는다(케이스 객체를 받지 않는다). 되돌리기 배너는 필터로
   * 좁혀진 현재 목록(`data.items`)에 그 케이스가 없을 수 있다(예: 반 필터를 다른
   * 반으로 바꾼 채 배너의 되돌리기를 누르는 경우) — 목록에서 다시 찾아 누르는
   * 방식이었을 때 못 찾으면 조용히 아무 일도 안 일어나는 버그가 있었다(사용자
   * 지적). id로 바로 mock API를 부르면 현재 화면에 그 케이스가 보이는지와
   * 무관하게 항상 동작한다.
   */
  async function handleUndo(caseId: string) {
    setRowPending(caseId)
    setRowFailed(null)
    try {
      await undoExclude(filters.round, caseId)
      setUndoBanner((b) => (b?.caseId === caseId ? null : b))
      page.reload()
    } catch {
      setRowFailed(caseId)
    } finally {
      setRowPending(null)
    }
  }

  const data = page.data
  const round = data?.round
  const showOverdueBar =
    !!round &&
    !round.isFirstRound &&
    round.resultStatus === 'READY' &&
    (data?.counts.PLANNED ?? 0) > 0
  const showFirstRoundBar =
    !!round && round.isFirstRound && round.resultStatus === 'READY' && (data?.total ?? 0) > 0

  return (
    <ConsoleShell role="manager">
      <PageHeader
        breadcrumb="면담 › 7기 › 담당 반"
        title="면담"
        count={data ? `${data.total}명` : undefined}
        breakdown={
          data && (
            <span className="text-fg-muted flex items-center gap-3">
              <span>
                예정 <b className="text-fg font-bold">{data.counts.PLANNED}</b>
              </span>
              <span>
                종결 <b className="text-fg font-bold">{data.counts.DONE}</b>
              </span>
              <span className={data.counts.EXCLUDED === 0 ? 'text-fg-subtle' : undefined}>
                제외 <b className="text-fg font-bold">{data.counts.EXCLUDED}</b>
              </span>
            </span>
          )
        }
      />

      <InterviewFilters
        {...filters}
        counts={data?.counts}
        riskCounts={data?.riskCounts}
        onChange={changeFilters}
      />

      {showOverdueBar && round && data && (
        <Alert variant="warning" className="mb-3">
          <AlertTitle>
            {round.label} 면담이 {round.daysSincePublish}일째 안 끝났습니다
          </AlertTitle>
          <AlertDescription>
            {round.publishedAtLabel} 리포트 발행과 함께 등재 — <b>{data.counts.PLANNED}명</b>이 아직
            예정입니다
          </AlertDescription>
        </Alert>
      )}

      {showFirstRoundBar && (
        <Alert variant="info" className="mb-3">
          <AlertTitle>1차는 비교할 직전 회차가 없어 위험 유형이 붙지 않습니다</AlertTitle>
          <AlertDescription>
            단계 하락·지속 저점은 2차부터 확정됩니다. 지금은 2단 이하 개념 개수만 보입니다.
          </AlertDescription>
        </Alert>
      )}

      {undoBanner && (
        <Alert variant="info" className="mb-3">
          <AlertTitle>{undoBanner.name}을(를) 이번 회차 대상에서 뺐습니다.</AlertTitle>
          <AlertAction>
            <Button variant="ghost" size="sm" onClick={() => void handleUndo(undoBanner.caseId)}>
              되돌리기
            </Button>
          </AlertAction>
        </Alert>
      )}

      {page.loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="size-6" aria-label="목록을 불러오는 중" />
        </div>
      ) : page.failed ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>목록을 불러오지 못했습니다</EmptyTitle>
            <EmptyDescription>잠시 후 다시 시도해 주세요.</EmptyDescription>
          </EmptyHeader>
          <Button variant="ghost" onClick={page.reload}>
            다시 시도
          </Button>
        </Empty>
      ) : round?.resultStatus === 'PENDING' ? (
        <Empty>
          {/* max-w-sm 기본값이면 첫 문장이 폭에 걸려 줄바꿈이 두 줄이 아니라
              세 줄로 보인다(사용자 지적) — 문장이 한 줄에 들어가도록 넓힌다 */}
          <EmptyHeader className="max-w-md">
            <EmptyTitle>이 회차는 아직 결과가 없어요</EmptyTitle>
            <EmptyDescription>
              이해도 확인이 끝나면 위험 판정이 켜진 사람이 자동으로 등재됩니다.
              <br />
              지난 회차를 보려면 위에서 회차를 바꾸세요.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : data && data.counts.PLANNED + data.counts.DONE + data.counts.EXCLUDED === 0 ? (
        // 회차 전체가 비어 있다(필터와 무관) — "필터에 안 걸림"과 다른 문구(정의서 §6)
        <Empty className="border-solid bg-surface">
          <EmptyHeader>
            <EmptyTitle>이번 회차 면담 대상이 없습니다</EmptyTitle>
            <EmptyDescription>
              2단 이하 개념이 2개 이상인 사람이 없어요.
              <br />
              1개인 사람은 그 개념만 다시 보기로 처리됩니다.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : data?.items.length === 0 ? (
        narrowed && (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>
                {filters.search
                  ? `"${filters.search}"와 맞는 대상이 없습니다`
                  : '조건에 맞는 대상이 없습니다'}
              </EmptyTitle>
            </EmptyHeader>
          </Empty>
        )
      ) : (
        data && (
          <>
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-20">상태</TableHead>
                  <TableHead className="w-40">이름</TableHead>
                  <TableHead className="w-28">위험 유형</TableHead>
                  <TableHead className="w-44">판정 근거</TableHead>
                  <TableHead>마지막 활동</TableHead>
                  <TableHead className="w-44 text-right">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((c) => (
                  <TableRow
                    key={c.id}
                    className={c.status === 'EXCLUDED' ? 'opacity-45' : undefined}
                  >
                    <TableCell>
                      <InterviewStatusBadge status={c.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Link to={traineePath(c.traineeId)} className="font-bold hover:underline">
                        {c.name}
                      </Link>
                      <span className="text-fg-subtle ml-1.5 text-2xs">{c.className}</span>
                    </TableCell>
                    <TableCell>
                      <RiskBadge risk={c.risk} />
                    </TableCell>
                    <TableCell>
                      <RiskReason
                        risk={c.risk}
                        voidResolved={c.risk.type === 'INVALID' && !!c.voidConfirmed}
                      />
                    </TableCell>
                    <TableCell>
                      <LastActivityCell caseItem={c} registeredAtLabel={round?.publishedAtLabel} />
                    </TableCell>
                    <TableCell className="text-right">
                      {rowFailed === c.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-danger text-2xs">바꾸지 못했습니다</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              c.status === 'EXCLUDED' ? handleUndo(c.id) : handleExclude(c)
                            }
                          >
                            다시
                          </Button>
                        </div>
                      ) : (
                        <RowActions
                          caseItem={c}
                          pending={rowPending === c.id}
                          onOpenBrief={() => navigate(briefPath(c.id))}
                          onOpenVoid={() => setVoidTarget(c)}
                          onExclude={() => handleExclude(c)}
                          onUndo={() => handleUndo(c.id)}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* 페이지가 하나뿐이라 페이저를 그리지 않는다(E7 — 누를 수 없는 컨트롤은 장식) */}
            <div className="mt-3 grid grid-cols-3 items-center">
              <p className="text-fg-subtle text-xs">{`1–${data.items.length} / ${data.total}명`}</p>
              <div />
              <div />
            </div>
          </>
        )
      )}

      {voidTarget && (
        <VoidConfirmDialog
          roundId={filters.round}
          caseItem={voidTarget}
          open={voidTarget !== null}
          onOpenChange={(open) => !open && setVoidTarget(null)}
          onResolved={page.reload}
        />
      )}
    </ConsoleShell>
  )
}

/**
 * 마지막 활동 열 — 상태별로 다른 값을 한 열에 통합한다(정의서 §3). 예정 상태의
 * 등재일은 케이스가 아니라 **회차**의 값이다(`mockData.ts` 판단 기록 — 대기는
 * 개인별이 아니라 회차 경과다) — 그래서 회차의 `publishedAtLabel`을 받는다.
 */
function LastActivityCell({
  caseItem: c,
  registeredAtLabel,
}: {
  caseItem: InterviewCase
  registeredAtLabel?: string
}) {
  if (c.status === 'DONE' && c.interview) {
    return (
      <span className="text-fg-muted">
        {shortDateLabel(c.interview.date)} 면담 ·{' '}
        <span className="text-fg-subtle">
          다음에 할 것 — {c.interview.nextAction ? `"${c.interview.nextAction}"` : '없음'}
        </span>
      </span>
    )
  }
  if (c.status === 'EXCLUDED') {
    return (
      <span className="text-fg-subtle">
        {c.excludedAt && shortDateLabel(c.excludedAt)} 제외 · {c.excludedBy}
      </span>
    )
  }
  // PLANNED
  if (c.risk.type === 'INVALID' && !c.voidConfirmed) {
    return <span className="text-warning font-medium">응답 없음 · 매니저 확인 필요</span>
  }
  if (c.risk.type === 'INVALID') {
    return <span className="text-fg-subtle">확인 완료 · 그대로 유지</span>
  }
  return <span className="text-fg-subtle">{registeredAtLabel} 등재</span>
}

function RowActions({
  caseItem: c,
  pending,
  onOpenBrief,
  onOpenVoid,
  onExclude,
  onUndo,
}: {
  caseItem: InterviewCase
  pending: boolean
  onOpenBrief: () => void
  onOpenVoid: () => void
  onExclude: () => void
  onUndo: () => void
}) {
  // 종결 — 브리프를 다시 열어 수정할 수 있다(사용자 지시). 제외는 안 보인다 —
  // 이미 끝난 면담을 "제외"한다는 게 의미가 없다(제외는 PLANNED 케이스를 큐에서
  // 빼는 동작이지, 완료된 기록을 지우는 동작이 아니다). `saveInterviewBrief` 판단
  // 기록 참고.
  if (c.status === 'DONE') {
    return (
      <Button variant="ghost" size="sm" disabled={pending} onClick={onOpenBrief}>
        브리프 수정
      </Button>
    )
  }

  if (c.status === 'EXCLUDED') {
    return (
      <Button variant="ghost" size="sm" disabled={pending} onClick={onUndo}>
        되돌리기
      </Button>
    )
  }

  // PLANNED
  const needsVoidCheck = c.risk.type === 'INVALID' && !c.voidConfirmed
  return (
    <div className="flex justify-end gap-1.5">
      {needsVoidCheck ? (
        <Button variant="ghost" size="sm" disabled={pending} onClick={onOpenVoid}>
          무효 확인
        </Button>
      ) : (
        <Button variant="primary" size="sm" disabled={pending} onClick={onOpenBrief}>
          브리프 열기
        </Button>
      )}
      <Button variant="ghost" size="sm" disabled={pending} onClick={onExclude}>
        제외
      </Button>
    </div>
  )
}
