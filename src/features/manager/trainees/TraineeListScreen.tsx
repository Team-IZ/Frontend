import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { SearchIcon, XIcon } from 'lucide-react'
import ConsoleShell from '@/shells/ConsoleShell'
import PageHeader from '@/components/common/PageHeader'
import { TableFrame } from '@/components/common/TableFrame'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table'
import { Avatar, AvatarFallback } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import { Alert, AlertTitle, AlertDescription, AlertAction } from '@/components/ui/Alert'
import StaleBlock from '@/components/common/StaleBlock'
import TableSkeleton from '@/components/common/TableSkeleton'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/InputGroup'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/Pagination'
import { AccountStatusBadge } from './components/AccountStatusBadge'
import { RoundBadge } from './components/RoundBadge'
import { maskEmail } from '@/lib/utils/mask'
import { withParticle } from '@/lib/format'
import { cn } from '@/lib/utils/cn'
import { NA_PATTERN, REACH_STYLE } from '@/components/common/reach'
import FilterSelect from '@/components/common/FilterSelect'
import { useDebounced } from '@/lib/useDebounced'
import { useManagedClassrooms, useManagerCohort } from '@/stores/cohortScope'
import { PAGE_SIZE, useRoster } from './_/api/api'
import type { AccountStatus, ConceptReach, TraineeRow } from './_/api/types'
import {
  ALL,
  getSessionFilters,
  setSessionFilters,
  type FilterValues,
  type TraineeSort,
} from './filterState'

/*
  MG-05 교육생 명부 — 실서버 연동. **검색·필터·정렬·페이지를 전부 서버가 한다**
  (`_/api/api.ts`). 목일 때는 고정 배열을 화면에서 걸렀는데, 페이지네이션이 붙은
  순간 화면 정렬은 *"이 쪽 안에서만 맞는 정렬"* 이 된다.

  회차별 개념 도달·위험/우수 배지·우수 누적은 v1(SC-M11 · "찾아서 상세로 가는
  통로")에는 없었다 — v2 상세(MG-06)가 타임라인 하나로 얇아지며 명부가 고유 가치
  (우수 프로필·팀 배치 판단)를 져야 해서 들어왔다(MG-05 §4). 팀·제출 현황은 여전히
  없다 — MG-08 소관.
*/

const ACCOUNT_OPTIONS: { value: 'ALL' | AccountStatus; label: string }[] = [
  { value: 'ACTIVE', label: '활성' },
  { value: 'ALL', label: '전체' },
  { value: 'INVITED', label: '초대 대기' },
  { value: 'INACTIVE', label: '비활성' },
]
const ACCOUNT_LABEL = Object.fromEntries(ACCOUNT_OPTIONS.map((o) => [o.value, o.label]))

const SORT_OPTIONS: { value: TraineeSort; label: string }[] = [
  { value: 'NAME', label: '이름' },
  { value: 'RECENT_ENROLLED', label: '최근 등록' },
  { value: 'RISK', label: '위험' },
  { value: 'EXCELLENCE', label: '우수' },
]

function ConceptReachCell({ reach }: { reach: ConceptReach[] }) {
  if (reach.length === 0) {
    return <span className="text-fg-subtle">아직 없음</span>
  }
  return (
    <span className="flex gap-[3px]">
      {reach.map((c) =>
        /*
          `level === null`은 0단이 아니다 — 문항이 없거나(`notGenerated`) 한 축도 답하지
          않은 것이라 숫자를 그리면 "0단을 받았다"는 거짓말이 된다(스펙 명시).
        */
        c.level === null ? (
          <span
            key={c.problemNo}
            title={
              c.notGenerated ? `${c.conceptName} · 코드에 근거가 없어 못 물었습니다` : c.conceptName
            }
            style={NA_PATTERN}
            className="text-fg-subtle flex h-[22px] w-[26px] items-center justify-center rounded-[4px] text-2xs"
          >
            ―
          </span>
        ) : (
          <span
            key={c.problemNo}
            title={c.conceptName}
            className={cn(
              'flex h-[22px] w-[26px] items-center justify-center rounded-[4px] text-2xs font-bold tabular-nums',
              REACH_STYLE[c.level],
            )}
          >
            {c.level}
          </span>
        ),
      )}
    </span>
  )
}

