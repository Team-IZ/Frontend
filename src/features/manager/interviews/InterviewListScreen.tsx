import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
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
import StaleBlock from '@/components/common/StaleBlock'
import TableSkeleton from '@/components/common/TableSkeleton'
import { useDebounced } from '@/lib/useDebounced'
import { useManagerCohort } from '@/stores/cohortScope'
import {
  useExcludeInterviewCase,
  useInterviewList,
  useInterviewRounds,
  useReincludeInterviewCase,
  VOID_REVIEW_OPEN,
} from './_/api/api'
import type { InterviewCase } from './_/api/types'
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

/*
  MG-03 면담 목록 — "위험 판정이 켜진 학생의 작업 큐"(정의서 §1).

  **판정·정렬·개수를 전부 서버가 한다.** 목이 갖고 있던 `sortCases`(무효 응시 최상단 →
  상태 → 반 → 이름)와 판정 근거 조립이 통째로 사라졌다 — 스펙이 *"정렬은 서버가
  정하며 클라이언트가 바꿀 수 없다"* 고 못박고 있고, 같은 규칙을 두 곳에 두지 않는다.

  **체크박스가 없다**(정의서 §3) — 위험 판정이 켜지면 자동 등재되므로 여기 있는
  사람이 곧 대상이다. 빼는 것은 행의 `[제외]` 버튼 하나뿐이다.

  **행 전체 클릭을 만들지 않는다** — 이름 클릭(MG-06 조회)과 `[브리프 열기]`
  (MG-04 작업)은 목적지가 다른 별개 동작이다(정의서 §5).

  ⚠ 제외는 확인 다이얼로그 없이 즉시 실행된다(목업 `#exclude` 장면). 정의서 §6
  "제외는 되돌릴 수 있다"가 이미 안전장치라, 되돌릴 수 없는 조작에나 쓰는 확인 모달을
  여기 또 얹지 않았다.

  ⚠ **`?round=&class=` 쿼리로 들어오면 세션 필터보다 그 값을 우선한다**(MG-01
  대시보드의 [면담 목록에서 확인]이 넘겨준다) — 읽고 나면 URL은 바로 지운다.
*/

/**
 * 브리프로 갈 때 **`briefState`를 같이 넘긴다** — 브리프 화면이 조회(`GET`)와
 * 생성(`POST`) 중 무엇을 부를지 그 값으로 가른다(스펙이 정한 계약).
 */
const briefPath = (c: InterviewCase) =>
  `/manager/interviews/${c.caseId}/brief?state=${c.briefState}`
const traineePath = (traineeId: string) => `/manager/trainees/${traineeId}`

/** `2026-07-24T…` → `07.24` */
const shortDate = (iso: string | null) => (iso ? `${iso.slice(5, 7)}.${iso.slice(8, 10)}` : '')

