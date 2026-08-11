import { useEffect, useMemo, useState } from 'react'
import { Alert, AlertTitle } from '@/components/ui/Alert'
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
import { listQueryOptions, staleProps } from '../../_shared/listQuery'
import { useFindCohorts } from '@/api/academic/useAcademicQueries'
import { useDeleteCohort, useEndCohort } from '@/api/academic/useAcademicMutations'
import { isApiError } from '@/api/_contract'
import { COHORT_STATUS_LABEL } from '../_/labels'
import { formatPeriod } from '../_/rules'
import { useCohortScope, type Cohort } from '../_/cohortScope'
import type { CohortStatus } from '../_/api/types'
import SectionHeader from '../_/components/SectionHeader'
import TableFooterBar from '../_/components/TableFooterBar'
import { Loading, LoadFailed } from '../_/components/AsyncState'
import { CohortStatusBadge } from '../_/components/StatusBadges'
import { FilterSelect, SearchBox } from '../_/components/AdminFilters'
import { ALL, asQuery, withAll } from '../_/filterState'
import CreateCohortDialog from './components/CreateCohortDialog'
import EditCohortDialog from './components/EditCohortDialog'
import EndCohortDialog from './components/EndCohortDialog'
import ConfirmDialog from '../_/components/ConfirmDialog'

/*
  ① 기수 — **여기가 시작점이다.** 기수가 있어야 반을 나누고 명단을 넣을 수 있다.

  범위가 **기관 전체**다. 상단 기수 스위처가 가리키는 것은 "지금 작업 중인 기수"이고,
  이 표는 그것을 고르는 자리라 스위처의 영향을 받지 않는다.

  행을 누르면 그 기수로 스위처를 옮긴다 — 기수를 만든 다음 실제로 하는 일이 그것이다.

  ## 교육생 수가 채워졌다 (10차 R3)
  한때 `traineeCount`가 항상 0이라 열을 통째로 뺐다 — 0을 그리면 "이 기수엔 아무도 없다"는
  거짓말이 된다. 지금은 실제 인원이 온다.

  ⚠ **정의가 "재적"이다** — 등록돼 있고 아직 나가지 않은 인원이라 **명단 전체 건수보다
  작다**(9기 기준 208 vs 223 · 중도 이탈 15명). 명단 탭 헤더의 수와 다른 것이 정상이다.

  `반` 열도 같이 왔다(13차 Q1) — 세려면 기수마다 `findClassrooms`를 불러야 했던 값이라
  조회가 넷 늘던 자리였다.
*/

/*
  정렬 — **서버에 없다.** `findCohorts`가 받는 것은 `status`·`query`·`page`·`size`뿐이다.

  지금 화면 안에서 정렬한다. **페이지가 하나면 클라이언트 정렬이 정확하다** — 기관당
  기수가 반년에 하나꼴이라 한 페이지(100건)를 넘지 않는다. 넘는 순간 현재 페이지
  안에서만 맞게 되므로, 그때는 서버 정렬이 필요하다(10차 요청).
*/
const SORT_OPTIONS = [
  { value: 'RECENT', label: '최신순' },
  { value: 'NAME', label: '기수명순' },
]
type CohortSort = 'RECENT' | 'NAME'

/** 한 페이지에 받는 수. 스위처(`cohortScope`)와 같은 상한을 쓴다 */
const PAGE_SIZE = 100

function sortCohorts(items: readonly Cohort[], sort: CohortSort): Cohort[] {
  return [...items].sort((a, b) =>
    sort === 'NAME'
      ? a.name.localeCompare(b.name, 'ko')
      : // 최신순 — 시작일 늦은 것이 위로. 시작일이 없는 기수는 뒤로 민다
        (b.startDate ?? '').localeCompare(a.startDate ?? ''),
  )
}

