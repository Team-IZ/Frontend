import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import ConsoleShell from '@/shells/ConsoleShell'
import { useManagedClassrooms, useManagerCohort } from '@/stores/cohortScope'
import PageHeader from '@/components/common/PageHeader'
import StaleBlock from '@/components/common/StaleBlock'
import TableSkeleton from '@/components/common/TableSkeleton'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import { Alert, AlertTitle, AlertDescription, AlertAction } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { errorCopy } from '@/lib/errorCopy'
import { useDebounced } from '@/lib/useDebounced'
import { useProjectList } from './_/api/list'
import { STATUS_LABEL, type ProjectSort, type ProjectStatus } from './_/api/listTypes'
import {
  ALL,
  getSessionFilters,
  isNarrowed,
  setSessionFilters,
  type FilterValues,
} from './filterState'
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
  조회·변환은 `_/api/`가 갖는다.

  **생성 버튼이 없다.** 프로젝트는 오퍼레이터가 만든다(OP-03) — 매니저 화면에
  생성 유도를 넣으면 할 수 없는 일을 권하는 것이다(정의서 §"생성 유도를 넣지 않는다").

  🔴 **기수 스코프로 부른다**(하드닝에서 뒤집었다). 연동 때는 `classId`로 좁혔는데,
  그러면 **팀 편성 전 프로젝트가 통째로 안 온다**(스펙: 「그 반의 팀이 편성된 프로젝트만」).
  9기에서 다가올 프로젝트 둘이 그렇게 사라져 있었다.

  덤으로 **직렬 두 왕복이 없어졌다** — 반 목록(2.1초)을 기다렸다 목록(7.6초)을 부르느라
  진입이 10초였는데, 이제 둘이 나란히 나가 7.7초다. 반 필터를 실제로 고를 때만
  `classId`로 좁힌다.
*/

const detailPath = (id: string) => `/manager/projects/${id}`