export default function InterviewListScreen() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { cohortId, cohortName, cohorts, selectCohort } = useManagerCohort()

  // 브리프로 갔다가 "← 목록으로"로 돌아와도 회차·검색·상태가 그대로 있어야 한다
  // (사용자 지시) — 세션 동안만 기억하는 모듈 전역값에서 초기화한다.
  const [filters, setFilters] = useState<FilterValues>(() => {
    const roundParam = searchParams.get('round')
    if (roundParam) {
      return {
        ...INITIAL_FILTERS,
        round: roundParam,
        classFilter: searchParams.get('class') ?? ALL,
      }
    }
    return getSessionFilters()
  })
  const [undoBanner, setUndoBanner] = useState<{ caseId: string; name: string } | null>(null)
  const [rowFailed, setRowFailed] = useState<string | null>(null)

  // 딥링크 쿼리는 초기 필터에 한 번 반영하고 바로 지운다(위 docblock)
  useEffect(() => {
    if (searchParams.has('round')) setSearchParams({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setSessionFilters(filters)
  }, [filters])

  const rounds = useInterviewRounds()
  /*
    **회차가 정해지기 전에는 목록을 안 부른다.** `assessmentRoundId`가 필수 파라미터라
    빈 값으로 부르면 400이 온다. 기본값은 **마지막 회차**다(사용자 지시).
  */
  /*
    🔴 **`?? []`를 쓰지 않는다**(화면 규칙 E). 아직 안 온 것과 없는 것이 같아지면
    필터가 「선택지 0개」로 그려지고, 그게 「이 기수엔 회차가 없다」로 읽힌다.
  */
  const roundList = rounds.data
  /*
    🟢 **회차를 안 골라도 목록을 부른다**(32차 R2). 한때 회차 목록을 먼저 받아야
    했고 그래서 첫 진입이 **직렬 두 왕복**(2.5~3.1초)이었다 — 이제 서버가 「이번
    회차」를 고르고, 회차 드롭다운은 그와 **나란히** 채워진다.

    사용자가 고른 값이 있으면 그것을 보내고, 없으면 **아무것도 안 보낸다** —
    직전 회차를 화면이 추측하지 않는다(명부와 같은 판정을 서버가 갖고 있다).
  */
  const round = filters.round

  const search = useDebounced(filters.search).trim()
  const list = useInterviewList({
    assessmentRoundId: round || undefined,
    search: search || undefined,
    status: filters.status === ALL ? undefined : filters.status,
    riskType: filters.riskType === ALL ? undefined : filters.riskType,
    classId: filters.classFilter === ALL ? undefined : filters.classFilter,
  })

  const exclude = useExcludeInterviewCase()
  const reinclude = useReincludeInterviewCase()

  /**
   * 회차를 바꾸면 검색·상태·위험 유형·반 필터를 전부 초기화한다(decision-log D25) —
   * 회차마다 케이스 구성 자체가 다르다. 브리프를 열었다 돌아오는 것(같은 회차 안의
   * 이동)은 필터를 유지해야 하는 다른 경우라 여기 영향 없다.
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
    setRowFailed(null)
    try {
      await exclude.mutateAsync({ path: { caseId: c.caseId } })
      setUndoBanner({ caseId: c.caseId, name: c.name })
    } catch {
      setRowFailed(c.caseId)
    }
  }

  /** id만 받는다 — 되돌리기 배너의 케이스가 지금 필터에 안 걸려 있을 수 있다 */
  async function handleUndo(caseId: string) {
    setRowFailed(null)
    try {
      await reinclude.mutateAsync({ path: { caseId } })
      setUndoBanner((b) => (b?.caseId === caseId ? null : b))
    } catch {
      setRowFailed(caseId)
    }
  }

  const data = list.data
  const meta = data?.round
  const pending = exclude.isPending || reinclude.isPending
  const narrowed = isNarrowed({ ...filters, search })
  /* 회차 결과가 아직이면 위험 판정 자체가 없다 — 목록이 아니라 안내를 그린다 */
  const resultPending = meta?.status === 'PENDING'

  return (
    <ConsoleShell
      role="manager"
      cohort={cohortId ?? ''}
      cohorts={cohorts}
      onCohortChange={selectCohort}
    >
      <PageHeader
        /*
          **있는 것만 잇는다.** `?? ''`로 채우고 이으면 기수가 오기 전 1.5초 동안
          `면담 › › 담당 반`이 된다 — 구분자만 남아 조각이 빠진 것이 드러난다
          (플로우 관찰에서 잡았다, screen-hardening §자주 나오는 것).
        */
        breadcrumb={['면담', cohortName, '담당 반'].filter(Boolean).join(' › ')}
        title="면담"
        /*
          🔴 **결과 전이면 개수도 말하지 않는다.** 서버가 `resultStatus: PENDING`(위험
          판정 자체가 없는 상태)이라면서 `items`·`counts`는 채워 보내는 회차가 있다
          (실측 5차 — PENDING인데 대상 4명). 그대로 그리면 머리글은 `1명 · 예정 1`,
          본문은 `이 회차는 아직 결과가 없어요`가 되어 **화면이 자기모순**이 된다.

          본문 쪽을 기준으로 맞춘다 — 스펙이 「PENDING이면 그 안내를 그린다」이고,
          아직 뒤집힐 수 있는 판정을 숫자로 단언하는 쪽이 더 나쁘다. 서버 모순 자체는
          요청서로 나간다(mg-03-situations §5).
        */
        count={data && !resultPending ? `${data.total}명` : undefined}
        breakdown={
          data &&
          !resultPending && (
            <span className="text-fg-muted flex items-center gap-3">
              <span>
                예정 <b className="text-fg font-bold">{data.counts.PLANNED ?? 0}</b>
              </span>
              <span>
                종결 <b className="text-fg font-bold">{data.counts.DONE ?? 0}</b>
              </span>
              <span className={data.counts.EXCLUDED ? undefined : 'text-fg-subtle'}>
                제외 <b className="text-fg font-bold">{data.counts.EXCLUDED ?? 0}</b>
              </span>
            </span>
          )
        }
      />

      <InterviewFilters
        {...filters}
        /*
          서버가 고른 회차를 드롭다운에 되채운다 — 사용자가 안 골랐을 때(첫 진입)
          트리거가 비어 있으면 「무엇을 보고 있는지」를 화면이 말하지 않는다.
        */
        round={round || (data?.round?.assessmentRoundId ?? '')}
        rounds={roundList}
        classes={data?.classes}
        /*
          🔴 **판정 전이면 필터 라벨의 개수도 빼야 한다**(조합 전수에서 잡았다).
          머리글과 본문은 이미 `resultPending`으로 가렸는데 **필터만 남아서**
          본문이 「아직 결과가 없어요」인데 트리거는 「전체 (1)」이라고 말했다 —
          매니저가 보면 한 명이 있는데 왜 안 보이나 싶다.

          아직 뒤집힐 수 있는 판정을 숫자로 단언하지 않는다는 판단은 하나여야 한다.
        */
        counts={resultPending ? undefined : data?.counts}
        riskCounts={resultPending ? undefined : data?.riskCounts}
        onChange={changeFilters}
      />

      {rowFailed && (
        <Alert variant="danger" className="mb-3">
          <AlertTitle>바꾸지 못했습니다</AlertTitle>
          <AlertDescription>잠시 후 다시 시도해 주세요.</AlertDescription>
        </Alert>
      )}

      {undoBanner && (
        <Alert variant="info" className="mb-3">
          <AlertTitle>{undoBanner.name}을(를) 이번 회차 대상에서 뺐습니다.</AlertTitle>
          <AlertAction>
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => void handleUndo(undoBanner.caseId)}
            >
              되돌리기
            </Button>
          </AlertAction>
        </Alert>
      )}

      {/* D41 — 배경 재조회 실패로 이미 보여준 목록을 덮지 않는다(TraineeListScreen·D43과 같은 패턴) */}
      {(rounds.isError || list.isError) && data && (
        <Alert variant="warning" className="mb-3">
          <AlertTitle>목록을 새로고침하지 못했습니다</AlertTitle>
          <AlertDescription>마지막으로 불러온 목록을 보여드리고 있어요.</AlertDescription>
          <AlertAction>
            <Button variant="ghost" size="sm" onClick={() => void list.refetch()}>
              다시 시도
            </Button>
          </AlertAction>
        </Alert>
      )}

      {!data && !list.isError && !rounds.isError ? (
        /*
          🔴 **첫 진입은 스켈레톤이다**(화면 규칙 E · async-states §1-2). 스피너
          자리(`py-16` 128px)와 실제 표(헤더 39 + 행 53×12 + 푸터 16 = 691px)가 달라
          도착하는 순간 본문이 통째로 밀렸다.

          행 수·열 폭·높이는 **실제 표에서 잰 값**이다(9기 4차 · 12행). 열 폭은 표
          헤더에 쓴 토큰을 그대로 넘긴다.

          ⚠ **`isPending`으로 판정하지 않는다** — 회차를 아직 못 받아 `enabled: false`인
          동안 `isPending`이 거짓이라 빈 화면이 스친다. **값이 있나 없나**로 가른다.
        */
        <TableSkeleton
          rows={12}
          cols={['w-[8%]', 'w-[14%]', 'w-[11%]', 'w-[27%]', 'w-[24%]', 'w-[16%]']}
          footerH={16}
        />
      ) : (rounds.isError || list.isError) && !data ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>목록을 불러오지 못했습니다</EmptyTitle>
            <EmptyDescription>잠시 후 다시 시도해 주세요.</EmptyDescription>
          </EmptyHeader>
          <Button variant="ghost" onClick={() => void list.refetch()}>
            다시 시도
          </Button>
        </Empty>
      ) : resultPending ? (
        <Empty>
          {/* max-w-sm 기본값이면 첫 문장이 폭에 걸려 세 줄로 보인다(사용자 지적) */}
          <EmptyHeader className="max-w-md">
            <EmptyTitle>이 회차는 아직 결과가 없어요</EmptyTitle>
            <EmptyDescription>
              이해도 확인이 끝나면 위험 판정이 켜진 사람이 자동으로 등재됩니다.
              <br />
              지난 회차를 보려면 위에서 회차를 바꾸세요.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : data.items.length === 0 ? (
        narrowed ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>
                {search ? `"${search}"와 맞는 대상이 없습니다` : '조건에 맞는 대상이 없습니다'}
              </EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          // 회차 전체가 비어 있다(필터와 무관) — "필터에 안 걸림"과 다른 문구(정의서 §6)
          <Empty className="border-solid bg-surface">
            <EmptyHeader>
              <EmptyTitle>이번 회차 면담 대상이 없습니다</EmptyTitle>
              {/*
                `2단 이하`가 아니라 `2단 미만`이다 — 30차 R5로 확정된 기준(원장이
                `reach_level <= 1`). 명부 열 이름과 같은 말을 쓴다.
              */}
              <EmptyDescription>
                2단 미만 개념이 2개 이상인 사람이 없어요.
                <br />
                1개인 사람은 그 개념만 다시 보기로 처리됩니다.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )
      ) : (
        /*
          🔴 **조건을 바꾸는 동안 흐림만 두지 않는다**(화면 규칙 E). 필터를 바꾸면
          1~2초가 걸리는데 그동안 상태 필터는 「종결 (3)」을 말하고 표는 직전 조건의
          행을 보여준다 — 흐림은 그것을 설명하지 못한다. `StaleBlock`이 덮고·못 누르게
          하고·「불러오는 중」이라고 말한다(옛 행의 브리프로 들어가는 사고도 막는다).
        */
        <StaleBlock stale={list.isPlaceholderData} label="목록을 불러오는 중">
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {/*
                  🔴 **폭 합이 컨테이너를 넘어 액션 열이 잘렸다**(실측 표 1120px ·
                  본문 1016px). `table-fixed`인데 마지막 활동만 폭을 안 줘서, 서버
                  판정 근거 문장이 목보다 길어지자 그 열이 밀려 나갔다 — 제외·되돌리기
                  버튼을 **아예 못 누르는 상태**였다.

                  모든 열에 폭을 준다(합 = 100%). 긴 문장은 열 안에서 줄바꿈한다 —
                  잘라내면 판정 근거가 무슨 말인지 알 수 없다.
                */}
                <TableHead className="w-[8%]">상태</TableHead>
                <TableHead className="w-[14%]">이름</TableHead>
                <TableHead className="w-[11%]">위험 유형</TableHead>
                <TableHead className="w-[27%]">판정 근거</TableHead>
                <TableHead className="w-[24%]">마지막 활동</TableHead>
                <TableHead className="w-[16%] text-right">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((c) => (
                <TableRow
                  key={c.caseId}
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
                    <RiskBadge riskType={c.riskType} />
                  </TableCell>
                  <TableCell>
                    <RiskReason caseItem={c} />
                  </TableCell>
                  <TableCell>
                    <LastActivityCell caseItem={c} />
                  </TableCell>
                  <TableCell className="text-right">
                    <RowActions
                      caseItem={c}
                      pending={pending}
                      onOpenBrief={() => navigate(briefPath(c))}
                      onExclude={() => void handleExclude(c)}
                      onUndo={() => void handleUndo(c.caseId)}
                    />
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
        </StaleBlock>
      )}
    </ConsoleShell>
  )
}

/** 마지막 활동 열 — 상태별로 다른 값을 한 열에 통합한다(정의서 §3) */
function LastActivityCell({ caseItem: c }: { caseItem: InterviewCase }) {
  if (c.status === 'DONE') {
    return (
      <span className="text-fg-muted">
        {shortDate(c.interviewedAt)} 면담 ·{' '}
        <span className="text-fg-subtle">
          다음에 할 것 — {c.nextAction ? `"${c.nextAction}"` : '없음'}
        </span>
      </span>
    )
  }
  if (c.status === 'EXCLUDED') {
    return (
      <span className="text-fg-subtle">
        {shortDate(c.excludedAt)} 제외{c.excludedBy ? ` · ${c.excludedBy}` : ''}
      </span>
    )
  }
  // PLANNED
  if (c.voidReviewPending) {
    return <span className="text-warning font-medium">응답 없음 · 매니저 확인 필요</span>
  }
  if (c.riskType === 'INVALID' && c.voidConfirmed) {
    return <span className="text-fg-subtle">확인 완료 · 그대로 유지</span>
  }
  return <span className="text-fg-subtle">등재됨</span>
}

function RowActions({
  caseItem: c,
  pending,
  onOpenBrief,
  onExclude,
  onUndo,
}: {
  caseItem: InterviewCase
  pending: boolean
  onOpenBrief: () => void
  onExclude: () => void
  onUndo: () => void
}) {
  // 종결 — 브리프를 다시 열어 수정할 수 있다(사용자 지시). 제외는 안 보인다 —
  // 제외는 PLANNED 케이스를 큐에서 빼는 동작이지 완료된 기록을 지우는 동작이 아니다.
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
  return (
    <div className="flex justify-end gap-1.5">
      {c.voidReviewPending && !VOID_REVIEW_OPEN ? (
        /*
          🔴 무효 확인 API가 아직 `사용 불가`라 버튼을 못 연다(`_/api/api.ts`).
          누르면 실패할 버튼을 두는 대신 왜 못 하는지를 말한다 —
          브리프를 먼저 만들면 유형이 잘못 굳으므로 그쪽도 막는다.
        */
        <span className="text-fg-subtle self-center text-2xs">무효 확인 준비 중</span>
      ) : (
        <Button variant="primary" size="sm" disabled={pending} onClick={onOpenBrief}>
          {c.briefState === 'NONE' || c.briefState === 'FAILED' ? '브리프 생성' : '브리프 열기'}
        </Button>
      )}
      <Button variant="ghost" size="sm" disabled={pending} onClick={onExclude}>
        제외
      </Button>
    </div>
  )
}