export default function CohortsTab({ onCount }: { onCount: (count: number | null) => void }) {
  const [search, setSearch] = useState('')
  /*
    **입력값과 조회값을 가른다.** 입력칸은 `search`(즉시 반응), 조회는 `query`(멈춘 뒤).
    안 가르면 한 글자마다 요청이 나가고, 입력칸이 `query`를 보면 타이핑이 끊긴다.
  */
  const query = useDebounced(search)
  const [status, setStatus] = useState(ALL)
  const [sort, setSort] = useState<CohortSort>('RECENT')
  const [createOpen, setCreateOpen] = useState(false)
  /** 종료할 기수. 되돌리는 화면이 없으므로 확인과 사유를 받는다 */
  const [ending, setEnding] = useState<Cohort | null>(null)

  /*
    **모집단은 스위처가 이미 받아 뒀다.** 상태별 내역(`진행 2 · 종료 1`)은 필터와 무관한
    전체 기준이라 걸러진 목록에서는 못 센다 — 그 값을 위해 조회를 하나 더 보내는 대신
    스위처의 전량 목록을 쓴다(같은 쿼리 키라 캐시에서 나온다).
  */
  const scope = useCohortScope()
  const page = useFindCohorts(
    {
      query: {
        query: query.trim() || undefined,
        status: asQuery<CohortStatus>(status),
        size: PAGE_SIZE,
      },
    },
    /* 조건·페이지를 바꿔도 표를 비우지 않는다 — `_shared/listQuery` 주석 참고 */
    listQueryOptions,
  )

  const counts = useMemo(() => {
    const base: Record<CohortStatus, number> = { PLANNED: 0, RUNNING: 0, CLOSED: 0 }
    for (const c of scope.cohorts) base[c.status]++
    return base
  }, [scope.cohorts])

  const totalAll = scope.cohorts.length
  const items = useMemo(() => sortCohorts(page.data?.content ?? [], sort), [page.data, sort])

  /*
    탭 이름 옆 개수 — **필터와 무관한 전체**다. 검색어를 쳐도 배지가 흔들리면 안 된다.
    렌더 중에 부모 상태를 바꾸면 렌더가 렌더를 부른다 — 커밋된 뒤에 알린다.
  */
  useEffect(() => {
    if (!scope.isPending) onCount(totalAll)
  }, [scope.isPending, totalAll, onCount])

  /** 빈 결과가 "아직 없음"인지 "필터에 안 걸림"인지 — 문구가 갈린다 */
  const narrowed = query.trim().length > 0 || status !== ALL

  const endCohort = useEndCohort()
  const removeCohort = useDeleteCohort()
  /** 수정할 기수. 개강 전에만 연다 */
  const [editing, setEditing] = useState<Cohort | null>(null)
  const [deleting, setDeleting] = useState<Cohort | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  return (
    <>
      <SectionHeader
        title="기수"
        count={scope.isPending ? undefined : `${totalAll}개`}
        breakdown={
          !scope.isPending && (
            <>
              기관 전체 · 개강 전 {counts.PLANNED} · 진행{' '}
              <b className="text-fg-muted font-semibold">{counts.RUNNING}</b> · 종료 {counts.CLOSED}
            </>
          )
        }
        action={<Button onClick={() => setCreateOpen(true)}>+ 기수 생성</Button>}
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="기수명 검색"
          label="기수 검색"
          className="w-52"
        />
        <FilterSelect
          label="상태"
          value={status}
          options={withAll(COHORT_STATUS_LABEL)}
          onChange={setStatus}
        />
        <FilterSelect
          label="정렬"
          value={sort}
          options={SORT_OPTIONS}
          onChange={(v) => setSort(v as CohortSort)}
          className="min-w-32"
        />
      </div>

      {deleteError && (
        <Alert variant="danger" className="mb-4">
          <AlertTitle>{deleteError}</AlertTitle>
        </Alert>
      )}

      {page.isPending ? (
        <Loading label="기수를 불러오는 중" />
      ) : page.isError ? (
        <LoadFailed label="기수를 불러오지 못했습니다" onRetry={() => void page.refetch()} />
      ) : items.length === 0 ? (
        narrowed ? (
          <Empty variant="empty">
            <EmptyHeader>
              <EmptyTitle>
                {query ? `"${query}"와 맞는 기수가 없습니다` : '조건에 맞는 기수가 없습니다'}
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
          /*
            기수 0 — 신규 기관이다. **생성을 권한다**: 오퍼레이터는 만들 권한이 있고,
            여기가 시작점이라 다른 탭은 아직 아무것도 담을 수 없다.
          */
          <Empty variant="empty">
            <EmptyHeader>
              <EmptyTitle>첫 기수를 만드세요</EmptyTitle>
              <EmptyDescription>
                기수가 있어야 반을 나누고 명단을 넣을 수 있습니다.
              </EmptyDescription>
            </EmptyHeader>
            <Button onClick={() => setCreateOpen(true)}>+ 기수 생성</Button>
          </Empty>
        )
      ) : (
        /* 옛 값을 그리는 동안 그 사실을 숨기지 않는다 — `_shared/listQuery` */
        <div {...staleProps(page.isPlaceholderData)}>
          <Table className="table-fixed">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-44">기수</TableHead>
                <TableHead className="w-28">상태</TableHead>
                <TableHead className="w-20 text-right">반</TableHead>
                {/* 재적 기준이라 명단 탭 헤더(전체 등록)와 다를 수 있다 — 위 주석 */}
                <TableHead className="w-24 text-right">교육생</TableHead>
                {/*
                  **정렬 키가 열 이름에 있어야 한다**(E2). 기본이 `최신순`이고 그 키는
                  시작일인데, 열 이름이 `기간`이면 `8기 · 7기 · 6기` 순서가 왜 그런지
                  묻게 된다 — 값(`2026-06 ~ 09`)은 이미 시작일로 시작하므로 이름만 맞춘다.
                */}
                <TableHead className="w-48">시작 ~ 종료</TableHead>
                {/*
                  **마지막 열에만 폭을 주지 않는다**(표 열 폭 표준). 남는 폭을 흡수하는
                  유일한 칸이라, 여기가 먹어야 데이터는 왼쪽에 붙어 스캔되고 액션은
                  오른쪽 끝에 남는다.
                */}
                <TableHead className="text-right">
                  <span className="sr-only">액션</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((c) => (
                <TableRow key={c.cohortId}>
                  <TableCell>
                    <b className="font-semibold">{c.name}</b>
                    {/* 지금 스위처가 가리키는 기수 — 어느 기수를 세팅 중인지가 여기서 갈린다 */}
                    {c.cohortId === scope.cohortId && (
                      <span className="text-primary ml-1.5 text-2xs">현재</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <CohortStatusBadge status={c.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{c.classroomCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.traineeCount}</TableCell>
                  <TableCell className="text-fg-muted text-xs">
                    {formatPeriod(c.startDate, c.endDate)}
                  </TableCell>
                  <TableCell className="space-x-1 text-right">
                    {/*
                      **다른 기수로 옮기는 자리다.** 스위처가 제목 줄에 있지만, 목록에서
                      기수를 고른 직후에 하는 일이 그것이라 여기에도 둔다.
                    */}
                    {c.cohortId !== scope.cohortId && (
                      <Button variant="ghost" size="sm" onClick={() => scope.setCohort(c.cohortId)}>
                        이 기수로
                      </Button>
                    )}
                    {/*
                      이미 종료된 기수에는 액션이 없다 — 흐린 버튼을 두지 않는다(C1).
                      **개강 전 기수에도 두지 않는다** — 스펙이 *"진행 중인 기수를 CLOSED로
                      전환한다"* 라 근거가 없다. 잘못 만든 기수를 지울 방법은 10차 질문에 있다.
                    */}
                    {c.status === 'RUNNING' && (
                      <Button variant="ghost" size="sm" onClick={() => setEnding(c)}>
                        종료
                      </Button>
                    )}
                    {/*
                      **개강 전에만 고치고 지운다**(11차 Q2). 서버가 `PLANNED`가 아니면
                      거절하고, 삭제 가능 여부는 명단·반·회차를 보고 **서버가 판정한다** —
                      상태는 운영자가 손으로 바꾸는 값이라 되돌려 두고 지울 수 있다.
                    */}
                    {c.status === 'PLANNED' && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => setEditing(c)}>
                          수정
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleting(c)}>
                          삭제
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* 기수는 몇 개뿐이라 한 쪽에 들어간다 — 페이저는 `1`만 그려진다(E7) */}
          <TableFooterBar
            range={`1–${items.length} / ${page.data?.totalElements ?? items.length}개`}
            page={1}
            totalPages={1}
            onPageChange={() => {}}
          />
        </div>
      )}

      <CreateCohortDialog open={createOpen} onOpenChange={setCreateOpen} />

      <EditCohortDialog target={editing} onOpenChange={(v) => !v && setEditing(null)} />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(v) => !v && setDeleting(null)}
        title={`${deleting?.name ?? ''}를 삭제할까요?`}
        description="개강 전 기수라 되돌릴 것이 없습니다. 명단·반·회차가 하나라도 만들어졌으면 서버가 막습니다."
        confirmLabel="기수 삭제"
        destructive
        onConfirm={async () => {
          if (!deleting) return
          setDeleteError(null)
          try {
            await removeCohort.mutateAsync({ path: { cohortId: deleting.cohortId } })
            setDeleting(null)
          } catch (e) {
            /*
              **무엇이 걸렸는지는 서버 메시지에 있다**(11차 Q2 — 코드는 하나로 답한다).
              화면이 조건을 다시 세지 않는다 — 명단·반·회차를 전부 조회해야 알 수 있다.
            */
            setDeleteError(
              isApiError(e) && e.code === 'COHORT_NOT_DELETABLE'
                ? e.message
                : '기수를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.',
            )
            setDeleting(null)
          }
        }}
      />

      <EndCohortDialog
        cohort={ending}
        onOpenChange={(open) => !open && setEnding(null)}
        onConfirm={async (reason) => {
          if (!ending) return
          await endCohort.mutateAsync({ path: { cohortId: ending.cohortId }, body: { reason } })
          setEnding(null)
        }}
      />
    </>
  )
}
