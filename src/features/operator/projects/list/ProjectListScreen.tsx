import { useState } from 'react'
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
import ErrorState from '@/components/common/ErrorState'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils/cn'
import { useDebounced } from '@/lib/useDebounced'
import { staleProps } from '../../_shared/listQuery'
import { getToday, useCohortScope, useLinkableCurricula, useProjectList } from '../queries'
import { CONCEPT_COUNT, dueLabel } from '../rules'
import { useCohortId } from '@/stores/cohortScope'
import type { ProjectSort, ProjectStatus } from '../types'
import ProjectStatusBadge from '../components/ProjectStatusBadge'
import ProjectFilters from './components/ProjectFilters'
import { ALL, INITIAL_FILTERS, isNarrowed, type FilterValues } from './filterState'
import { ConceptCell, CurriculumCell, PeriodCell } from './components/ProjectRowCells'
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

/** 상세 경로. 행 클릭과 링크가 같은 곳을 가리켜야 한다 — 문자열을 두 번 적지 않는다 */
const detailPath = (id: string) => `/operator/projects/${id}`

export default function ProjectListScreen() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<FilterValues>(INITIAL_FILTERS)
  const [createOpen, setCreateOpen] = useState(false)
  /*
    기수는 서버에 물어본다 — 목일 때 쓰던 상수 `'7'`은 UUID가 아니라 실서버에서 안 통한다
    (`cohortScope.ts`). **정해지기 전에는 아무 조회도 안 나간다** — 없는 기수로 부르면
    실패 화면이 잠깐 스쳤다가 사라진다.
  */
  const { cohortId, cohortName, failed: cohortFailed } = useCohortId()

  /*
    **조회 셋이 각자 캐시된다.** 목록으로 돌아왔을 때 교안·스코프를 다시 묻지 않고,
    회차를 만들면 쓰기 훅이 목록만 정확히 무효화한다(`queries.ts`).
  */
  /*
    **입력값과 조회값을 가른다.** 그대로 조회 키에 실으면 한 글자마다 요청이 나가고,
    한글은 자모가 조합되는 중에도 `input`이 떠서 실제로는 더 나간다(`lib/useDebounced`).
    입력칸은 원본을 그려야 타이핑이 안 끊긴다.
  */
  const search = useDebounced(filters.search)

  const page = useProjectList(
    cohortId
      ? {
          cohortId,
          search: search || undefined,
          curriculumId: filters.curriculumId === ALL ? undefined : filters.curriculumId,
          status: filters.status === ALL ? undefined : (filters.status as ProjectStatus),
          sort: filters.sort as ProjectSort,
        }
      : undefined,
  )
  const curricula = useLinkableCurricula(cohortId)
  const scope = useCohortScope(cohortId)

  const curriculumList = curricula.data ?? []
  const counts = page.data?.counts
  /*
    전체 회차 수는 **서버가 준 세 값의 합**이다(`ProjectPage.population`).
    `counts` 네 값을 더하면 안 된다 — `PREP + READY`가 곧 `PLANNED`라 두 번 세게 된다.
  */
  const totalAll = page.data?.population ?? 0
  const today = getToday()
  /*
    빈 결과가 "아직 없음"인지 "필터에 안 걸림"인지 — 문구가 갈린다.
    **판정은 조회에 실제로 나간 검색어로 한다** — 입력 원본으로 하면 타이핑 첫 글자에
    아직 안 좁혀진 결과를 두고 *"조건에 맞는 회차가 없습니다"* 라고 말한다.
  */
  const narrowed = isNarrowed({ ...filters, search })

  return (
    <ConsoleShell role="operator" cohort={cohortName ?? ''}>
      <PageHeader
        // 기수 이름을 하드코딩했었다 — 기수를 바꾸면 빵부스러기만 옛 기수를 가리킨다
        breadcrumb={cohortName ? `프로젝트 › ${cohortName}` : '프로젝트'}
        title="프로젝트"
        count={page.data ? `총 ${totalAll}개` : undefined}
        /*
          **스코프 한 줄만 남긴다.** 프로젝트가 기수 단위라 반을 지정하지 않는데, 이
          문구가 없으면 *"반이 왜 없지"* 라는 질문이 남는다(OP-03 3-1).

          한때 여기에 상태 내역(`준비 중 2 · 준비됨 2 · 진행 중 1 · 종료 2`)을 같이
          늘어놨다. 한 줄에 **총계 · 스코프 · 4상태**가 들어가 정신없었고, 무엇보다
          **거기서는 누를 수 없었다** — 개수를 보는 목적이 *"고르기 전에 분포를 아는 것"*
          이라 개수는 **고르는 자리**(상태 필터)에 있어야 한다. 옮겼다.
        */
        breakdown={
          scope.data &&
          cohortName && (
            <span className="text-fg-subtle">
              {cohortName} 전체 ·{' '}
              <b className="text-fg-muted font-bold">
                {scope.data.classes}반 {scope.data.trainees}명
              </b>
            </span>
          )
        }
        action={<Button onClick={() => setCreateOpen(true)}>+ 프로젝트 생성</Button>}
      />

      <ProjectFilters
        {...filters}
        curricula={curriculumList}
        counts={counts}
        population={page.data?.population}
        onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
      />

      {cohortFailed ? (
        /*
          기수가 없으면 이 화면이 답할 질문 자체가 없다 — 회차는 기수 하위다(OP-03 3-1).
          다음 행동(기수 만들기)은 운영 관리 소관이라 링크를 걸지 않는다(C4).
        */
        <Empty variant="empty">
          <EmptyHeader>
            <EmptyTitle>기수가 없습니다</EmptyTitle>
            <EmptyDescription>
              프로젝트는 기수 안에 만듭니다 — 운영 관리에서 기수를 먼저 만드세요.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : page.isLoading ? (
        // Spinner가 이미 role="status"를 갖는다 — 래퍼에 또 붙이면 라이브 리전이 중첩된다.
        // 기본 aria-label이 영문("Loading")이라 화면 언어에 맞춰 덮어쓴다.
        <div className="flex justify-center py-16">
          <Spinner className="size-6" aria-label="목록을 불러오는 중" />
        </div>
      ) : page.isError ? (
        <ErrorState
          error={page.error}
          subject="목록"
          onRetry={() => page.refetch()}
          retrying={page.isFetching}
        />
      ) : page.data?.items.length === 0 ? (
        narrowed ? (
          <Empty variant="empty">
            <EmptyHeader>
              <EmptyTitle>
                {/* 조회에 나간 검색어를 쓴다 — 입력 원본이면 아직 안 걸린 글자를 인용한다 */}
                {search ? `"${search}"와 맞는 회차가 없습니다` : '조건에 맞는 회차가 없습니다'}
              </EmptyTitle>
              <EmptyDescription>전체 {totalAll}개에서 찾았습니다.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          // 빈 상태에 생성을 권한다 — 매니저 화면과 반대다. 오퍼레이터는 만들 권한이 있다
          <Empty variant="empty">
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
          /*
            **값이 옛 것인 동안 그 사실을 숨기지 않는다.** 표는 남기되 흐리게 —
            비우는 것(깜빡임)과 그냥 두는 것(거짓말) 사이의 답이다(async-states §1-4).
            `aria-busy`가 보조 기술에도 같은 것을 알린다.
          */
          <div {...staleProps(page.isPlaceholderData)}>
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {/*
                    **열 순서 = 판단하는 순서다.** 이 화면이 하는 일은 *"손댈 것이 남은
                    회차 찾기"* 이고 기본 정렬이 `준비 필요 순`(상태 → 마감)이다.
                    한때 `상태`가 **맨 오른쪽**에 있었는데, 그러면 정렬 1차 키를 눈으로
                    끝까지 끌고 가야 읽힌다 — E2가 *"정렬이 곧 표기"* 라고 한 자리다.

                    **폭 토큰은 표 열 폭 표준을 따른다**(01-design-checklist):
                    주 식별자 200 · 배지 108 · 기간 168. 지어내지 않는다.
                    **흡수 열(검증 개념)에만 폭을 주지 않는다** — 서술 열이 남는 폭을
                    가져가야 데이터가 왼쪽에 붙어 스캔된다(D22).

                  */}
                  <TableHead className="w-[200px]">프로젝트</TableHead>
                  <TableHead className="w-[108px]">상태</TableHead>
                  <TableHead className="w-[168px]">기간</TableHead>
                  <TableHead className="w-[200px]">교안</TableHead>
                  <TableHead>검증 개념 {CONCEPT_COUNT}건</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.data.items.map((p) => {
                  // 이 화면의 유일한 경고는 조합이다 — 마감 임박 + 준비 중
                  const urgent = p.status === 'PREP' && dueLabel(p.endDate, today)?.urgent === true
                  return (
                    <TableRow
                      key={p.projectId}
                      className={cn(
                        'cursor-pointer',
                        urgent ? 'bg-warning-soft' : 'hover:bg-surface-2',
                      )}
                      onClick={() => navigate(detailPath(p.projectId))}
                    >
                      <TableCell>
                        {/*
                          행 전체가 클릭되지만 그것만으로는 **키보드로 상세에 갈 수 없다**
                          (완료 정의 — git-convention §6). 실제 링크를 하나 두면 Tab·Enter로
                          닿고, 새 탭 열기·주소 복사 같은 브라우저 기본 동작도 따라온다.
                          행 클릭과 중복 실행되지 않게 전파를 멈춘다.
                        */}
                        <Link
                          to={detailPath(p.projectId)}
                          className="text-fg hover:text-primary font-semibold hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {p.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <ProjectStatusBadge status={p.status} />
                      </TableCell>
                      <TableCell className="text-xs">
                        <PeriodCell project={p} now={today} />
                      </TableCell>
                      <TableCell className="text-xs">
                        <CurriculumCell project={p} />
                      </TableCell>
                      <TableCell>
                        <ConceptCell project={p} />
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
          </div>
        )
      )}

      <CreateProjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        cohortId={cohortId ?? ''}
        curricula={curriculumList}
        cohort={scope.data}
        /* 생성 훅이 이 도메인 조회를 무효화한다 — 목록을 손으로 다시 부르지 않는다 */
        /*
          부분 성공 — 회차는 만들어졌는데 교안·개념·요구사항 중 하나가 안 붙었다.
          **상세로 보낸다.** 목록에 남겨 두면 `준비 중` 행 하나만 늘고 무엇이 빠졌는지
          모르는데, 지우고 다시 만드는 길은 이름 재사용 제약으로 막혀 있다.
        */
        onPartial={(projectId, message) =>
          navigate(`/operator/projects/${projectId}/config`, { state: { notice: message } })
        }
      />
    </ConsoleShell>
  )
}
