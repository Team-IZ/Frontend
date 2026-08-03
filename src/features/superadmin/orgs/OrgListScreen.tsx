import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
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
import { ORGS, type Org, type OrgStatus } from './mockData'
import OrgMetrics from './components/OrgMetrics'
import OrgCreateDialog from './components/OrgCreateDialog'
import { cn } from '@/lib/utils/cn'

/*
  SA-01 기관 목록 — 슈퍼어드민의 실질 홈(정의서 §1). v1 원본이 없어 정의서 +
  와이어프레임(superadmin/console.html#page-list)만 보고 새로 짰다.

  검색·상태 필터만 둔다 — 와이어프레임 실제 렌더에 별도 정렬 셀렉트는 없다(자세한
  판단은 mockData.ts 주석 참고). 대신 표 컬럼 헤더 자체를 Table.tsx의 기존
  sortable/onSort API로 정렬 가능하게 한다 — 교육생 리스트 등 3개 화면이 이미 쓰는
  같은 패턴(th.sortable, ↕ 아이콘)이라 새 컨트롤을 안 만들어도 된다.

  "오퍼레이터 미배정"이 이 목록의 핵심 신호라(§3) 행 배경을 warning-soft로 올리고
  이름 옆에 "신규" 배지를 단다 — 목록을 훑을 때 바로 눈에 띄어야 한다.
  정지 기관은 숨기지 않고 대신 흐리게 둔다(§6 "정지 기관을 목록에서 숨기지 않는다").
*/

const STATUS_OPTIONS: { value: 'ALL' | OrgStatus; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'ACTIVE', label: '활성' },
  { value: 'SUSPENDED', label: '정지' },
]
const STATUS_ITEMS = Object.fromEntries(STATUS_OPTIONS.map((o) => [o.value, `상태 · ${o.label}`]))

type SortKey = 'name' | 'cohortCount' | 'traineeCount' | 'monthlyAiCostUsd' | 'createdAt'

/** 컬럼별 기본 방향 — 날짜는 최신이 먼저, 나머지는 오름차순이 자연스럽다 */
const DEFAULT_DIRECTION: Record<SortKey, Exclude<SortDirection, false>> = {
  name: 'asc',
  cohortCount: 'asc',
  traineeCount: 'asc',
  monthlyAiCostUsd: 'asc',
  createdAt: 'desc',
}

/** 영문이 한글보다 앞에 오게 — localeCompare('ko')만 쓰면 로케일 콜레이션에 맡겨져
 * 어느 쪽이 먼저 올지 보장이 안 된다. 첫 글자가 라틴 문자인지로 먼저 그룹을 가르고,
 * 그 안에서만 각 언어에 맞는 collator로 비교한다. */
function compareOrgName(a: string, b: string): number {
  const rank = (s: string) => (/^[A-Za-z]/.test(s) ? 0 : 1)
  const ra = rank(a)
  const rb = rank(b)
  if (ra !== rb) return ra - rb
  return a.localeCompare(b, ra === 0 ? 'en' : 'ko')
}

function compareOrgs(a: Org, b: Org, key: SortKey): number {
  switch (key) {
    case 'name':
      return compareOrgName(a.name, b.name)
    case 'cohortCount':
      return a.cohortCount - b.cohortCount
    case 'traineeCount':
      return a.traineeCount - b.traineeCount
    case 'monthlyAiCostUsd':
      return a.monthlyAiCostUsd - b.monthlyAiCostUsd
    case 'createdAt':
      return a.createdAt.localeCompare(b.createdAt)
  }
}

function OrgStatusBadge({ org }: { org: Org }) {
  // 오퍼레이터 미배정이 상태 배지를 덮는다 — 이 목록의 핵심 신호라 활성/정지보다 우선한다.
  if (org.operators.length === 0) {
    return <Badge variant="warning">오퍼레이터 미배정</Badge>
  }
  return org.status === 'ACTIVE' ? (
    <Badge variant="success">활성</Badge>
  ) : (
    <Badge variant="neutral">정지</Badge>
  )
}

