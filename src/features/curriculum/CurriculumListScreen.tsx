import { useMemo, useState } from 'react'
import ManagerShell from '@/shells/ManagerShell'
import PageHeader from '@/components/common/PageHeader'
import { TableFrame, TableToolbar, TableFooter } from '@/components/common/TableFrame'
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
const PILL =
  'border-border-strong bg-surface-2 text-fg-muted rounded-full border px-3 py-[7px] text-xs'

const STATUS_OPTIONS: { value: 'ALL' | ExtractionStatus; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'EXTRACTED', label: '추출 완료' },
  { value: 'EXTRACTING', label: '추출 중' },
  { value: 'EXTRACTION_FAILED', label: '추출 실패' },
  { value: 'UPLOADED', label: '업로드됨' },
]

const TOPIC_OPTIONS: { value: 'ALL' | TopicBucket; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'FULL', label: '지정 완료' },
  { value: 'PARTIAL', label: '부분 지정' },
  { value: 'NONE', label: '미지정' },
  { value: 'NA', label: '추출 전' },
]

const SORT_OPTIONS = [
  { value: 'RECENT', label: '최근 수정순' },
  { value: 'NAME', label: '이름순' },
] as const

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
        action={isLead && <Button>+ 교안 등록</Button>}
      />

      <TableFrame>
        <TableToolbar>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={SEARCH_PLACEHOLDER}
            className={`${PILL} placeholder:text-fg-subtle w-60 text-fg`}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className={PILL}
            aria-label="추출 상태 필터"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                추출 상태 · {o.label}
              </option>
            ))}
          </select>
          <select
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value as typeof topicFilter)}
            className={PILL}
            aria-label="주제 지정 필터"
          >
            {TOPIC_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                주제 지정 · {o.label}
              </option>
            ))}
          </select>
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className={PILL}
            aria-label="적용 프로젝트 필터"
          >
            <option value="ALL">적용 프로젝트 · 전체</option>
            <option value="NONE">적용 프로젝트 · 미연결</option>
            {projectOptions.map((p) => (
              <option key={p} value={p}>
                적용 프로젝트 · {p}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className={`${PILL} ml-auto`}
            aria-label="정렬"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                정렬 · {o.label}
              </option>
            ))}
          </select>
        </TableToolbar>

        <Table>
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
                      <Button variant="ghost" size="sm" aria-label="더 보기">
                        ⋯
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <TableFooter range={`${rows.length}개 중 1–${rows.length}`}>
          <span className="bg-primary rounded-md px-2 py-0.5 text-xs font-semibold text-white">
            1
          </span>
        </TableFooter>
      </TableFrame>
    </ManagerShell>
  )
}