export default function ProjectListScreen() {
  const navigate = useNavigate()
  const { cohortId, cohortName, failed: cohortFailed, cohorts, selectCohort } = useManagerCohort()

  // 상세로 갔다가 "← 프로젝트"로 돌아와도 검색·상태·반·교안·정렬이 그대로 있어야
  // 한다(면담 MG-04와 같은 지시) — 세션 동안만 기억하는 모듈 전역값에서 초기화한다.
  const [filters, setFilters] = useState<FilterValues>(getSessionFilters)

  useEffect(() => {
    setSessionFilters(filters)
  }, [filters])

  /*
    **입력값과 조회값을 가른다**(규칙 K) — 그대로 조회 키에 실으면 한 글자마다 요청이
    나가고, 한글은 자모가 조합되는 중에도 `input`이 떠서 실제로는 더 나간다.
  */
  const settledSearch = useDebounced(filters.search).trim()

  const classrooms = useManagedClassrooms(cohortId)
  /*
    **`?? []`로 뭉개지 않는다**(규칙 E) — 아직 안 온 것과 없는 것은 다르다. 빈 배열이면
    조회가 「담당 반 0개」로 나가 늘 빈 결과가 된다.
  */
  const classOptions = classrooms.data?.classrooms

  /**
   * 반 필터를 고른 때만 `classId`로 좁힌다 — 「전체」면 기수 스코프다.
   * **반 목록을 기다리지 않는다**(그것이 직렬 왕복의 원인이었다).
   */
  const classIds = filters.classFilter === ALL ? undefined : [filters.classFilter]

  const list = useProjectList(
    cohortId
      ? {
          cohortId,
          classIds,
          search: settledSearch || undefined,
          curriculumId: filters.curriculum === ALL ? undefined : filters.curriculum,
          status: filters.status === ALL ? undefined : (filters.status as ProjectStatus),
          sort: filters.sort as ProjectSort,
        }
      : undefined,
  )

  const view = list.data
  const narrowed = isNarrowed(filters)

  return (
    <ConsoleShell
      role="manager"
      cohort={cohortId ?? ''}
      cohorts={cohorts}
      onCohortChange={selectCohort}
    >
      {/* 기수는 헤더에 항상 있어야 한다 */}
      <PageHeader
        breadcrumb={['프로젝트', cohortName, '담당 반'].filter(Boolean).join(' › ')}
        title="프로젝트"
        count={view ? `${view.total}개` : undefined}
      />

      <ProjectFilters
        {...filters}
        classes={classOptions}
        classesFailed={classrooms.isError}
        onRetryClasses={() => void classrooms.refetch()}
        counts={view?.counts}
        onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
      />

      {/* D41 — 배경 재조회 실패로 이미 보여준 목록을 덮지 않는다(TraineeListScreen·D43과 같은 패턴) */}
      {list.isError && view && (
        <Alert variant="warning" className="mb-3">
          <AlertTitle>목록을 새로고침하지 못했습니다</AlertTitle>
          <AlertDescription>마지막으로 불러온 목록을 보여드리고 있어요.</AlertDescription>
          <AlertAction>
            <Button variant="ghost" size="sm" onClick={() => void list.refetch()}>
              다시 시도
            </Button>
          </AlertAction>
        </Alert>
      )}

      {cohortFailed ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>담당 기수가 없습니다</EmptyTitle>
            <EmptyDescription>
              반 배정이 끝나면 그 기수의 프로젝트가 나타납니다.
              <br />
              배정은 <b className="text-fg-muted">오퍼레이터가 합니다.</b>
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : !view && !list.isError ? (
        /*
          ⚠ `isPending`으로 판정하지 않는다(규칙 E) — 반 목록을 기다리는 동안
          `enabled: false`라 `isPending`이 거짓이다. **값 유무**로 가른다.

          높이는 **이 표에서 쟀다** — 헤더 38.5 · 행 96.1(검증 개념 칩 3개가 세로로
          쌓여 다른 표보다 훨씬 높다) · 열 비율 10.8/8.5/9.9/14.2/12.8/나머지/9.9/14.2.
          6행은 이 기수 프로젝트 수인데 **기수마다 다르다** — 페이지가 없어 「페이지 크기와
          맞춘다」는 기준을 쓸 자리가 없다(MG-09 목록과 같은 상황).
        */
        <TableSkeleton
          rows={6}
          cols={[
            'w-[10.8%]',
            'w-[8.5%]',
            'w-[9.9%]',
            'w-[14.2%]',
            'w-[12.8%]',
            null,
            'w-[9.9%]',
            'w-[14.2%]',
          ]}
          rowH={96.1}
          footerH={0}
        />
      ) : !view ? (
        /*
          D41 — `list.isError && !view`가 아니라 `!view`만 쓰는 이유는 HeatmapScreen.tsx의
          같은 주석 참고. 위 스켈레톤 분기가 `!view && !list.isError`를 이미 걸러내서, 여기
          남는 `!view`는 항상 `list.isError`인 케이스다 — `X.isError && !view`로 쓰면 TS가
          아래 `view` 사용을 narrowing 못 해 tsc가 떨어진다(실측).

          🔴 **네 실패가 한 문장이었다**(하드닝 실측). 403·404·400·500을 가로채도 전부
          「목록을 불러오지 못했습니다 · 잠시 후 다시 시도해 주세요」였고, **넷 다 「다시
          시도」가 붙었다** — 권한 없음·스코프 오류에 재시도를 주면 같은 실패를 반복시킨다.

          `lib/errorCopy`가 코드·상태를 보고 문구와 재시도 여부를 정한다(규칙 I).
          MG-09가 이미 그렇게 하고 있어 같은 방식으로 맞춘다.
        */
        (() => {
          const copy = errorCopy(list.error, { subject: '프로젝트 목록' })
          return (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>{copy.title}</EmptyTitle>
                <EmptyDescription>{copy.description}</EmptyDescription>
              </EmptyHeader>
              {copy.retry && (
                <Button variant="ghost" onClick={() => void list.refetch()}>
                  다시 시도
                </Button>
              )}
            </Empty>
          )
        })()
      ) : (
        /* 0건도 옛 조건의 결과다 — 빈 상태까지 덮는다(MG-05에서 고친 것과 같은 건) */
        <StaleBlock stale={list.isPlaceholderData} label="목록을 불러오는 중">
          {view.rows.length === 0 ? (
            narrowed ? (
              <Empty>
                <EmptyHeader>
                  {/*
                    검색어를 그대로 넣는 자리라 **길이를 화면이 정한다.** 300자를 쳐도
                    가로로 넘치지 않는다(실측 — 제목이 217px 높이로 접힌다). 자르지
                    않는 것은 의도다: 잘라 버리면 「내가 친 것과 다른 말」이 되고,
                    무엇으로 찾았는지가 이 문구의 요점이다.

                    ⚠ 한때 「300자에서 표가 넘친다」고 적었는데 **내 판정식이 틀린
                    것**이었다(`main.scrollWidth`는 패딩 64px를 포함해 늘 wrap보다 크다).
                    `break-all`은 CJK가 아닌 긴 토큰(URL 같은 것)을 대비해 남긴다.
                  */}
                  <EmptyTitle className="break-all">
                    {settledSearch
                      ? `"${settledSearch}"와 맞는 프로젝트가 없습니다`
                      : '조건에 맞는 프로젝트가 없습니다'}
                  </EmptyTitle>
                  {/*
                    🔴 **반 필터가 「예정」을 통째로 지운다**(하드닝 실측). 서버의
                    `classId`는 「그 반의 **팀이 편성된** 프로젝트만」이라(스펙), 팀 편성 전
                    프로젝트는 반으로 좁히는 순간 사라진다.

                    9기에서 `예정 + C반`이 0건인데 `예정 + 전체`는 2건이다 — 이유를
                    안 말하면 「내 반에는 다음 프로젝트가 없다」로 읽힌다. 실제로는 아직
                    **팀이 안 짜인 것**이고, 그건 곧 생긴다.
                  */}
                  {filters.classFilter !== ALL && (
                    <EmptyDescription>
                      반을 고르면 <b className="text-fg-muted">팀이 편성된 프로젝트만</b> 보입니다 —
                      아직 팀을 안 짠 프로젝트는 반 필터를 <b className="text-fg-muted">전체</b>로
                      두면 나타납니다.
                    </EmptyDescription>
                  )}
                </EmptyHeader>
              </Empty>
            ) : (
              // 생성 유도를 넣지 않는다 — 프로젝트는 오퍼레이터가 만든다(정의서 §7)
              <Empty className="bg-surface-2 border-dashed">
                <EmptyHeader>
                  <EmptyTitle>이 기수에 등록된 프로젝트가 없습니다</EmptyTitle>
                  <EmptyDescription>프로젝트가 만들어지면 여기에 나타납니다.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )
          ) : (
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
                {view.rows.map((p) => (
                  <TableRow
                    key={p.id}
                    className="hover:bg-surface-2 cursor-pointer"
                    onClick={() => navigate(detailPath(p.id))}
                  >
                    <TableCell>
                      {/* 행 전체가 클릭되지만 키보드 접근을 위해 실제 링크를 하나 둔다 */}
                      <Link
                        to={detailPath(p.id)}
                        className="hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ProjectNameCell project={p} />
                      </Link>
                    </TableCell>
                    <TableCell>
                      <ProjectStatusBadge status={p.status} />
                    </TableCell>
                    <TableCell>
                      <ClassesCell actions={p.actions} />
                    </TableCell>
                    <TableCell>
                      <PeriodCell startDate={p.startDate} dueAt={p.dueAt} />
                    </TableCell>
                    <TableCell>
                      <CurriculumCell project={p} />
                    </TableCell>
                    <TableCell>
                      <ConceptCell project={p} />
                    </TableCell>
                    <TableCell>
                      <ProgressColCell progress={p.progress} status={p.status} />
                    </TableCell>
                    <TableCell>
                      <ActionColCell items={p.actions} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </StaleBlock>
      )}
    </ConsoleShell>
  )
}

export { STATUS_LABEL }
