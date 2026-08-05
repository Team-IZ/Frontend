import { useCallback, useState } from 'react'
import { Link, useNavigate } from 'react-router'
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
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { useAsync } from '@/lib/useAsync'
import {
  MANAGED_CLASSES,
  COHORT_NAME,
  CURRICULUM_OPTIONS,
  listManagerProjects,
  scopeLabel,
  type ClassName,
  type ProjectStatus,
} from './mockData'
import { ALL, INITIAL_FILTERS, isNarrowed, type FilterValues } from './filterState'
import ProjectStatusBadge from './components/ProjectStatusBadge'
import ProjectFilters from './components/ProjectFilters'
import {
  ProjectNameCell,
  ClassesCell,
  CurriculumCell,
  ConceptCell,
  PeriodCell,
  ProgressColCell,
  ActionColCell,
} from './components/ProjectRowCells'

/*
  MG-07 프로젝트 목록 — "내 반이 어디까지 왔고 무엇이 밀렸나"에 답한다. 오퍼레이터
  OP-03과 표는 닮았지만 시간 방향이 반대라(정의서 "OP-03과 통일하지 않은 것") 조립을
  그대로 베끼지 않았다 — 열 구성·정렬·조치 단위가 전부 이 화면 자체 계약이다.

  이 파일은 조립만 한다. 셀 분기는 `ProjectRowCells`가, 툴바는 `ProjectFilters`가,
  진행·조치 파생값은 `mockData`(rules 역할)가 갖는다.

  **생성 버튼이 없다.** 프로젝트는 오퍼레이터가 만든다(OP-03) — 매니저 화면에
  생성 유도를 넣으면 할 수 없는 일을 권하는 것이다(정의서 §"생성 유도를 넣지 않는다").
*/

const CLASS_NAMES = MANAGED_CLASSES.map((c) => c.name)
const CLASS_TOTAL: Record<ClassName, number> = Object.fromEntries(
  MANAGED_CLASSES.map((c) => [c.name, c.total]),
) as Record<ClassName, number>

const detailPath = (id: string) => `/manager/projects/${id}`

export default function ProjectListScreen() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<FilterValues>(INITIAL_FILTERS)

  const loadProjects = useCallback(
    () =>
      listManagerProjects({
        search: filters.search || undefined,
        classFilter: filters.classFilter === ALL ? undefined : (filters.classFilter as ClassName),
        curriculum: filters.curriculum === ALL ? undefined : filters.curriculum,
        status: filters.status === ALL ? undefined : (filters.status as ProjectStatus),
        sort: filters.sort,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters],
  )
  const page = useAsync(loadProjects)
  const narrowed = isNarrowed(filters)

  // 스코프 문구 — 헤더는 필터와 무관하게 항상 담당 반 전체 합계를 보여준다
  const scopeText = scopeLabel(CLASS_NAMES, CLASS_TOTAL)

  return (
    <ConsoleShell role="manager">
      <PageHeader
        breadcrumb={`프로젝트 › ${COHORT_NAME} › 담당 반`}
        title="프로젝트"
        count={page.data ? `${page.data.total}개` : undefined}
        breakdown={
          <span className="text-fg-subtle">
            담당 <b className="text-fg-muted font-bold">{scopeText}</b>
          </span>
        }
      />

      <ProjectFilters
        {...filters}
        classes={CLASS_NAMES}
        curricula={CURRICULUM_OPTIONS}
        counts={page.data?.counts}
        onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
      />

      {page.loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="size-6" aria-label="목록을 불러오는 중" />
        </div>
      ) : page.failed ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>목록을 불러오지 못했습니다</EmptyTitle>
            <EmptyDescription>잠시 후 다시 시도해 주세요.</EmptyDescription>
          </EmptyHeader>
          <Button variant="ghost" onClick={page.reload}>
            다시 시도
          </Button>
        </Empty>
      ) : page.data?.items.length === 0 ? (
        narrowed ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>
                {filters.search
                  ? `"${filters.search}"와 맞는 회차가 없습니다`
                  : '조건에 맞는 회차가 없습니다'}
              </EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          // 생성 유도를 넣지 않는다 — 프로젝트는 오퍼레이터가 만든다(정의서 §7)
          <Empty className="border-dashed bg-surface-2">
            <EmptyHeader>
              <EmptyTitle>이 기수에 등록된 프로젝트가 없습니다</EmptyTitle>
              <EmptyDescription>회차가 만들어지면 여기에 나타납니다.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )
      ) : (
        page.data && (
          <>
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {/*
                    열 순서를 팀장님의 실제 OP-03 렌더 화면(프로젝트·상태·기간·
                    교안·검증개념3건)에 맞추되, OP-03에 없는 반 열을 상태·기간 사이에
                    넣었다(사용자 지시, 4차 반영). OP-03에 없는 이 화면만의 열(진행·
                    조치 — "무엇이 밀렸는지"에 답하는 핵심)은 뒤에 이어 붙인다.
                  */}
                  <TableHead className="w-28">프로젝트</TableHead>
                  <TableHead className="w-24">상태</TableHead>
                  <TableHead className="w-28">반</TableHead>
                  <TableHead className="w-40">프로젝트 기간</TableHead>
                  <TableHead className="w-36">교안</TableHead>
                  <TableHead className="w-56">검증 개념 3건</TableHead>
                  <TableHead className="w-28">진행</TableHead>
                  <TableHead className="w-40">조치</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.data.items.map(({ project, progress, actions }) => (
                  <TableRow
                    key={project.id}
                    className="hover:bg-surface-2 cursor-pointer"
                    onClick={() => navigate(detailPath(project.id))}
                  >
                    <TableCell>
                      {/* 행 전체가 클릭되지만 키보드 접근을 위해 실제 링크를 하나 둔다(완료 정의 §6) */}
                      <Link
                        to={detailPath(project.id)}
                        className="hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ProjectNameCell project={project} />
                      </Link>
                    </TableCell>
                    <TableCell>
                      <ProjectStatusBadge status={project.status} />
                    </TableCell>
                    <TableCell>
                      <ClassesCell classes={project.classes} />
                    </TableCell>
                    <TableCell>
                      <PeriodCell startAt={project.startAt} dueAt={project.dueAt} />
                    </TableCell>
                    <TableCell>
                      <CurriculumCell project={project} />
                    </TableCell>
                    <TableCell>
                      <ConceptCell project={project} />
                    </TableCell>
                    <TableCell>
                      <ProgressColCell cell={progress} />
                    </TableCell>
                    <TableCell>
                      <ActionColCell items={actions} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* 페이지가 하나뿐이라 페이저를 그리지 않는다(E7 — 누를 수 없는 컨트롤은 장식) */}
            <div className="mt-3 grid grid-cols-3 items-center">
              <p className="text-fg-subtle text-xs">
                {`1–${page.data.items.length} / ${page.data.total}개`}
              </p>
              <div />
              <div />
            </div>
          </>
        )
      )}
    </ConsoleShell>
  )
}
