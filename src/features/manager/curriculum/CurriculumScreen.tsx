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
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/Pagination'
import { useManagerCohort } from '@/stores/cohortScope'
import { useLinkedCurricula } from './_/api/api'
import { analysisLabel, versionLabel } from './_/api/types'

/*
  MG-09 교안 목록. 이 기수 회차에 연결된 것만 보여준다 — 등록·재분석은
  오퍼레이터(OP-06) 소관이라 이 화면엔 쓰기 액션이 하나도 없다(정의서 §6).
  서버 조회(`linked-curricula`)도 정확히 그 범위다.

  검색·필터를 두지 않는다 — 기수당 교안이 3~5개라 목록으로 충분하다(§8).
  그래서 TableFrame의 툴바 슬롯 없이 표를 바로 붙인다(v1 CUR-03과 다른 점).

  ⚠ **페이지네이션이 없다.** 응답이 배열 하나라 페이지 개념 자체가 없다 — 목이
  1쪽 고정으로 그리던 자리를 「N개」 한 줄로 줄였다.

  🔴 **`섹션` 열을 뺐다.** 기수 연결 목록에 섹션 수가 없다(교안 상세에만 있다).
  행마다 상세를 부르면 교안 수만큼 콜이 되고, 그건 이 조회가 없애려던 모양
  그대로다(30차 Q2). 대신 `가르친 항목`(`teachesCount`)은 목록에 있어 그대로 쓴다.
  32차 요청서로 올린다.

  ⚠ **`쓰인 회차`가 이제 링크다.** 목은 이름 문자열만 갖고 있었는데 서버가
  `projectId`를 함께 준다 — 교안에서 회차로 바로 건너갈 수 있다.
*/

export default function CurriculumScreen() {
  const navigate = useNavigate()
  const { cohortId, cohortName, failed, cohorts, selectCohort } = useManagerCohort()
  const query = useLinkedCurricula(cohortId)

  const list = query.data ?? []

  const shell = (children: React.ReactNode) => (
    <ConsoleShell
      role="manager"
      cohort={cohortName ?? ''}
      cohorts={cohorts}
      onCohortChange={selectCohort}
    >
      <PageHeader
        breadcrumb={['교안', cohortName].filter(Boolean).join(' › ')}
        title="교안"
        count={query.data ? `${list.length}개` : undefined}
        breakdown={
          <>
            이 기수 회차에 연결된 것만 ·{' '}
            <b className="text-fg-muted font-bold">등록·재분석은 오퍼레이터</b>
          </>
        }
      />
      {children}
    </ConsoleShell>
  )

  if (failed) {
    return shell(
      <Empty>
        <EmptyHeader>
          <EmptyTitle>담당 기수가 없습니다</EmptyTitle>
          <EmptyDescription>반 배정이 끝나면 그 기수의 교안이 나타납니다.</EmptyDescription>
        </EmptyHeader>
      </Empty>,
    )
  }

  if (query.isPending) {
    return shell(
      <div className="flex justify-center py-16">
        <Spinner className="size-6" aria-label="교안을 불러오는 중" />
      </div>,
    )
  }

  if (query.isError) {
    return shell(
      <Empty>
        <EmptyHeader>
          <EmptyTitle>교안을 불러오지 못했습니다</EmptyTitle>
          <EmptyDescription>잠시 후 다시 시도해 주세요.</EmptyDescription>
        </EmptyHeader>
        <Button variant="ghost" onClick={() => void query.refetch()}>
          다시 시도
        </Button>
      </Empty>,
    )
  }

  if (list.length === 0) {
    return shell(
      <Empty>
        <EmptyHeader>
          <EmptyTitle>이 기수 회차에 연결된 교안이 없습니다</EmptyTitle>
          <EmptyDescription>
            프로젝트가 만들어지고 교안이 연결되면 여기에 나타납니다.
            <br />
            <b className="text-fg-muted">등록은 오퍼레이터가 합니다.</b>
          </EmptyDescription>
        </EmptyHeader>
      </Empty>,
    )
  }

  return shell(
    <>
      <TableFrame>
        <Table className="table-fixed rounded-none border-0 bg-transparent">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-64">교안</TableHead>
              <TableHead className="w-20">버전</TableHead>
              <TableHead className="w-20 text-right">쪽</TableHead>
              <TableHead className="w-28 text-right">가르친 항목</TableHead>
              <TableHead>쓰인 회차</TableHead>
              <TableHead className="w-28">분석</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((c) => {
              const analysis = analysisLabel(c.analysisStatus)
              /* 상세 조회 셋은 전부 `materialId`를 받는다 — `versionId`가 아니다 */
              const detailPath = `/manager/curriculum/${c.materialId}`
              return (
                <TableRow
                  key={c.versionId}
                  className="hover:bg-surface-2 cursor-pointer"
                  onClick={() => navigate(detailPath)}
                >
                  <TableCell className="w-64 font-bold">
                    <Link
                      to={detailPath}
                      className="text-fg hover:text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {c.originalFileName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-fg-muted w-20 font-mono text-xs">
                    {versionLabel(c.versionNo)}
                  </TableCell>
                  {/* 분석 전이면 쪽수가 아직 없다 — 0이 아니라 모른다는 뜻이라 대시로 */}
                  <TableCell className="w-20 text-right tabular-nums">
                    {c.pageCount ?? <span className="text-fg-subtle">―</span>}
                  </TableCell>
                  <TableCell className="w-28 text-right tabular-nums">{c.teachesCount}</TableCell>
                  {/*
                    🔴 **회차 이름을 다 늘어놓지 않는다**(렌더에서 잡았다). 목은 이 칸에
                    회차 1~2개만 있었는데 실데이터는 한 교안이 **회차 여덟 개 이상**에
                    걸린다 — 그대로 이으니 표가 컨테이너를 넘겨 오른쪽 `분석` 열이
                    통째로 잘렸다. 앞 둘만 링크로 두고 나머지는 개수로 접는다.
                    전체 목록은 상세의 `쓰인 회차` 탭이 이미 갖고 있다.
                  */}
                  <TableCell className="text-fg-muted truncate text-xs">
                    {c.linkedProjects.slice(0, 2).map((p, i) => (
                      <span key={p.projectId}>
                        {i > 0 && ' · '}
                        <Link
                          to={`/manager/projects/${p.projectId}`}
                          className="hover:text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {p.projectName}
                        </Link>
                      </span>
                    ))}
                    {c.linkedProjects.length > 2 && (
                      <span
                        className="text-fg-subtle"
                        title={c.linkedProjects.map((p) => p.projectName).join(' · ')}
                      >
                        {' '}
                        외 {c.linkedProjects.length - 2}개
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="w-28">
                    <Badge variant={analysis.variant}>{analysis.text}</Badge>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableFrame>

      <div className="mt-3 grid grid-cols-3 items-center">
        <p className="text-fg-subtle text-xs">{`1–${list.length} / ${list.length}개`}</p>
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
    </>,
  )
}
