import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { PlusIcon, SearchIcon, XIcon } from 'lucide-react'
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
  type SortDirection,
} from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import { Skeleton } from '@/components/ui/Skeleton'
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
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/Pagination'
import { getPageRange } from '@/components/ui/paginationRange'
import { toPage } from '@/api/_contract'
import {
  useFindOrganizations,
  useFindPlatformSummary,
} from '@/api/organization/useOrganizationQueries'
import type {
  findOrganizations_Item,
  findOrganizations_Query,
} from '@/api/organization/organizationTypes'
import {
  ORG_SORT_DEFAULT_DIRECTION,
  formatCost,
  formatDate,
  formatOperators,
  orgSortValue,
  orgStatusBadge,
  type OrgSortDirection,
  type OrgSortKey,
} from './labels'
import OrgMetrics, { OrgMetricsSkeleton, OrgMetricsFailed } from './components/OrgMetrics'
import OrgCreateDialog from './components/OrgCreateDialog'
import { useDebounced } from '@/lib/useDebounced'
import { cn } from '@/lib/utils/cn'

/*
  SA-01 기관 목록 — 슈퍼어드민의 실질 홈(정의서 §1).

  **검색·상태 필터·정렬·페이징을 전부 서버가 한다.** 스펙 설명이 못을 박아 뒀다 —
  *"모두 서버가 처리하므로 화면은 파라미터만 넘기면 된다(클라이언트에서 다시 거르지 않는다)."*
  예전에는 전량을 받아 `filter`·`sort`했는데, 그 모양은 **페이지가 나뉘는 순간 틀린다**
  (한 페이지 안에서만 맞는 정렬을 전체인 것처럼 보여준다).

  **정렬은 이름·생성일 둘뿐이다.** 기수 수·교육생 수·비용은 별도 배치 집계라 페이지를 자른
  뒤에 채워져 전역 정렬이 성립하지 않는다(labels.ts `OrgSortKey` 주석). 눌러도 안 되는
  컨트롤을 두느니 정렬 버튼을 안 만든다.

  "오퍼레이터 미배정"이 이 목록의 핵심 신호라(§3) 행 배경을 warning-soft로 올리고
  이름 옆에 "신규" 배지를 단다. 정지 기관은 숨기지 않고 흐리게 둔다(§6).
*/

const PAGE_SIZE = 20

type StatusFilter = 'ALL' | NonNullable<findOrganizations_Query['status']>

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'ACTIVE', label: '활성' },
  { value: 'SUSPENDED', label: '정지' },
]
const STATUS_ITEMS = Object.fromEntries(STATUS_OPTIONS.map((o) => [o.value, `상태 · ${o.label}`]))

/*
  `DELETION_PENDING`·`DELETED`는 필터에 넣지 않는다 — **찾아 쓰는 조건이 아니라 눈에 띄어야
  하는 상태**다. 배지로는 그린다(labels.orgStatusBadge). 필터에 넣으면 평소 안 쓰는 항목이
  둘 늘고, 그만큼 자주 쓰는 두 개가 묻힌다.
*/

function OrgStatusBadge({ org }: { org: findOrganizations_Item }) {
  const { variant, label } = orgStatusBadge(org)
  return <Badge variant={variant}>{label}</Badge>
}

