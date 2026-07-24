import { useMemo, useState } from 'react'
import { Link } from 'react-router'
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
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/Pagination'
import { CURRICULA, type ExtractionStatus } from './mockData'
import {
  ExtractionStatusBadge,
  TopicAssignmentBadge,
  topicBucket,
  type TopicBucket,
} from './components/StatusBadges'

/*
  SC-M12 · CUR-03 교안 목록. 목업 — API 연동 없이 고정 배열(mockData)을 화면에서
  직접 검색·필터·정렬한다. 실 연동 시 이 필터 로직은 쿼리 파라미터로 옮겨간다.

  열람=총괄·담당 둘 다 / 저작(등록·재처리·삭제)=총괄만(D91) — isLead가 저작 액션만
  가린다. 인증이 붙기 전까지 사용자·기수·역할은 대시보드와 같은 방식으로 화면에서 고정한다.
*/

const SEARCH_PLACEHOLDER = '교안명 · 주제 검색'

const STATUS_OPTIONS: { value: 'ALL' | ExtractionStatus; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'EXTRACTED', label: '추출 완료' },
  { value: 'EXTRACTING', label: '추출 중' },
  { value: 'EXTRACTION_FAILED', label: '추출 실패' },
  { value: 'UPLOADED', label: '업로드됨' },
]
const STATUS_ITEMS = Object.fromEntries(
  STATUS_OPTIONS.map((o) => [o.value, `추출 상태 · ${o.label}`]),
)

const TOPIC_OPTIONS: { value: 'ALL' | TopicBucket; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'FULL', label: '지정 완료' },
  { value: 'PARTIAL', label: '부분 지정' },
  { value: 'NONE', label: '미지정' },
  { value: 'NA', label: '추출 전' },
]
const TOPIC_ITEMS = Object.fromEntries(
  TOPIC_OPTIONS.map((o) => [o.value, `주제 지정 · ${o.label}`]),
)

const SORT_OPTIONS = [
  { value: 'RECENT', label: '최근 수정순' },
  { value: 'NAME', label: '이름순' },
] as const
const SORT_ITEMS = Object.fromEntries(SORT_OPTIONS.map((o) => [o.value, `정렬 · ${o.label}`]))

export default function CurriculumListScreen() {
  const isLead = true

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | ExtractionStatus>('ALL')
  const [topicFilter, setTopicFilter] = useState<'ALL' | TopicBucket>('ALL')
  const [projectFilter, setProjectFilter] = useState('ALL')
  const [sort, setSort] = useState<(typeof SORT_OPTIONS)[number]['value']>('RECENT')

  const projectOptions = useMemo(
    () => Array.from(new Set(CURRICULA.flatMap((c) => c.projects))).sort(),
    [],
  )
  const projectItems = useMemo(() => {
    const items: Record<string, string> = {
      ALL: '적용 프로젝트 · 전체',
      NONE: '적용 프로젝트 · 미연결',
    }
    for (const p of projectOptions) items[p] = `적용 프로젝트 · ${p}`
    return items
  }, [projectOptions])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = CURRICULA.filter((c) => {
      if (q && !`${c.name} ${c.keywords}`.toLowerCase().includes(q)) return false
      if (statusFilter !== 'ALL' && c.extractionStatus !== statusFilter) return false
      if (topicFilter !== 'ALL' && topicBucket(c.topicSections, c.totalSections) !== topicFilter)
        return false
      if (projectFilter === 'NONE' && c.projects.length > 0) return false
      if (
        projectFilter !== 'ALL' &&
        projectFilter !== 'NONE' &&
        !c.projects.includes(projectFilter)
      )
        return false
      return true
    })
    return filtered.sort((a, b) =>
      sort === 'NAME' ? a.name.localeCompare(b.name, 'en') : b.updatedAt.localeCompare(a.updatedAt),
    )
  }, [search, statusFilter, topicFilter, projectFilter, sort])

  return (
    <ManagerShell user={{ name: '박지현', role: '총괄 매니저' }} cohort="7기" isLead={isLead}>
      <PageHeader
        breadcrumb="교안 › 7기"
        title="교안 관리"
        count={`총 ${CURRICULA.length}개`}
        action={
          isLead && (
            <Button nativeButton={false} render={<Link to="/manager/curriculum/new" />}>
              + 교안 등록
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <InputGroup className="h-9 w-60">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={SEARCH_PLACEHOLDER}
            aria-label="교안 검색"
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
          onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
          items={STATUS_ITEMS}
        >
          <SelectTrigger className="h-9 min-w-44" aria-label="추출 상태 필터">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                추출 상태 · {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={topicFilter}
          onValueChange={(v) => setTopicFilter(v as typeof topicFilter)}
          items={TOPIC_ITEMS}
        >
          <SelectTrigger className="h-9 min-w-44" aria-label="주제 지정 필터">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TOPIC_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                주제 지정 · {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={projectFilter}
          onValueChange={(v) => setProjectFilter(v ?? 'ALL')}
          items={projectItems}
        >
          <SelectTrigger className="h-9 min-w-64" aria-label="적용 프로젝트 필터">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">적용 프로젝트 · 전체</SelectItem>
            <SelectItem value="NONE">적용 프로젝트 · 미연결</SelectItem>
            {projectOptions.map((p) => (
              <SelectItem key={p} value={p}>
                적용 프로젝트 · {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)} items={SORT_ITEMS}>
          <SelectTrigger className="ml-auto h-9 min-w-36" aria-label="정렬">
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
              <TableHead>교안명</TableHead>
              <TableHead>유형</TableHead>
              <TableHead>버전</TableHead>
              <TableHead>추출 상태</TableHead>
              <TableHead>주제 지정</TableHead>
              <TableHead>적용 프로젝트</TableHead>
              <TableHead>최종 수정</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-fg-subtle py-8 text-center whitespace-normal"
                >
                  조건에 맞는 교안이 없습니다.
                </TableCell>
              </TableRow>
            )}
            {rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="whitespace-normal">
                  <p className="text-fg font-bold">
                    {c.name}
                    {c.isNew && (
                      <Badge variant="info" className="ml-1.5 align-middle">
                        방금 등록
                      </Badge>
                    )}
                  </p>
                  <p className="text-fg-subtle mt-0.5 text-2xs">{c.keywords}</p>
                </TableCell>
                <TableCell className="text-fg-muted text-xs">{c.type}</TableCell>
                <TableCell className="text-fg-muted font-mono text-xs">{c.version}</TableCell>
                <TableCell>
                  <ExtractionStatusBadge status={c.extractionStatus} />
                </TableCell>
                <TableCell>
                  <TopicAssignmentBadge assigned={c.topicSections} total={c.totalSections} />
                </TableCell>
                <TableCell className="whitespace-normal">
                  {c.projects.length === 0 ? (
                    <span className="text-fg-subtle text-2xs">— 미연결</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {c.projects.map((p) => (
                        <Badge key={p} variant="neutral">
                          {p}
                        </Badge>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-fg-subtle text-xs tabular-nums">{c.updatedAt}</TableCell>
                <TableCell className="text-right">
                  {isLead && (
                    <div className="flex items-center justify-end gap-1.5">
                      {c.extractionStatus === 'EXTRACTED' && (
                        <Button variant="ghost" size="sm">
                          주제 확인 →
                        </Button>
                      )}
                      {c.extractionStatus === 'EXTRACTION_FAILED' && (
                        <Button variant="ghost" size="sm">
                          재처리
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="sm" aria-label="더 보기">
                              ⋯
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem variant="destructive">삭제</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
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
