import { Link, useNavigate } from 'react-router'
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
import { Badge } from '@/components/ui/Badge'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/Pagination'
import { CURRICULA } from './mockData'

/*
  MG-09 교안 목록. 이 기수 회차에 연결된 것만 보여준다 — 등록·재분석은
  오퍼레이터(OP-06) 소관이라 이 화면엔 쓰기 액션이 하나도 없다(정의서 §6).

  검색·필터를 두지 않는다 — 기수당 교안이 3~5개라 목록으로 충분하다(§8).
  그래서 TableFrame의 툴바 슬롯 없이 표를 바로 붙인다(v1 CUR-03과 다른 점).
*/

const COHORT_LABEL = '7기'

export default function CurriculumScreen() {
  const navigate = useNavigate()

  return (
    <ConsoleShell role="manager">
      <PageHeader
        breadcrumb={`교안 › ${COHORT_LABEL}`}
        title="교안"
        count={`${CURRICULA.length}개`}
        breakdown={
          <>
            이 기수 회차에 연결된 것만 ·{' '}
            <b className="text-fg-muted font-bold">등록·재분석은 오퍼레이터</b>
          </>
        }
      />

      {CURRICULA.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>이 기수 회차에 연결된 교안이 없습니다</EmptyTitle>
            <EmptyDescription>
              프로젝트가 만들어지고 교안이 연결되면 여기에 나타납니다.
              <br />
              <b className="text-fg-muted">등록은 오퍼레이터가 합니다.</b>
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <TableFrame>
            <Table className="table-fixed border-0 bg-transparent rounded-none">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-64">교안</TableHead>
                  <TableHead className="w-20">버전</TableHead>
                  <TableHead className="w-20 text-right">섹션</TableHead>
                  <TableHead className="w-28 text-right">가르친 항목</TableHead>
                  <TableHead>쓰인 회차</TableHead>
                  <TableHead className="w-28">분석</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {CURRICULA.map((c) => (
                  <TableRow
                    key={c.id}
                    className="hover:bg-surface-2 cursor-pointer"
                    onClick={() => navigate(`/manager/curriculum/${c.id}`)}
                  >
                    <TableCell className="w-64 font-bold">
                      <Link
                        to={`/manager/curriculum/${c.id}`}
                        className="text-fg hover:text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-fg-muted w-20 font-mono text-xs">
                      {c.version}
                    </TableCell>
                    <TableCell className="w-20 text-right tabular-nums">
                      {c.sectionCount === null ? (
                        <span className="text-fg-subtle">―</span>
                      ) : (
                        c.sectionCount
                      )}
                    </TableCell>
                    <TableCell className="w-28 text-right tabular-nums">
                      {c.itemCount === null ? (
                        <span className="text-fg-subtle">―</span>
                      ) : (
                        c.itemCount
                      )}
                    </TableCell>
                    <TableCell className="text-fg-muted text-xs">
                      {c.usedRoundLabels.join(' · ')}
                    </TableCell>
                    <TableCell className="w-28">
                      {c.analysisStatus === 'DONE' ? (
                        <Badge variant="success">분석 완료</Badge>
                      ) : (
                        <Badge variant="warning">분석 실패</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableFrame>

          <div className="mt-3 grid grid-cols-3 items-center">
            <p className="text-fg-subtle text-xs">{`1–${CURRICULA.length} / ${CURRICULA.length}개`}</p>
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
    </ConsoleShell>
  )
}
