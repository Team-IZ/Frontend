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
import { Spinner } from '@/components/ui/Spinner'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/InputGroup'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/Pagination'
import { AccountStatusBadge } from './components/AccountStatusBadge'
import { RoundBadge } from './components/RoundBadge'
import { maskEmail } from '@/lib/utils/mask'
import { cn } from '@/lib/utils/cn'
import { NA_PATTERN, REACH_STYLE } from '@/components/common/reach'
import { useDebounced } from '@/lib/useDebounced'
import { staleProps } from '@/lib/listQuery'
import { useManagerCohort } from '@/stores/cohortScope'
import { PAGE_SIZE, useManagedClassrooms, useRoster } from './_/api/api'
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
const ACCOUNT_ITEMS = Object.fromEntries(ACCOUNT_OPTIONS.map((o) => [o.value, `계정 · ${o.label}`]))
const ACCOUNT_LABEL = Object.fromEntries(ACCOUNT_OPTIONS.map((o) => [o.value, o.label]))

const SORT_OPTIONS: { value: TraineeSort; label: string }[] = [
  { value: 'NAME', label: '이름' },
  { value: 'RECENT_ENROLLED', label: '최근 등록' },
  { value: 'RISK', label: '위험' },
  { value: 'EXCELLENCE', label: '우수' },
]
const SORT_ITEMS = Object.fromEntries(SORT_OPTIONS.map((o) => [o.value, `정렬 · ${o.label}`]))

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
  const classOptions = classrooms.data?.classrooms ?? []
  /* 서버가 「이번 회차」를 골라 줬으면 드롭다운이 그 값을 그린다(첫 진입) */
  const selectedRound = round ?? view?.roundId ?? ''
  const roundItems = Object.fromEntries(
    (view?.rounds ?? []).map((r) => [r.assessmentRoundId, `회차 · ${r.label}`]),
  )
  const classItems: Record<string, string> = { ALL: '반 · 전체' }
  for (const c of classOptions) classItems[c.classroomId] = `반 · ${c.name}`

  const narrowed =
    !!settledSearch || classFilter !== ALL || accountFilter !== ALL || (view?.total ?? 0) === 0

  return (
    <ConsoleShell
      role="manager"
      cohort={cohortName ?? ''}
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
        breadcrumb={`교육생 › ${cohortName ?? ''} › 담당 반`}
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
        <Select
          value={selectedRound}
          onValueChange={(v) => v && changeFilters({ round: v })}
          items={roundItems}
        >
          <SelectTrigger
            className="h-9 min-w-44 text-sm font-semibold"
            aria-label="회차 선택"
            disabled={!view}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(view?.rounds ?? []).map((r) => (
              <SelectItem key={r.assessmentRoundId} value={r.assessmentRoundId}>
                회차 · {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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

        <Select
          value={classFilter}
          onValueChange={(v) => changeFilters({ classFilter: v ?? ALL })}
          items={classItems}
        >
          <SelectTrigger className="h-9 min-w-32" aria-label="반 필터">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">반 · 전체</SelectItem>
            {classOptions.map((c) => (
              <SelectItem key={c.classroomId} value={c.classroomId}>
                반 · {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={accountFilter}
          onValueChange={(v) =>
            changeFilters({ accountFilter: v as FilterValues['accountFilter'] })
          }
          items={ACCOUNT_ITEMS}
        >
          <SelectTrigger className="h-9 min-w-32" aria-label="계정 필터">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACCOUNT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                계정 · {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={sort}
          onValueChange={(v) => changeFilters({ sort: v as TraineeSort })}
          items={SORT_ITEMS}
        >
          <SelectTrigger className="h-9 min-w-32" aria-label="정렬">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                정렬 · {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
      ) : roster.isPending ? (
        <div className="flex justify-center py-16">
          <Spinner className="size-6" aria-label="명단을 불러오는 중" />
        </div>
      ) : roster.isError || !view ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>명단을 불러오지 못했습니다</EmptyTitle>
            <EmptyDescription>잠시 후 다시 시도해 주세요.</EmptyDescription>
          </EmptyHeader>
          <Button variant="ghost" onClick={() => roster.refetch()}>
            다시 시도
          </Button>
        </Empty>
      ) : view.rows.length === 0 ? (
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
                담당 반 {classOptions.length}개 · {view.scopeTotal}명에서 찾았습니다.
                {accountFilter !== ALL && (
                  <>
                    <br />
                    계정 필터가 <b className="text-fg-muted">{ACCOUNT_LABEL[accountFilter]}</b>으로
                    걸려 있어요 — 초대 대기나 비활성일 수 있습니다.
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
          {/* 옛 값을 그리는 동안 그 사실을 숨기지 않는다 — `lib/listQuery` */}
          <div {...staleProps(roster.isPlaceholderData)}>
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
          </div>

          <div className="mt-3 grid grid-cols-3 items-center">
            <p className="text-fg-subtle text-xs">
              {`${view.total}명 중 ${page * PAGE_SIZE + 1}–${page * PAGE_SIZE + view.rows.length}`}
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
    </ConsoleShell>
  )
}
