import { useEffect, useMemo, useState } from 'react'
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
import { useFindCohorts } from '@/api/academic/useAcademicQueries'
import { useEndCohort } from '@/api/academic/useAcademicMutations'
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
import EndCohortDialog from './components/EndCohortDialog'

/*
  ① 기수 — **여기가 시작점이다.** 기수가 있어야 반을 나누고 명단을 넣을 수 있다.

  범위가 **기관 전체**다. 상단 기수 스위처가 가리키는 것은 "지금 작업 중인 기수"이고,
  이 표는 그것을 고르는 자리라 스위처의 영향을 받지 않는다.

  행을 누르면 그 기수로 스위처를 옮긴다 — 기수를 만든 다음 실제로 하는 일이 그것이다.

  ## ⚠ 서버가 아직 못 주는 열 둘을 뺐다
  목업에 `반`·`교육생` 열이 있었는데 지금은 그릴 수 없다.

  | | 왜 |
  |---|---|
  | 반 수 | `CohortResponse`에 필드 자체가 없다 |
  | 교육생 수 | **필드는 있는데 값이 항상 0이다.** 스펙 설명에 *"content[].traineeCount는 항상 0, managers는 항상 빈 배열"* 이라고 적혀 있고 실호출로도 확인했다(반 8개·교육생 200여 명인 기수가 0으로 온다) |

  **`—`로 두지 않고 열을 없앴다.** 값이 0으로 오면 화면은 "이 기수엔 아무도 없다"고
  **거짓말**을 하고, `—`는 "값이 없는 기수"로 읽힌다 — 둘 다 사실이 아니다. 열이 없으면
  최소한 아무 주장도 하지 않는다. 10차 요청에 올렸고, 오면 열을 되살린다.
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
  const page = useFindCohorts({
    query: {
      query: query.trim() || undefined,
      status: asQuery<CohortStatus>(status),
      size: PAGE_SIZE,
    },
  })

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

      {page.isPending ? (
        <Loading label="기수를 불러오는 중" />
      ) : page.isError ? (
        <LoadFailed label="기수를 불러오지 못했습니다" onRetry={() => void page.refetch()} />
      ) : items.length === 0 ? (
        narrowed ? (
          <Empty>
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
          <Empty>
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
        <>
          <Table className="table-fixed">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-44">기수</TableHead>
                <TableHead className="w-28">상태</TableHead>
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
        </>
      )}

      <CreateCohortDialog open={createOpen} onOpenChange={setCreateOpen} />

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
