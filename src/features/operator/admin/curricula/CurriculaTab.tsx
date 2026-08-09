import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
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
import { useGetCurrentMember } from '@/api/member/useMemberQueries'
import { useFindOrganizationCurricula } from '@/api/curriculum/useCurriculumQueries'
import type { findOrganizationCurricula_Query } from '@/api/curriculum/curriculumTypes'
import { CURRICULUM_STATUS_LABEL } from '../_/labels'
import SectionHeader from '../_/components/SectionHeader'
import TableFooterBar from '../_/components/TableFooterBar'
import { Loading, LoadFailed } from '../_/components/AsyncState'
import { CurriculumStatusBadge } from '../_/components/StatusBadges'
import { FilterSelect, SearchBox } from '../_/components/AdminFilters'
import { ALL, asQuery, withAll } from '../_/filterState'
import RegisterCurriculumDialog from './components/RegisterCurriculumDialog'

/*
  ④ 교안 — **검증 개념의 원천이다.**

  교안을 연결해야 `가르친 항목`이 나오고, 프로젝트가 그중 3건을 골라 그 회차 모든 학생의
  문항을 만든다(14번 4-3). 그래서 여기가 비어 있으면 OP-03에서 프로젝트를 만들 수 없다.

  범위가 **기관 전체**다 — 여러 기수가 같은 교안을 쓴다. 상단 스위처와 무관하다.

  **파이프라인 산출 중 화면에 남기는 것은 둘뿐이다**(OP-06 §3) — 섹션 이름 + 페이지 범위,
  항목 이름 + 정의 한 줄. 노드·관계 수, extractor 이름 같은 것은 운영자가 그 숫자로 할
  일이 없어 버린다.
*/
const detailPath = (id: string) => `/operator/admin/curricula/${id}`

/** 한 페이지에 받는 수. 서버 상한이 100이다 */
const PAGE_SIZE = 100

type CurriculumStatus = NonNullable<findOrganizationCurricula_Query['status']>

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

type Props = {
  /** 교안 수 — 탭 이름 옆 배지 */
  onCount: (count: number | null) => void
}

export default function CurriculaTab({ onCount }: Props) {
  const navigate = useNavigate()
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
        status: asQuery<CurriculumStatus>(status),
        sort,
        size: PAGE_SIZE,
      },
    },
    { enabled: !!organizationId },
  )

  const items = page.data?.content ?? []
  /*
    **헤더 수는 필터와 무관한 전체여야 하는데 서버가 그 값을 안 준다.**

    다른 탭은 `counts`(기수)·`statusCounts`(매니저)로 모집단을 따로 받는데 교안 응답에는
    `totalElements` 하나뿐이고 그건 **필터 적용 후** 수다. 그래서 상태별 내역을 그리지
    않는다 — 걸러 보는 동안 헤더가 필터 결과를 반복하면 그게 전체인 줄 읽힌다(10차 요청).
  */
  const total = page.data?.totalElements ?? 0
  const narrowed = query.trim().length > 0 || status !== ALL

  useEffect(() => {
    // 필터를 안 건 상태의 수만 배지로 올린다 — 검색어를 쳐도 탭 배지가 흔들리면 안 된다
    if (page.data && !narrowed) onCount(total)
  }, [page.data, narrowed, total, onCount])

  return (
    <>
      <SectionHeader
        title="교안"
        count={page.data ? `${total}개` : undefined}
        breakdown="기관 전체 · 여러 기수가 같이 씁니다"
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
          options={withAll(CURRICULUM_STATUS_LABEL)}
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

      {!organizationId || page.isPending ? (
        <Loading label="교안을 불러오는 중" />
      ) : page.isError ? (
        <LoadFailed label="교안을 불러오지 못했습니다" onRetry={() => void page.refetch()} />
      ) : items.length === 0 ? (
        narrowed ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>
                {query ? `"${query}"와 맞는 교안이 없습니다` : '조건에 맞는 교안이 없습니다'}
              </EmptyTitle>
              <EmptyDescription>조건을 지우면 전체가 보입니다.</EmptyDescription>
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
          <Empty>
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
        <>
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
                    onClick={() => navigate(detailPath(c.materialId))}
                  >
                    <TableCell>
                      {/*
                        행 클릭만으로는 **키보드로 상세에 못 간다**(완료 정의). 실제 링크를
                        하나 두면 Tab·Enter로 닿고 새 탭·주소 복사도 따라온다.
                      */}
                      <Link
                        to={detailPath(c.materialId)}
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
                      {c.usedProjectCount > 0 ? `${c.usedProjectCount}개 회차에서 사용 중` : '—'}
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
        </>
      )}

      <RegisterCurriculumDialog open={registerOpen} onOpenChange={setRegisterOpen} />
    </>
  )
}
