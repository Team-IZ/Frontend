import { useCallback, useState } from 'react'
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
import { closeCohort, listCohorts } from '../_/api/api'
import { COHORT_STATUS_LABEL } from '../_/labels'
import { formatPeriod } from '../_/rules'
import type { CohortSort, CohortStatus } from '../_/api/types'
import SectionHeader from '../_/components/SectionHeader'
import TableFooterBar from '../_/components/TableFooterBar'
import { Loading, LoadFailed } from '../_/components/AsyncState'
import { CohortStatusBadge } from '../_/components/StatusBadges'
import { FilterSelect, SearchBox } from '../_/components/AdminFilters'
import { ALL, asQuery, withAll } from '../_/filterState'
import CreateCohortDialog from './components/CreateCohortDialog'
import ConfirmDialog from '../_/components/ConfirmDialog'

/*
  ① 기수 — **여기가 시작점이다.** 기수가 있어야 반을 나누고 명단을 넣을 수 있다.

  범위가 **기관 전체**다. 상단 기수 스위처가 가리키는 것은 "지금 작업 중인 기수"이고,
  이 표는 그것을 고르는 자리라 스위처의 영향을 받지 않는다.

  행을 누르면 `반 · 명단` 탭으로 간다(목업 케이스 표 `행 클릭 → 반·명단`) — 기수를
  만든 다음 실제로 하는 일이 그것이다.
*/
const SORT_OPTIONS = [
  { value: 'RECENT', label: '최신순' },
  { value: 'NAME', label: '기수명순' },
]

type Props = {
  /** 기수를 만들면 탭 이름 옆 개수가 바뀐다 */
  onCountsChange: () => void
}

export default function CohortsTab({ onCountsChange }: Props) {
  const [search, setSearch] = useState('')
  /*
    **입력값과 조회값을 가른다.** 입력칸은 `search`(즉시 반응), 조회는 `query`(멈춘 뒤).
    안 가르면 한 글자마다 요청이 나가고, 입력칸이 `query`를 보면 타이핑이 끊긴다.
  */
  const query = useDebounced(search)
  const [status, setStatus] = useState(ALL)
  const [sort, setSort] = useState<CohortSort>('RECENT')
  const [createOpen, setCreateOpen] = useState(false)
  /** 종료할 기수. 되돌리는 화면이 없으므로 확인을 받는다 */
  const [closing, setClosing] = useState<{ id: string; name: string } | null>(null)

  const load = useCallback(
    () =>
      listCohorts({
        search: query || undefined,
        status: asQuery<CohortStatus>(status),
        sort,
      }),
    [query, status, sort],
  )
  const page = useAsync(load)

  const counts = page.data?.counts
  const totalAll = counts ? counts.RUNNING + counts.CLOSED : 0
  /** 빈 결과가 "아직 없음"인지 "필터에 안 걸림"인지 — 문구가 갈린다 */
  const narrowed = query.trim().length > 0 || status !== ALL

  const refresh = () => {
    page.reload()
    onCountsChange()
  }

  return (
    <>
      <SectionHeader
        title="기수"
        count={counts ? `${totalAll}개` : undefined}
        breakdown={
          counts && (
            <>
              기관 전체 · 진행 <b className="text-fg-muted font-semibold">{counts.RUNNING}</b> ·
              종료 {counts.CLOSED}
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

      {page.loading ? (
        <Loading label="기수를 불러오는 중" />
      ) : page.failed ? (
        <LoadFailed label="기수를 불러오지 못했습니다" onRetry={page.reload} />
      ) : page.data?.items.length === 0 ? (
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
        page.data && (
          <>
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-36">기수</TableHead>
                  <TableHead className="w-24">상태</TableHead>
                  <TableHead className="w-20 text-right">반</TableHead>
                  <TableHead className="w-24 text-right">교육생</TableHead>
                  {/*
                    **정렬 키가 열 이름에 있어야 한다**(E2). 기본이 `최신순`이고 그 키는
                    시작일인데, 열 이름이 `기간`이면 `8기 · 7기 · 6기` 순서가 왜 그런지
                    묻게 된다 — 값(`2026-06 ~ 09`)은 이미 시작일로 시작하므로 이름만 맞춘다.
                  */}
                  <TableHead className="w-44">시작 ~ 종료</TableHead>
                  {/*
                    **마지막 열에만 폭을 주지 않는다**(표 열 폭 표준). 남는 폭을 흡수하는
                    유일한 칸이라, 여기가 먹어야 *"데이터는 왼쪽에 붙어 스캔되고 액션은
                    오른쪽 끝에 남는다"* — 한때 이 자리가 넓어 보여 흡수를 `기간`으로
                    옮겼다가, 표준이 의도한 배치였음을 확인하고 되돌렸다.
                  */}
                  <TableHead className="text-right">
                    <span className="sr-only">액션</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.data.items.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <b className="font-semibold">{c.name}</b>
                      {/* 지금 스위처가 가리키는 기수 — 어느 기수를 세팅 중인지가 여기서 갈린다 */}
                      {c.current && <span className="text-primary ml-1.5 text-2xs">현재</span>}
                    </TableCell>
                    <TableCell>
                      <CohortStatusBadge status={c.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{c.classes}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.trainees}</TableCell>
                    <TableCell className="text-fg-muted text-xs">
                      {formatPeriod(c.startAt, c.endAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {/* 이미 종료된 기수에는 액션이 없다 — 흐린 버튼을 두지 않는다(C1) */}
                      {c.status === 'RUNNING' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setClosing({ id: c.id, name: c.name })}
                        >
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
              range={`1–${page.data.items.length} / ${page.data.total}개`}
              page={1}
              totalPages={1}
              onPageChange={() => {}}
            />
          </>
        )
      )}

      <CreateCohortDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={refresh} />

      <ConfirmDialog
        open={closing !== null}
        onOpenChange={(v) => !v && setClosing(null)}
        title={`${closing?.name ?? ''}를 종료할까요?`}
        description="종료하면 새 프로젝트를 만들 수 없고, 진행 중인 회차의 응시 창도 더 열리지 않습니다. 이미 발행된 리포트는 그대로 남습니다."
        confirmLabel="기수 종료"
        onConfirm={async () => {
          if (closing) await closeCohort(closing.id)
          setClosing(null)
          refresh()
        }}
      />
    </>
  )
}
