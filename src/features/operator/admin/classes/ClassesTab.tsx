import { useCallback, useState } from 'react'
import { Link } from 'react-router'
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
import { cn } from '@/lib/utils/cn'
import { deleteClass, getAdminCounts, getCohort, getNow, listClasses } from '../_/api/api'
import { canEditClasses, needsManager } from '../_/rules'
import type { ClassRoom, ClassStaffing } from '../_/api/types'
import { COHORT_ID } from '../_/cohortScope'
import SectionHeader from '../_/components/SectionHeader'
import TableFooterBar from '../_/components/TableFooterBar'
import { Loading, LoadFailed } from '../_/components/AsyncState'
import { FilterSelect, SearchBox } from '../_/components/AdminFilters'
import { ALL, asQuery } from '../_/filterState'
import AssignManagerDialog from '../_/components/AssignManagerDialog'
import ConfirmDialog from '../_/components/ConfirmDialog'
import AddClassDialog from './components/AddClassDialog'
import EditClassDialog from './components/EditClassDialog'

/*
  ② 반 — 기수를 반으로 나누고 담당 매니저를 맡긴다. 범위는 **선택 기수**다.

  **명단과 탭을 나눴다.** 정의서 OP-06 §3은 *"반을 만들고 바로 그 반에 사람을 넣는 것이
  실제 동선"* 이라 한 탭으로 합쳐 뒀는데, 만들어 보니 **두 표가 한 뷰포트에 안 들어갔다** —
  반 10행 + 명단 25행이라 반 표에 내부 스크롤을 넣어야 했고, 그러면 *"같이 보인다"* 는
  합친 이유 자체가 사라진다. 근거는 op-06-admin.md OP06-1.

  **동선은 링크로 잇는다** — 반을 만든 뒤 명단으로 가는 것은 탭 하나 누르는 일이다.
*/
type Props = {
  /** 반이 바뀌었다 — 탭 이름 옆 개수 갱신 */
  onCountsChange: () => void
}