/** 우수 누적 칸 — 미응시·중단이면 그 사유·시각이 우선한다(와이어프레임 prof) */
function AceOrNoteCell({ row }: { row: TraineeRow }) {
  if (row.badge === 'INVALID_ATTEMPT') {
    return <span className="text-fg-subtle">이번 회차 채점하지 않음</span>
  }
  if (row.badge === 'NOT_ATTENDED') {
    return <span className="text-fg-subtle">응시 창을 놓침{terminalSuffix(row.terminalAt)}</span>
  }
  if (row.badge === 'SESSION_INCOMPLETE') {
    return <span className="text-fg-subtle">세션 중단{terminalSuffix(row.terminalAt)}</span>
  }
  if (row.ace.count === 0) {
    return <span className="text-fg-subtle">—</span>
  }
  return (
    <span>
      <b className="text-success font-bold">우수 {row.ace.count}회</b>
      <span className="text-fg-subtle"> · {row.ace.rounds.join('·')}차</span>
    </span>
  )
}

/** `세션 중단 · 07-14` — 시각이 없으면(서버가 안 준 경우) 사유만 그린다 */
function terminalSuffix(at: string | null) {
  return at ? ` · ${at.slice(5, 10)}` : ''
}

export default function TraineeListScreen() {
  const navigate = useNavigate()

  /*
    기수는 서버에 물어본다 — 매니저는 `GET /members/me/enrollments`가 소스다
    (`stores/cohortScope`). **정해지기 전에는 조회가 안 나간다.**
  */
  const { cohortId, cohortName, failed: cohortFailed, cohorts, selectCohort } = useManagerCohort()

  // 상세로 갔다가 목록으로 돌아와도 회차·검색·반·계정·정렬이 그대로 있어야 한다
  // (면담 MG-04와 같은 지시) — 세션 동안만 기억하는 모듈 전역값에서 초기화한다.
  const [filters, setFilters] = useState<FilterValues>(getSessionFilters)
  const { round, search, classFilter, accountFilter, sort, page } = filters

  useEffect(() => {
    setSessionFilters(filters)
  }, [filters])

  /** 조건이 바뀌면 첫 쪽으로 — 3쪽을 보다 검색하면 있지도 않은 3쪽을 조회하게 된다 */
  function changeFilters(patch: Partial<FilterValues>) {
    setFilters((f) => ({ ...f, page: 0, ...patch }))
  }

  /*
    **입력값과 조회값을 가른다.** 그대로 조회 키에 실으면 한 글자마다 요청이 나가고,
    한글은 자모가 조합되는 중에도 `input`이 떠서 실제로는 더 나간다(`lib/useDebounced`).
    공백만 친 것은 검색이 아니라 여기서 한 번 다듬는다 — 조회·빈 상태 문구가 같은 값을 본다.
  */
  const settledSearch = useDebounced(search).trim()

  const roster = useRoster(
    cohortId
      ? {
          cohortId,
          assessmentRoundId: round ?? undefined,
          classroomId: classFilter === ALL ? undefined : classFilter,
          accountStatus: accountFilter === ALL ? undefined : accountFilter,
          query: settledSearch || undefined,
          sort,
          page,
        }
      : undefined,
  )
  const classrooms = useManagedClassrooms(cohortId)

  const view = roster.data
  /*
    **`?? []`로 뭉개지 않는다**(화면 규칙 E) — 아직 안 온 것과 없는 것은 다르다.
    빈 배열로 만들면 반 목록이 오기 전에 빈 상태가 「담당 반 0개에서 찾았습니다」라고
    말한다. 담당 반이 0개인 매니저는 명단도 못 보므로 그 문장은 언제나 거짓이다.
  */
  const classOptions = classrooms.data?.classrooms
  /* 서버가 「이번 회차」를 골라 줬으면 드롭다운이 그 값을 그린다(첫 진입) */
  const selectedRound = round ?? view?.roundId ?? ''
  const narrowed =
    !!settledSearch || classFilter !== ALL || accountFilter !== ALL || (view?.total ?? 0) === 0

  return (
    <ConsoleShell
      role="manager"
      cohort={cohortId ?? ''}
      cohorts={cohorts}
      onCohortChange={selectCohort}
    >
      {/*
        제목 줄은 조회를 기다리지 않는다(async-states §1-3) — 통째로 없다가 생기면
        도착 순간 페이지 전체가 아래로 밀린다. 인원만 늦게 채운다.

        계정 상태별 내역은 **필터를 안 탄다** — 계정 필터를 바꿔도 안 변한다(30차 R7로
        서버가 `activeCount`·`invitedCount`·`inactiveCount`를 준다). 화면이 세지 않는다:
        페이지당 20명씩 오므로 세면 그 쪽 안에서만 맞는 숫자가 된다.
      */}
      <PageHeader
        /* 있는 것만 잇는다 — 기수가 오기 전 `교육생 › › 담당 반`이 된다(MG-03과 같은 건) */
        breadcrumb={['교육생', cohortName, '담당 반'].filter(Boolean).join(' › ')}
        title="교육생"
        count={view ? `${view.scopeTotal}명` : undefined}
        breakdown={
          view && (
            <>
              활성 <b className="text-fg font-bold">{view.accountCounts.active}</b>
              <span className="text-fg-subtle">
                {' '}
                · 초대 대기 <b className="text-fg font-bold">{view.accountCounts.invited}</b> ·
                비활성 <b className="text-fg font-bold">{view.accountCounts.inactive}</b>
              </span>
            </>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {/*
          🔴 **`disabled={!view}`였다.** 명부 조회가 5.4초라 그동안 회차 선택기가
          **잠긴 채 아무 말도 안 했다** — 흐려지기만 하고 왜 잠겼는지 알 길이 없다.
          이제 이름표(`회차`)가 늘 보이고, 목록이 오기 전에는 메뉴가 그렇다고 말한다.
        */}
        <FilterSelect
          label="회차"
          value={selectedRound}
          onChange={(v) => v && changeFilters({ round: v })}
          options={view?.rounds.map((r) => ({ value: r.assessmentRoundId, label: r.label }))}
          failed={roster.isError}
          onRetry={() => void roster.refetch()}
          className="min-w-44"
        />

        <InputGroup className="h-9 w-60">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            value={search}
            onChange={(e) => changeFilters({ search: e.target.value })}
            placeholder="이름 · 이메일 검색"
            aria-label="교육생 검색"
          />
          {search && (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                aria-label="검색어 지우기"
                onClick={() => changeFilters({ search: '' })}
              >
                <XIcon />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>

        {/*
          선택지가 서버에서 온다 — 아직 안 왔으면 메뉴가 그렇다고 말한다.
          「전체」는 상수라 목록을 안 기다린다(그동안에도 고를 수 있다).
        */}
        <FilterSelect
          label="반"
          value={classFilter}
          onChange={(v) => changeFilters({ classFilter: v })}
          fixed={[{ value: ALL, label: '전체' }]}
          options={classOptions?.map((c) => ({ value: c.classroomId, label: c.name }))}
          failed={classrooms.isError}
          onRetry={() => void classrooms.refetch()}
        />

        {/* 계정·정렬은 **코드가 갖는 선택지**라 늦게 올 일이 없다 — 바로 넘긴다 */}
        <FilterSelect
          label="계정"
          value={accountFilter}
          onChange={(v) => changeFilters({ accountFilter: v as FilterValues['accountFilter'] })}
          options={ACCOUNT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          // 기본 w-32(128px)가 "초대 대기"를 못 담아 잘렸다(사용자 지적, 실측 렌더 확인).
          // w-36도 너무 빠듯해 보인다는 지적으로 w-40까지 넓힘(2차 실측 렌더 확인)
          className="w-40"
        />
        <FilterSelect
          label="정렬"
          value={sort}
          onChange={(v) => changeFilters({ sort: v as TraineeSort })}
          options={SORT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          // "계정"과 같은 폭으로 맞춘다
          className="w-40"
        />
      </div>

      {/*
        D41 — `view`(roster.data)가 있는데 배경 재조회만 실패했을 때 쓰는 조용한 배너.
        아래 3단 분기와 별개로 최상위에 둔 것은, 분기 안(`StaleBlock`)에 넣으면 그 블록을
        감싸려고 JSX 전체를 `<>...</>`로 다시 싸야 해서 표 렌더 부분까지 통째로 재인덴트되기
        때문 — 여기 두면 표 렌더 코드는 한 줄도 안 건드리고 배너만 얹을 수 있다.
        (OrgListScreen·SA-01 파일럿과 같은 결함 클래스, decision-log.md D41 참고.)
      */}
      {roster.isError && view && (
        <Alert variant="warning" className="mb-3">
          <AlertTitle>명단을 새로고침하지 못했습니다</AlertTitle>
          <AlertDescription>마지막으로 불러온 명단을 보여드리고 있어요.</AlertDescription>
          <AlertAction>
            <Button variant="ghost" size="sm" onClick={() => roster.refetch()}>
              다시 시도
            </Button>
          </AlertAction>
        </Alert>
      )}

      {cohortFailed ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>담당 기수가 없습니다</EmptyTitle>
            <EmptyDescription>
              반 배정이 끝나면 여기에 담당 교육생이 나타납니다.
              <br />
              배정은 <b className="text-fg-muted">오퍼레이터가 합니다.</b>
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : !view && !roster.isError ? (
        /*
          ⚠ **`isPending`으로 판정하지 않는다** — 기수를 아직 못 받아 `enabled: false`인
          동안에도 값은 없다. **값이 있나 없나**로 가른다(MG-03과 같은 판정).

          높이는 이 표에서 잰 값이다 — 헤더 38.5 · 행 57.3(두 줄 셀이라 기본 53보다 크다)
          · 푸터 44(`mt-3` 12 + 페이저 32). 20행은 `PAGE_SIZE`와 같다.
        */
        <TableSkeleton
          rows={PAGE_SIZE}
          cols={['w-[22%]', 'w-[13%]', 'w-[8%]', 'w-[10%]', 'w-[22%]', 'w-[10%]', 'w-[3%]']}
          rowH={57.3}
          footerH={44}
        />
      ) : !view ? (
        /*
          D41 — `view`(roster.data)가 아예 없을 때(최초 진입 실패·캐시 만료)만 전면
          에러로 막는다. `view`가 있는데 배경 재조회만 실패한 경우는 아래 분기에서
          기존 명단을 그대로 보여주고 조용한 배너로만 알린다 — 안 그러면 사이드바
          재진입마다 이미 보여준 정상 명단이 배경 재조회 실패 하나로 지워진다
          (OrgListScreen·SA-01 파일럿과 같은 결함 클래스, decision-log.md D41 참고).

          조건이 `roster.isError && !view`가 아니라 `!view`인 이유 — 위 스켈레톤 분기가
          `!view && !roster.isError`를 이미 걸러내서, 여기 남는 `!view`는 항상
          `roster.isError`인 케이스다. `X.isError && !view`로 쓰면 TS가 아래 `view`
          사용 곳(표·페이지네이션)에서 undefined narrowing을 못 해 `tsc`가 21곳에서
          떨어진다(진용님 로컬 typecheck 실측, TS18048).
        */
        <Empty>
          <EmptyHeader>
            <EmptyTitle>명단을 불러오지 못했습니다</EmptyTitle>
            <EmptyDescription>잠시 후 다시 시도해 주세요.</EmptyDescription>
          </EmptyHeader>
          <Button variant="ghost" onClick={() => roster.refetch()}>
            다시 시도
          </Button>
        </Empty>
      ) : (
        /*
          🔴 **빈 상태도 같이 덮는다.** 처음엔 표 갈래만 감쌌는데, 결과가 0건인 조건에서
          다른 조건으로 바꾸면 **6.6초 동안 「조건에 맞는 교육생이 없습니다」가 그대로**
          있고 로딩 표시가 하나도 없었다(실측 · 조회를 3초 늦춰 재현).

          0건도 **옛 조건의 결과**다 — 규칙 E가 "표를 비우지 말라"고 하는 것과 같은 이유로
          여기도 덮어야 한다. 푸터까지 함께 감싸는 것은 개수도 같이 옛 값이기 때문이다.
        */
        <StaleBlock stale={roster.isPlaceholderData} label="명단을 불러오는 중">
          {view.rows.length === 0 ? (
            /*
              빈 결과가 "아직 없음"인지 "필터에 안 걸림"인지 문구가 갈린다 — 하나로 묶으면
              매니저가 무엇을 기다려야 하는지 모른다. 판정은 **조회에 실제로 나간 검색어**로
              한다(입력 원본으로 하면 타이핑 첫 글자에 아직 안 좁혀진 결과를 두고 말한다).
            */
            narrowed && view.scopeTotal > 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>
                    {settledSearch
                      ? `"${settledSearch}"와 맞는 사람이 없습니다`
                      : '조건에 맞는 교육생이 없습니다'}
                  </EmptyTitle>
                  <EmptyDescription>
                    {/* 반 목록이 아직이면 반 수를 빼고 말한다 — 0개라고 하지 않는다 */}
                    {classOptions ? `담당 반 ${classOptions.length}개 · ` : ''}
                    {view.scopeTotal}명에서 찾았습니다.
                    {accountFilter !== ALL && (
                      <>
                        {/* 줄바꿈을 직접 끊는다(사용자 지시). "으로"를 고정으로 붙였더니
                            "초대 대기"엔 안 맞았다("대기으로") — withParticle로 받침에
                            맞춘다(대기 → …로, 비활성 → …으로, D14 공용 유틸). */}
                        <br />
                        계정 필터가{' '}
                        <b className="text-fg-muted">
                          {withParticle(ACCOUNT_LABEL[accountFilter], '으로', '로')}
                        </b>{' '}
                        걸려 있어요
                        <br />
                        초대 대기나 비활성일 수 있습니다.
                      </>
                    )}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              // 명단은 오퍼레이터가 등록하므로 생성 유도를 넣지 않는다(F6)
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>이 반에 등록된 교육생이 없습니다</EmptyTitle>
                  <EmptyDescription>
                    기수 명단과 반 배정이 끝나면 여기에 나타납니다.
                    <br />
                    명단은 <b className="text-fg-muted">오퍼레이터가 등록</b>합니다.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )
          ) : (
            <>
              <TableFrame>
                <Table className="table-fixed border-0 bg-transparent rounded-none">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-64">교육생</TableHead>
                      <TableHead className="w-36">개념 도달</TableHead>
                      {/*
                      **`2단 이하`가 아니라 `2단 미만`이다.** 목 열 이름을 그대로 뒀다가
                      렌더에서 잡았다 — `2·2·1`인 사람이 `1/3`, `2·2·2`인 사람이 `0/3`으로
                      나온다. 서버는 **0~1단**만 센다(원장이 `reach_level <= 1`).

                      30차 R5로 확정됐다 — 값이 아니라 설명이 틀린 것이었고, 백엔드가
                      명단·상세·타임라인 7곳의 문구를 정정했다. 이 라벨이 기준이다.
                    */}
                      <TableHead className="w-24">2단 미만</TableHead>
                      <TableHead className="w-28 text-center">이번 회차</TableHead>
                      <TableHead className="w-64 pl-8">우수 누적</TableHead>
                      <TableHead className="w-28">계정</TableHead>
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {view.rows.map((t) => {
                      const hot = t.lowCount !== null && t.lowCount >= 2
                      return (
                        <TableRow
                          key={t.id}
                          className="hover:bg-surface-2 cursor-pointer"
                          onClick={() => navigate(`/manager/trainees/${t.id}`)}
                        >
                          <TableCell className="w-64">
                            <div className="flex items-center gap-3">
                              <Avatar aria-hidden="true">
                                <AvatarFallback className="bg-primary-soft text-primary font-semibold">
                                  {t.name.slice(0, 1)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <span className="flex items-center gap-1.5">
                                  <Link
                                    to={`/manager/trainees/${t.id}`}
                                    aria-label={`${t.name} 상세 보기`}
                                    className="text-fg hover:text-primary font-semibold hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {t.name}
                                  </Link>
                                  <span className="text-fg-subtle text-2xs">{t.className}</span>
                                </span>
                                <p className="text-fg-subtle text-2xs">{maskEmail(t.email)}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="w-36 text-xs">
                            <ConceptReachCell reach={t.reach} />
                          </TableCell>
                          <TableCell className="w-24 text-xs tabular-nums">
                            {/*
                            분모는 **서버가 준 사람별 문항 수**다(`expectedConceptCount`).
                            목이 `/3`을 박아 뒀는데 실제로는 2·3이 섞여 온다 — 코드에
                            근거가 없어 문항이 안 만들어지면 그 사람 분모가 줄어든다.
                          */}
                            {t.lowCount === null ? (
                              <span className="text-fg-subtle">—</span>
                            ) : (
                              <span className={hot ? 'text-warning' : 'text-fg-muted'}>
                                <b className={cn('font-bold', hot ? 'text-warning' : 'text-fg')}>
                                  {t.lowCount}
                                </b>
                                /{t.lowTotal}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="w-28 text-center">
                            <RoundBadge kind={t.badge} />
                          </TableCell>
                          <TableCell className="w-64 pl-8 text-xs">
                            <AceOrNoteCell row={t} />
                          </TableCell>
                          <TableCell className="w-28">
                            <AccountStatusBadge status={t.accountStatus} />
                            {t.inactivated && (
                              <p className="text-fg-subtle mt-0.5 text-2xs">
                                {[t.inactivated.reason, t.inactivated.at?.slice(5, 10)]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </p>
                            )}
                          </TableCell>
                          <TableCell aria-hidden="true" className="w-8 text-fg-subtle text-right">
                            ›
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableFrame>

              <div className="mt-3 grid grid-cols-3 items-center">
                <p className="text-fg-subtle text-xs">
                  {/* 쪽 번호는 **행과 같은 응답**에서 온 것을 쓴다 — `types.ts`의 `page` */}
                  {`${view.total}명 중 ${view.page * PAGE_SIZE + 1}–${view.page * PAGE_SIZE + view.rows.length}`}
                </p>
                <div className="flex justify-center">
                  <Pagination className="mx-0 w-auto">
                    <PaginationContent>
                      {Array.from({ length: view.totalPages }, (_, i) => (
                        <PaginationItem key={i}>
                          <PaginationLink
                            isActive={i === page}
                            aria-label={`${i + 1}쪽`}
                            onClick={() => setFilters((f) => ({ ...f, page: i }))}
                          >
                            {i + 1}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                    </PaginationContent>
                  </Pagination>
                </div>
                <div />
              </div>
            </>
          )}
        </StaleBlock>
      )}
    </ConsoleShell>
  )
}
