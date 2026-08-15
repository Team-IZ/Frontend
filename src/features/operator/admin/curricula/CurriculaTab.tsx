import StaleBlock from '../../_shared/StaleBlock'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table'
import { useDebounced } from '@/lib/useDebounced'
import { listQueryOptions } from '../../_shared/listQuery'
import { useGetCurrentMember } from '@/api/member/useMemberQueries'
import { useFindOrganizationCurricula } from '@/api/curriculum/useCurriculumQueries'
import type { findOrganizationCurricula_Query } from '@/api/curriculum/curriculumTypes'
import { CURRICULUM_STATUS_LABEL } from '../_/labels'
import SectionHeader from '../_/components/SectionHeader'
import PageHeader from '@/components/common/PageHeader'
import TableFooterBar from '../_/components/TableFooterBar'
import TableSkeleton from '@/components/common/TableSkeleton'
import ErrorState from '@/components/common/ErrorState'
import { CurriculumStatusBadge } from '../_/components/StatusBadges'
import { FilterSelect, SearchBox } from '../_/components/AdminFilters'
import { ALL } from '../_/filterState'
import RegisterCurriculumDialog from './components/RegisterCurriculumDialog'

/*
  ④ 교안 — **검증 개념의 원천이다.**

  교안을 연결해야 `가르친 항목`이 나오고, 프로젝트가 그중 3건을 골라 그 회차 모든 학생의
  문항을 만든다(14번 4-3). 그래서 여기가 비어 있으면 OP-03에서 프로젝트를 만들 수 없다.

  범위가 **기관 전체**다 — 여러 기수가 같은 교안을 쓴다(`Spring 백엔드 설계` 하나가 4개
  기수 26개 프로젝트에 걸려 있다). **상단 스위처가 이 목록을 안 거른다** — 그 값은 상세의
  `연결된 프로젝트`를 가르는 데 쓰이므로 링크에 실어 보낸다(`detailPath`).

  **파이프라인 산출 중 화면에 남기는 것은 둘뿐이다**(OP-06 §3) — 섹션 이름 + 페이지 범위,
  항목 이름 + 정의 한 줄. 노드·관계 수, extractor 이름 같은 것은 운영자가 그 숫자로 할
  일이 없어 버린다.
*/
/*
  ⚠ **`?cohort=`를 같이 들고 간다.** 안 넘기면 상세가 *"고른 기수가 없다"* 로 읽어
  기본값(진행 중 기수)으로 되돌아간다 — 상세의 `연결된 프로젝트`가 **그 값으로 「지금
  기수 · 나머지」를 가르므로**, 8기를 보다 들어간 사람이 9기 기준으로 갈린 표를 받는다.
  운영 관리 탭이 같은 이유로 쿼리를 이어 붙인다(`AdminScreen`).
*/
const detailPath = (id: string, query: string) => `/operator/curricula/${id}${query}`

/** 한 페이지에 받는 수. 서버 상한이 100이다 */
const PAGE_SIZE = 100

/** `분석 전` — enum 값이 아니라 별도 파라미터라 필터 값으로만 쓰는 표식이다 */
const NOT_ANALYZED = 'NOT_ANALYZED'

/** `분석 중` — 같은 자리의 표식이다. **한 칸이 두 값을 보낸다**(아래 `statusQuery`) */
const ANALYSING = 'ANALYSING'

/** 상태 하나. **`status`가 배열이 되어**(25차 R1) 원소 타입을 꺼내 쓴다 */
type CurriculumStatus = NonNullable<findOrganizationCurricula_Query['status']>[number]

/**
 * 상태 필터 → 서버 쿼리.
 *
 * ⚠ **한때 `분석 중`이 필터에 없었다.** `PENDING`과 `RUNNING`이 같은 라벨을 쓰는데 서버
 * `status`가 값을 하나만 받아 둘을 한 번에 못 걸렀다 — 선택지를 둘로 늘리면 화면에
 * **똑같이 생긴 `분석 중`이 두 줄** 나오고, 한쪽만 보내면 절반만 나온다. 그래서 머리가
 * `분석 중 1`이라고 해 놓고 **고를 방법이 없었다.**
 *
 * **서버가 배열을 받게 되어 되살렸다** — 실측으로 `status=SUCCEEDED&status=FAILED`가
 * 합집합 12건을 준다. 운영자에게 `PENDING`·`RUNNING`은 「기다린다」 하나라 **선택지도
 * 하나**이고, 그 하나가 두 값을 보낸다.
 */