export default function OrgListScreen() {
  const navigate = useNavigate()

  // 복사해서 갖는다 — mockData.ORGS는 createOrg가 직접 mutate하는 공유 저장소라(중복
  // 확인이 방금 만든 기관도 보게 하려고), 이 배열을 그대로 state로 들고 있으면 두 번
  // 갱신될 때 참조가 꼬여 같은 기관이 중복으로 그려질 수 있다.
  const [orgs, setOrgs] = useState<Org[]>(() => [...ORGS])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | OrgStatus>('ALL')
  const [createOpen, setCreateOpen] = useState(false)
  // 기본값 — 최근 생성된 기관이 맨 위
  const [sort, setSort] = useState<{ key: SortKey; direction: Exclude<SortDirection, false> }>({
    key: 'createdAt',
    direction: 'desc',
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return orgs.filter((o) => {
      if (q && !o.name.toLowerCase().includes(q)) return false
      if (statusFilter !== 'ALL' && o.status !== statusFilter) return false
      return true
    })
  }, [orgs, search, statusFilter])

  const sorted = useMemo(() => {
    const dir = sort.direction === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => compareOrgs(a, b, sort.key) * dir)
  }, [filtered, sort])

  const isPlatformEmpty = orgs.length === 0

  function handleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: DEFAULT_DIRECTION[key] },
    )
  }

  function sortProps(key: SortKey) {
    return {
      sortable: true as const,
      sortDirection: (sort.key === key ? sort.direction : false) as SortDirection,
      onSort: () => handleSort(key),
    }
  }

  function handleCreated() {
    // createOrg가 이미 mockData.ORGS 맨 앞에 넣어뒀다(mockData.ts 주석 참고) — 여기서
    // 또 prepend하면 중복으로 그려진다. 공유 저장소를 다시 복사해오기만 한다.
    setOrgs([...ORGS])
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

      <OrgMetrics orgs={orgs} />

      {isPlatformEmpty ? (
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
                onChange={(e) => setSearch(e.target.value)}
                placeholder="기관명 검색…"
                aria-label="기관명 검색"
              />
              {search && (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    aria-label="검색어 지우기"
                    onClick={() => setSearch('')}
                  >
                    <XIcon />
                  </InputGroupButton>
                </InputGroupAddon>
              )}
            </InputGroup>

            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter((v as typeof statusFilter) ?? 'ALL')}
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

          {filtered.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>
                  {search ? `"${search}"와 맞는 기관이 없습니다` : '조건에 맞는 기관이 없습니다'}
                </EmptyTitle>
                <EmptyDescription>전체 {orgs.length}개 기관에서 찾았습니다.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <TableFrame>
                <Table className="table-fixed border-0 bg-transparent rounded-none">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-56" {...sortProps('name')}>
                        기관명
                      </TableHead>
                      <TableHead className="w-16 text-right" {...sortProps('cohortCount')}>
                        기수
                      </TableHead>
                      <TableHead className="w-20 text-right" {...sortProps('traineeCount')}>
                        교육생
                      </TableHead>
                      <TableHead className="w-32 text-right" {...sortProps('monthlyAiCostUsd')}>
                        이번 달 AI 비용
                      </TableHead>
                      <TableHead className="w-36">오퍼레이터</TableHead>
                      <TableHead className="w-40">상태</TableHead>
                      <TableHead className="w-28" {...sortProps('createdAt')}>
                        생성일
                      </TableHead>
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sorted.map((org) => {
                      const unassigned = org.operators.length === 0
                      const suspended = org.status === 'SUSPENDED'
                      return (
                        <TableRow
                          key={org.id}
                          className={cn(
                            'hover:bg-surface-2 cursor-pointer',
                            unassigned && 'bg-warning-soft hover:bg-warning-soft',
                          )}
                          onClick={() => navigate(`/superadmin/orgs/${org.id}`)}
                        >
                          <TableCell
                            className={cn(
                              'w-56 font-bold',
                              suspended && 'text-fg-muted font-normal',
                            )}
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
                              suspended && 'text-fg-muted',
                            )}
                          >
                            {org.cohortCount}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'w-20 text-right tabular-nums',
                              suspended && 'text-fg-muted',
                            )}
                          >
                            {org.traineeCount}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'w-32 text-right tabular-nums',
                              suspended && 'text-fg-muted',
                            )}
                          >
                            ${org.monthlyAiCostUsd.toLocaleString()}
                          </TableCell>
                          <TableCell className="w-36 text-xs">
                            {unassigned ? (
                              <span className="text-warning font-semibold">미배정</span>
                            ) : org.operators.length === 1 ? (
                              org.operators[0]
                            ) : (
                              `${org.operators[0]} 외 ${org.operators.length - 1}`
                            )}
                          </TableCell>
                          <TableCell className="w-40">
                            <OrgStatusBadge org={org} />
                          </TableCell>
                          <TableCell
                            className={cn(
                              'w-28 text-xs',
                              suspended ? 'text-fg-subtle' : 'text-fg-muted',
                            )}
                          >
                            {org.createdAt}
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
                <p className="text-fg-subtle text-xs">{`1–${sorted.length} / ${sorted.length}개`}</p>
                <div className="flex justify-center">
                  <Pagination className="mx-0 w-auto">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationLink isActive aria-label="1쪽">
                          1
                        </PaginationLink>
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
                <div />
              </div>
            </>
          )}
        </>
      )}

      <OrgCreateDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={handleCreated} />
    </ConsoleShell>
  )
}
