import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { SearchIcon, XIcon } from 'lucide-react'
import ManagerShell from '@/shells/ManagerShell'
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
import { TRAINEES, type AccountStatus } from './mockData'
import { AccountStatusBadge } from './components/AccountStatusBadge'
import { maskEmail } from '@/lib/utils/mask'

/*
  SC-M11 · DASH-17 교육생 리스트. 목업 — API 연동 없이 고정 배열(mockData)을
  화면에서 직접 검색·필터·정렬한다. 실 연동 시 이 필터 로직은 쿼리 파라미터로
  옮겨간다.

  D104: 순수 디렉터리라 팀·회차·제출·점수는 없다. 위험도 정렬·판정도 배제한다
  (DASH-17 L-7) — 정렬은 이름·반 같은 중립 축만 둔다.

  페이지 범위·격리·권한(L-2~L-8, P-1~P-7)은 서버가 판정하는 영역이라 이 목업엔
  없다 — 검색 결과 없음(L-1)만 클라이언트에서 표현 가능하다.
*/

const ACCOUNT_OPTIONS: { value: 'ALL' | AccountStatus; label: string }[] = [
  { value: 'ACTIVE', label: '활성' },
  { value: 'ALL', label: '전체' },
  { value: 'INVITED', label: '초대됨' },
  { value: 'INACTIVE', label: '비활성' },
]
const ACCOUNT_ITEMS = Object.fromEntries(ACCOUNT_OPTIONS.map((o) => [o.value, `계정 · ${o.label}`]))

const SORT_OPTIONS = [
  { value: 'NAME', label: '이름순' },
  { value: 'CLASS', label: '반순' },
] as const
const SORT_ITEMS = Object.fromEntries(SORT_OPTIONS.map((o) => [o.value, `정렬 · ${o.label}`]))

export default function TraineeListScreen() {
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('ALL')
  const [accountFilter, setAccountFilter] = useState<'ALL' | AccountStatus>('ACTIVE')
  const [sort, setSort] = useState<(typeof SORT_OPTIONS)[number]['value']>('NAME')

  const classOptions = useMemo(
    () => Array.from(new Set(TRAINEES.map((t) => t.className))).sort(),
    [],
  )
  const classItems = useMemo(() => {
    const items: Record<string, string> = { ALL: '반 · 전체' }
    for (const c of classOptions) items[c] = `반 · ${c}`
    return items
  }, [classOptions])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = TRAINEES.filter((t) => {
      // 검색은 원본 이메일 기준 매칭 — 표시만 가리고(마스킹) 매니저가 이메일로
      // 찾는 실무 동작은 막지 않는다.
      if (q && !`${t.name} ${t.email}`.toLowerCase().includes(q)) return false
      if (classFilter !== 'ALL' && t.className !== classFilter) return false
      if (accountFilter !== 'ALL' && t.accountStatus !== accountFilter) return false
      return true
    })
    return filtered.sort((a, b) =>
      sort === 'CLASS'
        ? a.className.localeCompare(b.className, 'en') || a.name.localeCompare(b.name, 'ko')
        : a.name.localeCompare(b.name, 'ko'),
    )
  }, [search, classFilter, accountFilter, sort])

  return (
    <ManagerShell user={{ name: '박지현', role: '총괄 매니저' }} cohort="7기" isLead>
      <PageHeader breadcrumb="교육생 › 7기" title="교육생" count={`${TRAINEES.length}명`} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <InputGroup className="h-9 w-60">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름 · 이메일 검색"
            aria-label="교육생 검색"
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
          value={classFilter}
          onValueChange={(v) => setClassFilter(v ?? 'ALL')}
          items={classItems}
        >
          <SelectTrigger className="h-9 min-w-32" aria-label="반 필터">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">반 · 전체</SelectItem>
            {classOptions.map((c) => (
              <SelectItem key={c} value={c}>
                반 · {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={accountFilter}
          onValueChange={(v) => setAccountFilter(v as typeof accountFilter)}
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

        <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)} items={SORT_ITEMS}>
          <SelectTrigger className="ml-auto h-9 min-w-32" aria-label="정렬">
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

      <TableFrame>
        <Table className="border-0 bg-transparent rounded-none">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>교육생</TableHead>
              <TableHead>반</TableHead>
              <TableHead>계정</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-fg-subtle py-8 text-center whitespace-normal"
                >
                  조건에 맞는 교육생이 없습니다.
                </TableCell>
              </TableRow>
            )}
            {rows.map((t) => (
              <TableRow
                key={t.id}
                className="hover:bg-surface-2 cursor-pointer"
                onClick={() => navigate(`/manager/trainees/${t.id}`)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar aria-hidden="true">
                      <AvatarFallback className="bg-primary-soft text-primary font-semibold">
                        {t.name.slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Link
                        to={`/manager/trainees/${t.id}`}
                        aria-label={`${t.name} 상세 보기`}
                        className="text-fg hover:text-primary font-semibold hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {t.name}
                      </Link>
                      <p className="text-fg-subtle text-2xs">{maskEmail(t.email)}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-fg-muted text-xs">{t.className}</TableCell>
                <TableCell>
                  <AccountStatusBadge status={t.accountStatus} />
                  {t.accountStatus === 'INACTIVE' && t.inactiveReason && (
                    <p className="text-fg-subtle mt-0.5 text-2xs">
                      {t.inactiveReason} · {t.inactiveAt}
                    </p>
                  )}
                </TableCell>
                <TableCell aria-hidden="true" className="text-fg-subtle text-right">
                  ›
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableFrame>

      <div className="mt-3 grid grid-cols-3 items-center">
        <p className="text-fg-subtle text-xs">{`${rows.length}개 중 1–${rows.length}`}</p>
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
    </ManagerShell>
  )
}
