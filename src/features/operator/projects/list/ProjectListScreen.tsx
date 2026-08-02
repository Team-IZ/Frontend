import { useCallback, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import ConsoleShell from '@/shells/ConsoleShell'
import PageHeader from '@/components/common/PageHeader'
import { Button } from '@/components/ui/Button'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils/cn'
import { getCohortScope, getToday, listCurricula, listProjects } from '../api'
import { dueLabel } from '../rules'
import { KIND_LABEL } from '../labels'
import { useAsync } from '../useAsync'
import type { ProjectKind, ProjectSort, ProjectStatus } from '../types'
import ProjectStatusBadge from '../components/ProjectStatusBadge'
import ProjectFilters from './components/ProjectFilters'
import { ALL, INITIAL_FILTERS, isNarrowed, type FilterValues } from './filterState'
import { ConceptCell, CurriculumCell, DueCell } from './components/ProjectRowCells'
import CreateProjectDialog from './components/CreateProjectDialog'

/*
  OP-03 프로젝트 목록 — 이 목록이 답하는 질문은 하나, **회차 설계가 완결됐나.**
  회차가 굴러가려면 넷이 있어야 한다: 교안 1개 이상 · 검증 개념 3건 · 제출 마감 ·
  응시 창. 하나라도 비면 문항을 만들 수 없다.

  ▸ 진행률·조치 열을 두지 않는다. 관측은 다른 화면 몫이다 — `개념 공백`·`분석 실패`는
    OP-01 `조치 필요`, 반별 제출·응시율은 OP-04 `현황` 탭이 답한다. 목록에 넣으면
    같은 사실이 세 곳에 생긴다(D1).
  ▸ **빈 칸이 곧 할 일이다.** `교안 연결 안 됨`·`⚠ 미확정`·`미설정`이 각각 어느 탭을
    열어야 하는지 가리킨다 — 별도 조치 열이 필요 없는 이유다.
  ▸ 이 화면의 유일한 경고는 **조합**이다 — 마감 임박 + 준비 중. 상태 하나나 날짜
    하나로는 안 보이고 둘이 만나야 보인다. 행 배경으로 표시한다.

  **이 파일은 조립만 한다.** 검색·필터·정렬·집계는 `api`가(서버 자리), 셀 분기는
  `ProjectRowCells`가, 툴바는 `ProjectFilters`가 갖는다 — 화면은 "무엇을 어디에 놓나"만.

  컬럼 폭은 목업 px을 베끼지 않았다(decision-log D22). 목업은 6열 전부에 폭을 줘서
  `table-layout:fixed`가 남는 폭을 비례 분배해 선언값이 무의미해져 있었다. 실제 콘텐츠를
  재서 8배수로 올리고, **흡수 열 하나(검증 개념)를 비운다.**
*/

/*
  기수는 아직 스위처가 하나뿐이라 상수다. 실제 세션이 붙으면 헤더 스코프에서 받는다 —
  그때 이 한 줄만 바뀐다.
*/
const COHORT_ID = '7'

/** 상세 경로. 행 클릭과 링크가 같은 곳을 가리켜야 한다 — 문자열을 두 번 적지 않는다 */
const detailPath = (id: string) => `/operator/projects/${id}`

export default function ProjectListScreen() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<FilterValues>(INITIAL_FILTERS)
  const [createOpen, setCreateOpen] = useState(false)

  const loadProjects = useCallback(
    () =>
      listProjects({
        cohortId: COHORT_ID,
        search: filters.search || undefined,
        curriculumId: filters.curriculumId === ALL ? undefined : filters.curriculumId,
        kind: filters.kind === ALL ? undefined : (filters.kind as ProjectKind),
        status: filters.status === ALL ? undefined : (filters.status as ProjectStatus),
        sort: filters.sort as ProjectSort,
      }),
    [filters],
  )
  const loadCurricula = useCallback(() => listCurricula(COHORT_ID), [])
  const loadScope = useCallback(() => getCohortScope(COHORT_ID), [])

  const page = useAsync(loadProjects)
  const curricula = useAsync(loadCurricula)
  const scope = useAsync(loadScope)

  const curriculumList = curricula.data ?? []
  const counts = page.data?.counts
  // 상태를 하나 더 만들어도 합계가 조용히 틀리지 않게 키를 나열하지 않는다
  const totalAll = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0
  const today = getToday()
  /** 빈 결과가 "아직 없음"인지 "필터에 안 걸림"인지 — 문구가 갈린다 */
  const narrowed = isNarrowed(filters)

  return (
    <ConsoleShell role="operator">
      <PageHeader
        breadcrumb="프로젝트 › 7기"
        title="프로젝트"
        count={counts ? `총 ${totalAll}개` : undefined}
        breakdown={
          counts && (
            <>
              {/*
                스코프를 화면이 먼저 밝힌다 — 프로젝트가 기수 단위라 반을 지정하지 않는데,
                이 문구가 없으면 "반이 왜 없지"라는 질문이 남는다(OP-03 3-1).
              */}
              {scope.data && (
                <span className="text-fg-subtle">
                  {scope.data.name} 전체 ·{' '}
                  <b className="text-fg-muted font-bold">
                    {scope.data.classes}반 {scope.data.trainees}명
                  </b>
                  이 같은 회차를 한다
                </span>
              )}
              <span className="ml-3">
                준비 중 <b className="text-fg font-bold">{counts.PREP}</b>
                <span className="text-fg-subtle">
                  {' '}
                  · 진행 중 {counts.RUNNING} · 종료 {counts.DONE}
                </span>
              </span>
            </>
          )
        }
        action={<Button onClick={() => setCreateOpen(true)}>+ 프로젝트 생성</Button>}
      />

      <ProjectFilters
        {...filters}
        curricula={curriculumList}
        onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
      />

      {page.loading ? (
        // Spinner가 이미 role="status"를 갖는다 — 래퍼에 또 붙이면 라이브 리전이 중첩된다.
        // 기본 aria-label이 영문("Loading")이라 화면 언어에 맞춰 덮어쓴다.
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
              <EmptyDescription>전체 {totalAll}개에서 찾았습니다.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          // 빈 상태에 생성을 권한다 — 매니저 화면과 반대다. 오퍼레이터는 만들 권한이 있다
          <Empty>
            <EmptyHeader>
              <EmptyTitle>아직 프로젝트가 없습니다</EmptyTitle>
              <EmptyDescription>
                회차를 만들고 교안을 연결하면 검증 개념 3건을 고를 수 있습니다.
              </EmptyDescription>
            </EmptyHeader>
            <Button onClick={() => setCreateOpen(true)}>+ 프로젝트 생성</Button>
          </Empty>
        )
      ) : (
        page.data && (
          <>
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {/* 폭은 실측 근거(D22). 흡수 열(검증 개념)에만 폭을 주지 않는다 */}
                  <TableHead className="w-40">프로젝트</TableHead>
                  <TableHead className="w-14">유형</TableHead>
                  <TableHead className="w-40">교안</TableHead>
                  <TableHead>검증 개념 3건</TableHead>
                  <TableHead className="w-32">제출 마감</TableHead>
                  <TableHead className="w-24">상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.data.items.map((p) => {
                  // 이 화면의 유일한 경고는 조합이다 — 마감 임박 + 준비 중
                  const urgent = p.status === 'PREP' && dueLabel(p.dueAt, today)?.urgent === true
                  return (
                    <TableRow
                      key={p.id}
                      className={cn(
                        'cursor-pointer',
                        urgent ? 'bg-warning-soft' : 'hover:bg-surface-2',
                      )}
                      onClick={() => navigate(detailPath(p.id))}
                    >
                      <TableCell>
                        {/*
                          행 전체가 클릭되지만 그것만으로는 **키보드로 상세에 갈 수 없다**
                          (완료 정의 — git-convention §6). 실제 링크를 하나 두면 Tab·Enter로
                          닿고, 새 탭 열기·주소 복사 같은 브라우저 기본 동작도 따라온다.
                          행 클릭과 중복 실행되지 않게 전파를 멈춘다.
                        */}
                        <Link
                          to={detailPath(p.id)}
                          className="text-fg hover:text-primary font-semibold hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {p.name}
                        </Link>
                        {p.note && <p className="text-fg-subtle text-2xs">{p.note}</p>}
                      </TableCell>
                      <TableCell>{KIND_LABEL[p.kind]}</TableCell>
                      <TableCell className="text-xs">
                        <CurriculumCell project={p} curricula={curriculumList} />
                      </TableCell>
                      <TableCell>
                        <ConceptCell project={p} />
                      </TableCell>
                      <TableCell className="text-xs">
                        <DueCell project={p} now={today} />
                      </TableCell>
                      <TableCell>
                        <ProjectStatusBadge status={p.status} />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>

            {/*
              푸터 — 범위 개수(좌) + 페이저(중앙), 오른쪽은 비운다(E3).
              페이지가 하나뿐이라 페이저를 그리지 않는다(E7) — 누를 수 없는 컨트롤은 장식이다.
            */}
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

      <CreateProjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        cohortId={COHORT_ID}
        curricula={curriculumList}
        onCreated={page.reload}
      />
    </ConsoleShell>
  )
}
