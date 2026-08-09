import { useCallback, useState } from 'react'
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
import { useAsync } from '@/lib/useAsync'
import { useDebounced } from '@/lib/useDebounced'
import { listCurricula } from '../_/api/api'
import { CURRICULUM_STATUS_LABEL } from '../_/labels'
import type { CurriculumStatus } from '../_/api/types'
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

type Props = {
  /** 교안을 등록하면 탭 이름 옆 개수가 바뀐다 */
  /**
   * ⚠ **아직 목이다.** 실서버로 옮길 때 이 탭의 개수를 여기로 알린다 —
   * 목 개수를 배지에 쓰면 실제와 다른 수가 탭 이름 옆에 붙는다.
   */
  onCount: (count: number | null) => void
}

export default function CurriculaTab(_: Props) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  /*
    **입력값과 조회값을 가른다.** 입력칸은 `search`(즉시 반응), 조회는 `query`(멈춘 뒤).
    안 가르면 한 글자마다 요청이 나가고, 입력칸이 `query`를 보면 타이핑이 끊긴다.
  */
  const query = useDebounced(search)
  const [status, setStatus] = useState(ALL)
  const [registerOpen, setRegisterOpen] = useState(false)

  const load = useCallback(
    () =>
      listCurricula({
        search: query || undefined,
        status: asQuery<CurriculumStatus>(status),
      }),
    [query, status],
  )
  const page = useAsync(load)

  const counts = page.data?.counts
  const totalAll = counts ? counts.DONE + counts.ANALYZING + counts.FAILED : 0
  const narrowed = query.trim().length > 0 || status !== ALL

  return (
    <>
      <SectionHeader
        title="교안"
        count={counts ? `${totalAll}개` : undefined}
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
      </div>

      {page.loading ? (
        <Loading label="교안을 불러오는 중" />
      ) : page.failed ? (
        <LoadFailed label="교안을 불러오지 못했습니다" onRetry={page.reload} />
      ) : page.data?.items.length === 0 ? (
        narrowed ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>
                {query ? `"${query}"와 맞는 교안이 없습니다` : '조건에 맞는 교안이 없습니다'}
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
        page.data && (
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
                {page.data.items.map((c) => (
                  <TableRow
                    key={c.id}
                    className="hover:bg-surface-2 cursor-pointer"
                    onClick={() => navigate(detailPath(c.id))}
                  >
                    <TableCell>
                      {/*
                        행 클릭만으로는 **키보드로 상세에 못 간다**(완료 정의). 실제 링크를
                        하나 두면 Tab·Enter로 닿고 새 탭·주소 복사도 따라온다.
                      */}
                      <Link
                        to={detailPath(c.id)}
                        className="text-fg hover:text-primary font-semibold hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-fg-muted text-xs">{c.version}</TableCell>
                    {/* 분석 전·실패면 `—`다. **0과 다르다**(F3) */}
                    <TableCell className="text-right tabular-nums">{c.sections ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.teachItems ?? '—'}</TableCell>
                    <TableCell className="text-fg-muted text-xs">
                      {c.linkedProjectNames.length > 0 ? c.linkedProjectNames.join(' · ') : '—'}
                    </TableCell>
                    <TableCell>
                      <CurriculumStatusBadge status={c.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <TableFooterBar
              range={`1–${page.data.items.length} / ${page.data.total}개`}
              page={1}
              totalPages={1}
              onPageChange={() => {}}
            />
          </>
        )
      )}

      <RegisterCurriculumDialog
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        onRegistered={() => {
          page.reload()
        }}
      />
    </>
  )
}