export default function ClassesTab({ onCountsChange }: Props) {
  const [search, setSearch] = useState('')
  /** 입력칸은 `search`(즉시 반응), 조회는 `query`(멈춘 뒤) — 한 글자마다 요청하지 않는다 */
  const query = useDebounced(search)
  const [staffing, setStaffing] = useState(ALL)
  const [addOpen, setAddOpen] = useState(false)
  const [assigning, setAssigning] = useState<ClassRoom | null>(null)
  const [editing, setEditing] = useState<ClassRoom | null>(null)
  const [deleting, setDeleting] = useState<ClassRoom | null>(null)

  const load = useCallback(
    () =>
      listClasses({
        cohortId: COHORT_ID,
        search: query || undefined,
        staffing: asQuery<ClassStaffing>(staffing),
      }),
    [query, staffing],
  )
  const classes = useAsync(load)

  /*
    **헤더 수는 필터와 무관한 전체 기준이다.** 목록에서 세면 `담당 없음`으로 걸러 보는
    동안 헤더가 그 수를 그대로 반복한다 — 다른 탭이 `counts`를 따로 받는 것과 같은 이유
    (api-boundary §1-②). 탭 배지가 이미 받는 값이라 조회가 늘지 않는다.
  */
  const loadCounts = useCallback(() => getAdminCounts(COHORT_ID), [])
  const countsAsync = useAsync(loadCounts)
  const counts = countsAsync.data

  /*
    **반을 고칠 수 있는 기수인가**(OP06-7-② — 개강 전에만). 시작일이 필요해서 기수 한 건을
    받는다. 판정은 `rules.canEditClasses`가 하고 서버도 같은 규칙을 다시 검증한다 —
    화면만 막으면 우회된다.
  */
  const loadCohort = useCallback(() => getCohort(COHORT_ID), [])
  const cohort = useAsync(loadCohort).data
  const editable = cohort ? canEditClasses(cohort.startAt, getNow().slice(0, 10)) : false

  const rooms = classes.data
  /** 빈 결과가 "아직 없음"인지 "필터에 안 걸림"인지 — 문구가 갈린다 */
  const narrowed = query.trim().length > 0 || staffing !== ALL

  const changed = () => {
    classes.reload()
    // 이 탭의 헤더와 상단 탭 배지가 같은 값을 읽으므로 둘 다 새로 받는다
    countsAsync.reload()
    onCountsChange()
  }

  return (
    <>
      <SectionHeader
        title="반"
        count={counts ? `${counts.classes}개` : undefined}
        breakdown={
          counts && (
            <>
              7기
              {counts.unstaffedClasses > 0 && (
                <>
                  {' · '}
                  <b className="text-warning font-semibold">담당 없음 {counts.unstaffedClasses}</b>
                </>
              )}
              {/*
                **왜 수정 버튼이 없는지 한 줄로 답한다.** 버튼을 흐리게 두는 대신 없앴으니
                (C1) 그 자리를 설명이 대신한다 — 안 그러면 *"고치는 데가 어디지"* 를 찾아
                헤맨다. 개강 전에는 이 줄이 사라지고 버튼이 나타난다.
              */}
              {cohort && !editable && ' · 개강 후에는 반 구성을 바꿀 수 없습니다'}
            </>
          )
        }
        action={<Button onClick={() => setAddOpen(true)}>+ 반 추가</Button>}
      />

      {/* 툴바 — 검색·필터는 **전부 왼쪽**, 오른쪽은 비운다(E3). 주 액션은 제목 줄에 있다 */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="반 · 담당 매니저 검색"
          label="반 검색"
          className="w-52"
        />
        {/*
          **`담당 필요`가 이 목록의 유일한 조치 신호다**(OP-01 `조치 필요`의 `미배정`과 같은
          사실). 그래서 필터 축이 상태가 아니라 담당 유무다 — 화면이 기준을 만든 것이
          아니라 문서가 정한 상태를 그대로 쓴다(E8).
        */}
        <FilterSelect
          label="담당"
          value={staffing}
          options={[
            { value: ALL, label: '전체' },
            { value: 'UNSTAFFED', label: '담당 없음' },
            { value: 'STAFFED', label: '배정 완료' },
          ]}
          onChange={setStaffing}
          className="min-w-32"
        />
      </div>

      {classes.loading ? (
        <Loading label="반을 불러오는 중" />
      ) : classes.failed ? (
        <LoadFailed label="반을 불러오지 못했습니다" onRetry={classes.reload} />
      ) : rooms?.length === 0 ? (
        narrowed ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>
                {query ? `"${query}"와 맞는 반이 없습니다` : '조건에 맞는 반이 없습니다'}
              </EmptyTitle>
              <EmptyDescription>
                {staffing === 'UNSTAFFED' && '담당 없는 반이 없다는 뜻이기도 합니다.'}
              </EmptyDescription>
            </EmptyHeader>
            <Button
              variant="ghost"
              onClick={() => {
                setSearch('')
                setStaffing(ALL)
              }}
            >
              필터 해제
            </Button>
          </Empty>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>아직 반이 없습니다</EmptyTitle>
              <EmptyDescription>
                반을 만들어야 교육생을 나눠 담고 매니저에게 담당을 맡길 수 있습니다.
              </EmptyDescription>
            </EmptyHeader>
            <Button onClick={() => setAddOpen(true)}>+ 반 추가</Button>
          </Empty>
        )
      ) : (
        /*
          **내부 스크롤을 걷어냈다.** 명단과 한 탭이었을 때는 두 표를 한 뷰포트에 넣으려고
          `maxHeight`로 6행만 보이게 잘랐는데, 탭이 갈린 뒤에는 10반이 그대로 다 들어간다 —
          자를 이유가 없어졌다(02-layout §6은 *진짜 길어지는* 목록에만 내부 스크롤을 준다).
        */
        <>
          <Table className="table-fixed">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-24">반</TableHead>
                <TableHead className="w-40">담당 매니저</TableHead>
                {/*
                  **지금 담당 구간이 언제 열렸나.** `상태`를 빼고 남은 자리에 이것을 넣었다 —
                  배정이 기간형 이력이라(OP-06 §3) 담당은 기수 중간에도 바뀌고, 목록에서
                  실제로 눈에 걸리는 것이 *"D반이 6월에 손이 바뀌었네"* 다.
                  **누가 바꿨는지는 여기 안 적는다**(E11 — 한 칸에 값 하나). 그 이름은
                  바꾸는 자리, 곧 담당 배정 모달에 있다.
                */}
                <TableHead className="w-36">담당 시작</TableHead>
                <TableHead className="w-28 text-right">인원</TableHead>
                {/*
                  **`상태` 열을 뺐다**(D1 — 한 사실은 한 곳에서). `담당 없음 / 편성 완료`가
                  바로 왼쪽 `담당 매니저` 열과 **행마다 1:1**이라, 같은 경고가 한 화면에
                  네 번(헤더 내역 · 필터 · 빨간 이름 · 배지) 나오고 있었다. 남긴 것은
                  값이 있는 자리 하나 — 담당 열의 `담당 없음`이다.
                */}
                {/* 마지막 열(액션)이 남는 폭을 흡수한다 */}
                <TableHead className="text-right">
                  <span className="sr-only">액션</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(rooms ?? []).map((room) => (
                <TableRow key={room.id}>
                  <TableCell className="font-semibold">{room.name}</TableCell>
                  <TableCell
                    className={cn('text-xs', room.managerName ? 'text-fg-muted' : 'text-warning')}
                  >
                    {room.managerName ?? '담당 없음'}
                  </TableCell>
                  {/* 배정된 적이 없으면 `—` — 0이 아니라 **없음**이다(F3) */}
                  <TableCell className="text-fg-muted text-xs tabular-nums">
                    {room.assignedAt ?? <span className="text-fg-subtle">—</span>}
                  </TableCell>
                  {/*
                   **정원을 같이 적는다.** `25명`만 있으면 더 넣어도 되는지 판단할 수 없다(§3).

                   **누르면 그 반 명단으로 간다.** 목업 케이스 표는 이 목록이 *"반별 인원 ·
                   담당 매니저 · 명단"* 을 준다고 했는데, 탭을 가른 뒤(OP06-1) 반에서 명단으로
                   가는 길이 없어졌다 — 인원 수를 누르는 것이 그 길이다(그 수가 곧 명단이다).
                  */}
                  <TableCell className="text-right tabular-nums">
                    <Link
                      to={`/operator/admin/roster?class=${room.id}`}
                      className="hover:text-primary hover:underline"
                    >
                      {room.size}
                      <span className="text-fg-subtle"> / {room.capacity}</span>
                    </Link>
                  </TableCell>
                  {/*
                    **개강 전에만 수정·삭제가 붙는다**(OP06-7-②). 잠긴 뒤에도 담당 변경은
                    남는다 — 매니저 퇴사·교체는 운영 중에 계속 일어나는 일이라 잠금
                    규칙이 다르다. 못 하는 일을 흐리게 두지 않는다(C1).
                  */}
                  <TableCell className="space-x-1 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setAssigning(room)}>
                      {needsManager(room) ? '담당 배정' : '담당 변경'}
                    </Button>
                    {editable && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => setEditing(room)}>
                          수정
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleting(room)}>
                          삭제
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/*
          푸터 — 범위 개수(좌) + 페이저(중앙), 오른쪽은 비운다(E3). 6~10반이라 한 쪽에
          들어가므로 페이저는 `1`만 그려진다(E7 — 누를 수 없는 화살표는 장식이다).
        */}
          <TableFooterBar
            range={`1–${rooms?.length ?? 0} / ${rooms?.length ?? 0}개`} /* 필터 결과 기준 */
            page={1}
            totalPages={1}
            onPageChange={() => {}}
          />
        </>
      )}

      <AddClassDialog open={addOpen} onOpenChange={setAddOpen} onCreated={changed} />

      <EditClassDialog
        target={editing}
        onOpenChange={(v) => !v && setEditing(null)}
        onSaved={changed}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(v) => !v && setDeleting(null)}
        title={`반을 삭제할까요? — ${deleting?.name ?? ''}`}
        description={
          (deleting?.size ?? 0) > 0
            ? `이 반의 ${deleting?.size}명은 미배정으로 돌아갑니다. 명단에서 지워지지는 않습니다. 개강 후에는 삭제할 수 없습니다.`
            : '빈 반이라 되돌릴 것이 없습니다. 개강 후에는 삭제할 수 없습니다.'
        }
        confirmLabel="반 삭제"
        destructive
        onConfirm={async () => {
          if (deleting) await deleteClass(deleting.id)
          setDeleting(null)
          changed()
        }}
      />

      {assigning && (
        <AssignManagerDialog
          open
          onOpenChange={(v) => !v && setAssigning(null)}
          fixed={{ kind: 'class', room: assigning }}
          onSaved={() => {
            setAssigning(null)
            changed()
          }}
        />
      )}
    </>
  )
}