export default function OrgListScreen() {
  const navigate = useNavigate()

  /*
    SA-02 갔다가 뒤로가기 — 이 화면은 라우트가 바뀌면 언마운트된다(`useState`뿐이면
    검색어·필터·정렬·쪽 번호가 전부 초기화). URL을 진짜 저장소로 쓴다 — 브라우저가
    뒤로가기에서 URL을 그대로 복원해 주므로 마운트 시 거기서 읽으면 된다
    (2026-08-12 렌더 실측으로 초기화 확인 — screenhardening.md 5단계).
  */
  const [searchParams, setSearchParams] = useSearchParams()

  const [search, setSearch] = useState(() => searchParams.get('q') ?? '')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    () => (searchParams.get('status') as StatusFilter | null) ?? 'ALL',
  )
  const [sort, setSort] = useState<{ key: OrgSortKey; direction: OrgSortDirection }>(() => {
    const key = (searchParams.get('sortKey') as OrgSortKey | null) ?? 'createdAt'
    return {
      key,
      direction:
        (searchParams.get('sortDir') as OrgSortDirection | null) ?? ORG_SORT_DEFAULT_DIRECTION[key],
    }
  })
  const [page, setPage] = useState(() => Number(searchParams.get('page')) || 1)
  const [createOpen, setCreateOpen] = useState(false)

  // 입력은 즉시, 조회는 멈춘 뒤 — 안 그러면 한 글자마다 요청이 나간다
  const searchQuery = useDebounced(search)

  // 확정된(디바운스 끝난) 조건만 URL에 남긴다 — 타이핑 중간값으로 히스토리를 어지르지 않는다
  useEffect(() => {
    const next = new URLSearchParams()
    if (searchQuery.trim()) next.set('q', searchQuery.trim())
    if (statusFilter !== 'ALL') next.set('status', statusFilter)
    if (sort.key !== 'createdAt') next.set('sortKey', sort.key)
    if (sort.direction !== ORG_SORT_DEFAULT_DIRECTION[sort.key]) next.set('sortDir', sort.direction)
    if (page !== 1) next.set('page', String(page))
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, statusFilter, sort, page])

  const query: findOrganizations_Query = {
    query: searchQuery.trim() || undefined,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    sort: orgSortValue(sort.key, sort.direction),
    page: page - 1, // 서버는 0부터, 화면은 1부터
    size: PAGE_SIZE,
  }

  const { data, isPending, isError, refetch } = useFindOrganizations({ query })
  const summary = useFindPlatformSummary()

  const result = data ? toPage<findOrganizations_Item>(data) : null
  const rows = result?.items ?? []
  const total = result?.total ?? 0
  const totalPages = data?.totalPages ?? 1

  /*
    "기관이 하나도 없다"와 "조건에 맞는 게 없다"는 다른 화면이다. 전자는 만들라고 권하고
    후자는 조건을 바꾸라고 한다. **조건이 걸려 있으면 전자로 판정하지 않는다** — 검색어
    때문에 0건인데 "아직 등록된 기관이 없습니다"를 띄우면 거짓말이 된다.

    **로딩 중에도 판정하지 않는다** — `isPending`일 땐 `data`가 아직 없어 `total`이
    구조상 0이다. `isPending`을 안 보면 첫 진입마다(응답이 오기 전) 실제로 15개가 있어도
    "아직 등록된 기관이 없습니다"가 잠깐 뜬다(2026-08-12 실측: 새로고침 시 2~3초간 노출,
    스켈레톤 대신 빈 상태를 보여준 것 — screenhardening.md 2단계에서 렌더로 잡음).
  */
  const hasFilter = Boolean(searchQuery.trim()) || statusFilter !== 'ALL'
  const isPlatformEmpty = !isPending && !hasFilter && total === 0

  function changeSort(key: OrgSortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: ORG_SORT_DEFAULT_DIRECTION[key] },
    )
    setPage(1) // 정렬이 바뀌면 1쪽 내용이 통째로 달라진다
  }

  function sortProps(key: OrgSortKey) {
    return {
      sortable: true as const,
      sortDirection: (sort.key === key ? sort.direction : false) as SortDirection,
      onSort: () => changeSort(key),
    }
  }

  /** 조건이 바뀌면 항상 1쪽부터 — 3쪽을 보다 필터를 걸면 결과가 1쪽뿐일 수 있다 */
  function changeFilter(apply: () => void) {
    apply()
    setPage(1)
  }

  return (
    <ConsoleShell role="superadmin">
      <PageHeader
        title="기관"
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon /> 기관 생성
          </Button>
        }
      />

      {summary.isError ? (
        <OrgMetricsFailed onRetry={() => summary.refetch()} />
      ) : summary.isPending ? (
        <OrgMetricsSkeleton />
      ) : summary.data ? (
        <OrgMetrics summary={summary.data} />
      ) : null}

      {isError ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>기관 목록을 불러오지 못했습니다</EmptyTitle>
            <EmptyDescription>잠시 후 다시 시도해 주세요.</EmptyDescription>
          </EmptyHeader>
          <Button variant="ghost" onClick={() => refetch()}>
            다시 시도
          </Button>
        </Empty>
      ) : isPlatformEmpty ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>아직 등록된 기관이 없습니다</EmptyTitle>
            <EmptyDescription>기관을 만들면 여기에 나타납니다.</EmptyDescription>
          </EmptyHeader>
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon /> 기관 생성
          </Button>
        </Empty>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <InputGroup className="h-9 w-64">
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput
                value={search}
                onChange={(e) => changeFilter(() => setSearch(e.target.value))}
                placeholder="기관명 검색…"
                aria-label="기관명 검색"
              />
              {search && (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    aria-label="검색어 지우기"
                    onClick={() => changeFilter(() => setSearch(''))}
                  >
                    <XIcon />
                  </InputGroupButton>
                </InputGroupAddon>
              )}
            </InputGroup>

            <Select
              value={statusFilter}
              onValueChange={(v) =>
                changeFilter(() => setStatusFilter((v as StatusFilter) ?? 'ALL'))
              }
              items={STATUS_ITEMS}
            >
              <SelectTrigger className="h-9 min-w-32" aria-label="상태 필터">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    상태 · {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isPending ? (
            <TableFrame>
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }, (_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </TableFrame>
          ) : rows.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>
                  {searchQuery
                    ? `"${searchQuery}"와 맞는 기관이 없습니다`
                    : '조건에 맞는 기관이 없습니다'}
                </EmptyTitle>
                <EmptyDescription>검색어나 상태 필터를 바꿔 보세요.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <TableFrame>
                <Table className="table-fixed rounded-none border-0 bg-transparent">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-56" {...sortProps('name')}>
                        기관명
                      </TableHead>
                      {/* 아래 셋은 배치 집계라 서버가 정렬을 못 한다 — 헤더를 눌러도 안 되는 것을 만들지 않는다 */}
                      <TableHead className="w-16 text-right">기수</TableHead>
                      <TableHead className="w-20 text-right">교육생</TableHead>
                      <TableHead className="w-32 text-right">이번 달 AI 비용</TableHead>
                      <TableHead className="w-36">오퍼레이터</TableHead>
                      <TableHead className="w-40">상태</TableHead>
                      <TableHead className="w-28" {...sortProps('createdAt')}>
                        생성일
                      </TableHead>
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((org) => {
                      // 파생 배지는 **서버가 판정한다** — 화면이 operators.length로 유추하면 규칙이 두 곳에 생긴다
                      const dimmed = org.status !== 'ACTIVE'
                      /*
                        orgStatusBadge(labels.ts)의 우선순위(정지 > 미배정)를 행 강조에도 그대로
                        맞춘다 — 안 그러면 정지(회색 배지)인데 행만 경고색(orange)으로 남아 서로
                        다른 말을 한다(G8, 2026-08-12 Playwright 렌더 실측으로 재현·확인).
                      */
                      const unassigned = !dimmed && org.operatorUnassigned
                      return (
                        <TableRow
                          key={org.organizationId}
                          className={cn(
                            'hover:bg-surface-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                            unassigned && 'bg-warning-soft hover:bg-warning-soft',
                          )}
                          onClick={() => navigate(`/superadmin/orgs/${org.organizationId}`)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              navigate(`/superadmin/orgs/${org.organizationId}`)
                            }
                          }}
                        >
                          <TableCell
                            className={cn('w-56 font-bold', dimmed && 'text-fg-muted font-normal')}
                          >
                            <span className="flex items-center gap-1.5">
                              {org.name}
                              {unassigned && (
                                <Badge variant="warning" className="text-[10px]">
                                  신규
                                </Badge>
                              )}
                            </span>
                          </TableCell>
                          <TableCell
                            className={cn(
                              'w-16 text-right tabular-nums',
                              dimmed && 'text-fg-muted',
                            )}
                          >
                            {org.cohorts.total}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'w-20 text-right tabular-nums',
                              dimmed && 'text-fg-muted',
                            )}
                          >
                            {org.traineeCount}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'w-32 text-right tabular-nums',
                              dimmed && 'text-fg-muted',
                            )}
                          >
                            {formatCost(org.currentMonthAiCost, org.currencyCode)}
                          </TableCell>
                          <TableCell className="w-36 text-xs">
                            {unassigned ? (
                              <span className="text-warning font-semibold">미배정</span>
                            ) : (
                              formatOperators(org.operators)
                            )}
                          </TableCell>
                          <TableCell className="w-40">
                            <OrgStatusBadge org={org} />
                          </TableCell>
                          <TableCell
                            className={cn(
                              'w-28 text-xs',
                              dimmed ? 'text-fg-subtle' : 'text-fg-muted',
                            )}
                          >
                            {formatDate(org.createdAt)}
                          </TableCell>
                          <TableCell aria-hidden="true" className="text-fg-subtle w-8 text-right">
                            ›
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableFrame>

              {/*
                표 푸터 3단 — 범위 개수(좌) + 페이저(중앙), 오른쪽은 비운다(팀 규약).
                ponytail: operator/admin에 같은 모양의 `TableFooterBar`가 있는데 레이어 린트가
                features 간 import를 막는다. **세 번째 화면에서 components/common으로 올린다**(§7).
              */}
              <div className="mt-3 grid grid-cols-3 items-center">
                <p className="text-fg-subtle text-xs">
                  {`${(page - 1) * PAGE_SIZE + 1}–${(page - 1) * PAGE_SIZE + rows.length} / ${total}개`}
                </p>
                <div className="flex justify-center">
                  <Pagination className="mx-0 w-auto">
                    <PaginationContent>
                      {totalPages > 1 && (
                        <PaginationItem>
                          <PaginationPrevious
                            text="이전"
                            aria-disabled={page === 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                          />
                        </PaginationItem>
                      )}
                      {getPageRange(page, totalPages).map((p, i) => (
                        <PaginationItem key={p === '…' ? `gap-${i}` : p}>
                          {p === '…' ? (
                            <span className="text-fg-subtle px-2">…</span>
                          ) : (
                            <PaginationLink
                              isActive={p === page}
                              aria-label={`${p}쪽`}
                              onClick={() => setPage(p)}
                            >
                              {p}
                            </PaginationLink>
                          )}
                        </PaginationItem>
                      ))}
                      {totalPages > 1 && (
                        <PaginationItem>
                          <PaginationNext
                            text="다음"
                            aria-disabled={page === totalPages}
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          />
                        </PaginationItem>
                      )}
                    </PaginationContent>
                  </Pagination>
                </div>
                <div />
              </div>
            </>
          )}
        </>
      )}

      <OrgCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => setPage(1)}
      />
    </ConsoleShell>
  )
}