function statusQuery(value: string): CurriculumStatus[] | undefined {
  if (value === ALL || value === NOT_ANALYZED) return undefined
  return value === ANALYSING ? ['PENDING', 'RUNNING'] : [value as CurriculumStatus]
}

/*
  정렬 — 서버가 셋을 준다. **`USAGE`를 넣었다**: 목에는 없던 축인데, 이 목록의 실제
  질문이 *"이 교안 지워도 되나"* 라서 사용 회차가 많은 것부터 보는 편이 그 답에 가깝다.
*/
const SORT_OPTIONS = [
  { value: 'RECENT', label: '최근 등록순' },
  { value: 'NAME', label: '이름순' },
  { value: 'USAGE', label: '사용 많은 순' },
]
type CurriculumSort = NonNullable<findOrganizationCurricula_Query['sort']>

/*
  ⏳ **`standalone`은 이사 중에만 있는 문이다.** 같은 목록이 지금 두 곳에서 그려진다 —
  사이드바 최상위 `교안`(새 집)과 `운영 관리 › 교안` 탭(옛 집). 탭을 지울 때 이 prop과
  `SectionHeader` 갈래를 같이 지운다.

  **머리 태그가 달라서 나눈다.** 탭 안에서는 `운영 관리`가 `<h1>`이라 여기는 `<h2>`여야
  하고(SectionHeader), 최상위 화면에서는 여기가 그 화면의 `<h1>`이다(PageHeader).
  `<h1>`이 한 화면에 둘이면 스크린리더의 문서 구조가 깨진다 — 보이는 크기 문제가 아니다.
  두 컴포넌트는 prop 모양이 같아서 갈래가 한 줄로 끝난다.
*/
export default function CurriculaTab({ standalone = false }: { standalone?: boolean }) {
  const Header = standalone ? PageHeader : SectionHeader
  const navigate = useNavigate()
  /* 이름이 겹친다 — 아래 `search`는 검색어 입력값이고 이쪽은 주소의 쿼리다 */
  const { search: urlQuery } = useLocation()
  const [search, setSearch] = useState('')
  /*
    **입력값과 조회값을 가른다.** 입력칸은 `search`(즉시 반응), 조회는 `query`(멈춘 뒤).
    안 가르면 한 글자마다 요청이 나가고, 입력칸이 `query`를 보면 타이핑이 끊긴다.
  */
  const query = useDebounced(search)
  const [status, setStatus] = useState(ALL)
  const [sort, setSort] = useState<CurriculumSort>('RECENT')
  const [registerOpen, setRegisterOpen] = useState(false)

  /** 범위가 기관 전체다 — 기수 스위처와 무관하고, 기관 id는 세션이 안다 */
  const { data: me } = useGetCurrentMember()
  const organizationId = me?.organizationId

  const page = useFindOrganizationCurricula(
    {
      path: { organizationId: organizationId! },
      query: {
        query: query.trim() || undefined,
        /*
          **`분석 전`은 상태가 아니라 상태 없음이다** — `analysisStatus`가 `null`이라
          enum 값으로 고를 수 없다. 서버가 별도 파라미터로 준다(13차 R2 · 명단의
          `unassignedOnly`와 같은 모양).
        */
        status: statusQuery(status),
        notAnalyzedOnly: status === NOT_ANALYZED ? true : undefined,
        sort,
        size: PAGE_SIZE,
      },
    },
    /* 조건·페이지를 바꿔도 표를 비우지 않는다 — `_shared/listQuery` 주석 참고 */
    { enabled: !!organizationId, ...listQueryOptions },
  )

  const items = page.data?.content ?? []
  /*
    **헤더 수는 필터와 무관한 전체다**(11차 R7). `statusCounts`가 매니저와 같은 모양으로
    오고, 상태 자체가 없는 교안(`분석 전`)은 `notAnalyzedCount`로 따로 온다.

    ⚠ **둘을 합쳐 하나로 만들면 안 된다** — 합치면 "분석 완료 + 실패"가 전체와 안 맞는
    이유를 화면이 알 수 없다.
  */
  const counts = page.data?.statusCounts
  const notAnalyzed = page.data?.notAnalyzedCount ?? 0
  const totalAll = counts ? Object.values(counts).reduce((sum, n) => sum + n, 0) + notAnalyzed : 0
  /** 필터 적용 **후** 수 — 푸터가 쓴다. 헤더의 `totalAll`과 다른 값이다 */
  const total = page.data?.totalElements ?? 0
  const narrowed = query.trim().length > 0 || status !== ALL

  return (
    <>
      <Header
        title="교안"
        count={counts ? `${totalAll}개` : undefined}
        breakdown={
          counts && (
            <>
              기관 전체 · 분석 완료{' '}
              <b className="text-fg-muted font-semibold">{counts.SUCCEEDED ?? 0}</b>
              {/* 대기·진행을 한 라벨로 묶는다 — 운영자가 그 둘로 할 일이 같다(labels.ts) */}
              {(counts.PENDING ?? 0) + (counts.RUNNING ?? 0) > 0 &&
                ` · 분석 중 ${(counts.PENDING ?? 0) + (counts.RUNNING ?? 0)}`}
              {(counts.FAILED ?? 0) > 0 && (
                <>
                  {' · '}
                  <b className="text-danger font-semibold">실패 {counts.FAILED}</b>
                </>
              )}
              {notAnalyzed > 0 && ` · 분석 전 ${notAnalyzed}`}
            </>
          )
        }
        action={<Button onClick={() => setRegisterOpen(true)}>+ 교안 등록</Button>}
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="교안명 검색"
          label="교안 검색"
          className="w-52"
        />
        <FilterSelect
          label="상태"
          value={status}
          /*
            **라벨 표에서 자동 생성하지 않는다.** `withAll(CURRICULUM_STATUS_LABEL)`을 쓰면
            `분석 중`이 **두 줄** 나온다 — `PENDING`과 `RUNNING`이 같은 라벨을 쓰기 때문이다
            (운영자가 그 둘로 할 일이 같아서 묶은 것). 화면에 똑같이 생긴 선택지가 둘이면
            무엇이 다른지 알 수 없다.

            **`분석 중`은 한 선택지가 두 값(`PENDING`·`RUNNING`)을 보낸다** — 서버가 배열을
            받게 되어 되살렸다(`statusQuery`). 운영자에게 그 둘은 「기다린다」 하나라서
            선택지도 하나여야 한다 — 둘로 늘리면 똑같이 생긴 줄이 두 개 나온다.

            `분석 전`은 상태가 아니라 상태 없음이라 같은 드롭다운에 값으로만 넣는다 —
            서버 쿼리에서 갈린다(명단 탭의 `미배정`과 같은 처리).
          */
          options={[
            { value: ALL, label: '전체' },
            { value: 'SUCCEEDED', label: CURRICULUM_STATUS_LABEL.SUCCEEDED },
            { value: ANALYSING, label: CURRICULUM_STATUS_LABEL.PENDING },
            { value: 'FAILED', label: CURRICULUM_STATUS_LABEL.FAILED },
            { value: NOT_ANALYZED, label: '분석 전' },
          ]}
          onChange={setStatus}
          className="min-w-32"
        />
        <FilterSelect
          label="정렬"
          value={sort}
          options={SORT_OPTIONS}
          onChange={(v) => setSort(v as CurriculumSort)}
          className="min-w-36"
        />
      </div>

      {!organizationId || page.isLoading ? (
        <TableSkeleton rows={PAGE_SIZE} cols={['w-52', 'w-20', 'w-20', 'w-28', null, 'w-28']} />
      ) : page.isError ? (
        <ErrorState
          error={page.error}
          subject="교안"
          onRetry={() => void page.refetch()}
          retrying={page.isFetching}
        />
      ) : items.length === 0 ? (
        narrowed ? (
          <Empty variant="empty">
            <EmptyHeader>
              <EmptyTitle>
                {query ? `"${query}"에 맞는 교안이 없습니다` : '조건에 맞는 교안이 없습니다'}
              </EmptyTitle>
              <EmptyDescription>전체 {totalAll}개에서 찾았습니다.</EmptyDescription>
            </EmptyHeader>
            <Button
              variant="ghost"
              onClick={() => {
                setSearch('')
                setStatus(ALL)
              }}
            >
              필터 해제
            </Button>
          </Empty>
        ) : (
          <Empty variant="empty">
            <EmptyHeader>
              <EmptyTitle>아직 등록된 교안이 없습니다</EmptyTitle>
              {/* 왜 필요한지를 쓴다 — 이것이 없으면 프로젝트를 만들 수 없다 */}
              <EmptyDescription>
                교안을 등록해야 가르친 항목이 나오고, 프로젝트에서 그중 3건을 검증 개념으로 고를 수
                있습니다.
              </EmptyDescription>
            </EmptyHeader>
            <Button onClick={() => setRegisterOpen(true)}>+ 교안 등록</Button>
          </Empty>
        )
      ) : (
        /* 옛 값을 그리는 동안 그 사실을 숨기지 않는다 — `_shared/listQuery` */
        <StaleBlock stale={page.isFetching && page.data !== undefined} label="교안을 불러오는 중">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-52">교안</TableHead>
                <TableHead className="w-20">버전</TableHead>
                <TableHead className="w-20 text-right">섹션</TableHead>
                <TableHead className="w-28 text-right">가르친 항목</TableHead>
                {/*
                    흡수 열은 **서술 열이 가장 좋다**(표 열 폭 표준). 여기서는 마지막이
                    아니라 5번째지만, 폭 없는 열이 하나뿐이면 `table-fixed`가 남는 폭을
                    전부 이 칸에 준다 — 목업 열 순서를 지키면서 규칙도 지킨다.
                  */}
                <TableHead>연결된 프로젝트</TableHead>
                <TableHead className="w-28">분석</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((c) => {
                /*
                  **분석을 한 번도 안 한 교안은 `analysisStatus`가 `null`이다**(스펙 명시) —
                  실패와 다르다. 배지를 못 그리는 자리라 `분석 전`이라고 쓴다.
                */
                const analyzed = c.analysisStatus !== null
                return (
                  <TableRow
                    key={c.materialId}
                    className="hover:bg-surface-2 cursor-pointer"
                    onClick={() => navigate(detailPath(c.materialId, urlQuery))}
                  >
                    <TableCell>
                      {/*
                        행 클릭만으로는 **키보드로 상세에 못 간다**(완료 정의). 실제 링크를
                        하나 두면 Tab·Enter로 닿고 새 탭·주소 복사도 따라온다.
                      */}
                      <Link
                        to={detailPath(c.materialId, urlQuery)}
                        className="text-fg hover:text-primary truncate font-semibold hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* 제목이 비면 파일명이 그 자리를 대신한다 — 둘 다 서버가 준다 */}
                        {c.title ?? c.originalFileName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-fg-muted text-xs">v{c.versionNo}</TableCell>
                    {/* 분석 전이면 `—`다. **0과 다르다**(F3) */}
                    <TableCell className="text-right tabular-nums">
                      {analyzed ? c.sectionCount : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {analyzed ? c.conceptCount : '—'}
                    </TableCell>
                    {/*
                      ⚠ **회차 이름이 아니라 수다.** 목록 응답이 `usedProjectCount`만 주고
                      이름은 교안별 조회(`GET /curricula/{materialId}/projects`)에 있다 —
                      목록에서 행마다 부르면 조회가 20건 나간다. 이름은 상세에서 본다.
                    */}
                    <TableCell className="text-fg-muted text-xs">
                      {c.usedProjectCount > 0
                        ? `${c.usedProjectCount}개 프로젝트에서 사용 중`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {analyzed ? (
                        <CurriculumStatusBadge status={c.analysisStatus!} />
                      ) : (
                        <span className="text-fg-subtle text-xs">분석 전</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          <TableFooterBar
            range={`1–${items.length} / ${total}개`}
            page={1}
            totalPages={1}
            onPageChange={() => {}}
          />
        </StaleBlock>
      )}

      <RegisterCurriculumDialog open={registerOpen} onOpenChange={setRegisterOpen} />
    </>
  )
}
