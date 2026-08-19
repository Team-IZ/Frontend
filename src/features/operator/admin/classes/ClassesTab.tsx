import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Alert, AlertTitle } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import StaleBlock from '@/components/common/StaleBlock'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table'
import { useDebounced } from '@/lib/useDebounced'
import { cn } from '@/lib/utils/cn'
import { isApiError } from '@/api/_contract'
import { useFindClassrooms } from '@/api/academic/useAcademicQueries'
import { useDeleteClassroom } from '@/api/academic/useAcademicMutations'
import type { findClassrooms_Item } from '@/api/academic/academicTypes'
import { canEditClasses } from '../_/rules'
import { useCohortId } from '@/stores/cohortScope'
import SectionHeader from '../_/components/SectionHeader'
import TableFooterBar from '../_/components/TableFooterBar'
import TableSkeleton from '@/components/common/TableSkeleton'
import ErrorState from '@/components/common/ErrorState'
import { FilterSelect, SearchBox } from '../_/components/AdminFilters'
import { ALL } from '../_/filterState'
import ConfirmDialog from '../_/components/ConfirmDialog'
import AddClassDialog from './components/AddClassDialog'
import EditClassDialog from './components/EditClassDialog'
import ClassManagersDialog from './components/ClassManagersDialog'

/*
  ② 반 — 기수를 반으로 나누고 담당 매니저를 맡긴다. 범위는 **선택 기수**다.

  **명단과 탭을 나눴다.** 정의서 OP-06 §3은 *"반을 만들고 바로 그 반에 사람을 넣는 것이
  실제 동선"* 이라 한 탭으로 합쳐 뒀는데, 만들어 보니 **두 표가 한 뷰포트에 안 들어갔다** —
  반 10행 + 명단 25행이라 반 표에 내부 스크롤을 넣어야 했고, 그러면 *"같이 보인다"* 는
  합친 이유 자체가 사라진다. 근거는 op-06-admin.md OP06-1.

  **동선은 링크로 잇는다** — 반을 만든 뒤 명단으로 가는 것은 탭 하나 누르는 일이다.

  ## ⚠ 검색·필터를 화면이 한다
  `findClassrooms`는 `cohortId` 하나만 받는다 — 검색어도 담당 유무 필터도 서버에 없다.
  한 기수에 6~10반이라 전량이 한 페이지에 들어오므로 **여기서 거른다.**

  반이 그보다 많아지는 기수가 나오면 서버로 옮겨야 한다(10차 요청) — 페이지가 나뉘는
  순간 클라이언트 필터는 현재 페이지 안에서만 맞기 때문이다.

  ## ⚠ 담당이 여러 명일 수 있다
  `ClassroomResponse.managers`가 **배열**이다. 목은 `managerId`·`managerName` 한 쌍이라
  한 명을 전제했는데, 서버는 반 하나에 여럿을 허용한다 — 담당 열이 이름을 `·`로 잇는다.
*/

type ClassRoom = findClassrooms_Item

/** 담당이 비어 있는 반인가 — **서버가 판정해 준 값을 쓴다**(화면이 배열 길이를 세지 않는다) */
const needsManager = (room: ClassRoom) => room.managerAssignmentRequired

/** 담당자 표기. 여럿이면 `·`로 잇는다 — 가입 전이면 이름이 없어 이메일이 그 자리를 대신한다 */
const managerNames = (room: ClassRoom) => room.managers.map((m) => m.name ?? m.email).join(' · ')

export default function ClassesTab() {
  const [search, setSearch] = useState('')
  /** 입력칸은 `search`(즉시 반응), 조회는 `query`(멈춘 뒤) — 한 글자마다 다시 거르지 않는다 */
  const query = useDebounced(search)
  const [staffing, setStaffing] = useState(ALL)
  const [addOpen, setAddOpen] = useState(false)
  const [assigning, setAssigning] = useState<ClassRoom | null>(null)
  const [editing, setEditing] = useState<ClassRoom | null>(null)
  const [deleting, setDeleting] = useState<ClassRoom | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const scope = useCohortId()
  const cohortId = scope.cohortId
  const classes = useFindClassrooms({ path: { cohortId: cohortId! } }, { enabled: !!cohortId })
  const removeClass = useDeleteClassroom()

  const all = useMemo(() => classes.data?.classrooms ?? [], [classes.data])

  /*
    **헤더 수는 필터와 무관한 전체 기준이다** — `담당 없음`으로 걸러 보는 동안 헤더가 그
    수를 그대로 반복하면 안 된다. 전량을 이미 받았으므로 여기서 센다(조회가 늘지 않는다).
  */
  const total = all.length
  const unstaffed = all.filter(needsManager).length

  const rooms = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return all.filter((room) => {
      // 담당자 이름으로도 찾는다 — `이도윤이 어느 반을 맡았지`가 실제 질문이다
      if (needle && !`${room.name} ${managerNames(room)}`.toLowerCase().includes(needle))
        return false
      if (staffing === 'UNSTAFFED' && !needsManager(room)) return false
      if (staffing === 'STAFFED' && needsManager(room)) return false
      return true
    })
  }, [all, query, staffing])

  /*
    **반을 고칠 수 있는 기수인가**(OP06-7-② — 개강 전에만). 판정은 `rules.canEditClasses`가
    하고 서버도 삭제를 다시 검증한다 — 화면만 막으면 우회된다.

    ⚠ **서버는 수정을 개강 이후에도 연다**(9차 R6 회신 — 오타 정정은 되돌릴 수 없는 값이
    아니라서다). 화면 쪽이 더 좁은 것이고, 충돌하지 않으므로 그대로 둔다.

    시작일이 없는 기수는 아직 일정이 안 잡힌 것이라 **개강 전으로 본다.**
  */
  const cohort = scope.current
  const editable = cohort
    ? canEditClasses(cohort.startDate ?? '9999-12-31', new Date().toISOString().slice(0, 10))
    : false

  /** 빈 결과가 "아직 없음"인지 "필터에 안 걸림"인지 — 문구가 갈린다 */
  const narrowed = query.trim().length > 0 || staffing !== ALL

  return (
    <>
      <SectionHeader
        title="반"
        count={classes.data ? `${total}개` : undefined}
        breakdown={
          classes.data && (
            <>
              {cohort?.name}
              {unstaffed > 0 && (
                <>
                  {' · '}
                  <b className="text-warning font-semibold">담당 없음 {unstaffed}</b>
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

      {deleteError && (
        <Alert variant="danger" className="mb-4">
          <AlertTitle>{deleteError}</AlertTitle>
        </Alert>
      )}

      {!cohortId || classes.isLoading ? (
        <TableSkeleton rows={5} cols={['w-24', 'w-40', 'w-28', null]} />
      ) : classes.isError ? (
        <ErrorState
          error={classes.error}
          subject="반"
          onRetry={() => void classes.refetch()}
          retrying={classes.isFetching}
        />
      ) : rooms.length === 0 ? (
        narrowed ? (
          <Empty variant="empty">
            <EmptyHeader>
              <EmptyTitle>
                {query ? `"${query}"에 맞는 반이 없습니다` : '조건에 맞는 반이 없습니다'}
              </EmptyTitle>
              {/*
                **모집단을 말한다** — 다른 네 탭(기수·명단·매니저·교안)이 전부
                `전체 N개에서 찾았습니다`를 말하는데 여기만 비어 있었다. 「0건」만 보이면
                *"원래 없는 건가, 내가 좁힌 건가"* 를 화면이 답해 주지 않는다.
              */}
              <EmptyDescription>
                {cohort?.name ?? '이 기수'} 전체 {total}개에서 찾았습니다.
                {staffing === 'UNSTAFFED' && ' 담당 없는 반이 없다는 뜻이기도 합니다.'}
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
          <Empty variant="empty">
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
          {/*
            **캐시를 보여주는 동안 그 사실을 숨기지 않는다.** 기수를 바꾸면 옛 반 목록이
            그대로 남은 채 새 조회가 돌았는데, 화면은 아무 말도 안 해서 **다른 기수의 반을
            이 기수 것으로 읽게** 됐다. `isPlaceholderData`가 아니라 `isFetching`으로 보는
            이유는, 여기는 「같은 것의 다른 조각」이 아니라 **범위 자체가 바뀌기** 때문이다.
          */}
          <StaleBlock
            stale={classes.isFetching && classes.data !== undefined}
            label="반을 불러오는 중"
          >
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-24">반</TableHead>
                  <TableHead className="w-40">담당 매니저</TableHead>
                  {/*
                  ⚠ **`담당 시작` 열을 뺐다.** 배정이 기간형 이력이라 *"D반이 6월에 손이
                  바뀌었네"* 가 목록에서 눈에 걸리는 값인데, `ClassroomResponse`에 그
                  필드가 없다 — 서버는 구간을 닫고 열지만 그 시각을 내려주지 않는다.

                  빈 칸으로 두지 않고 열째 없앤다. 기수 탭의 `반`·`교육생` 열과 같은
                  판단이다(10차 요청 — 오면 되살린다).
                */}
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
                {rooms.map((room) => (
                  <TableRow key={room.classroomId}>
                    <TableCell className="font-semibold">{room.name}</TableCell>
                    <TableCell
                      className={cn(
                        'truncate text-xs',
                        needsManager(room) ? 'text-warning' : 'text-fg-muted',
                      )}
                    >
                      {needsManager(room) ? '담당 없음' : managerNames(room)}
                    </TableCell>
                    {/*
                   **정원을 같이 적는다.** `25명`만 있으면 더 넣어도 되는지 판단할 수 없다(§3).

                   **누르면 그 반 명단으로 간다.** 목업 케이스 표는 이 목록이 *"반별 인원 ·
                   담당 매니저 · 명단"* 을 준다고 했는데, 탭을 가른 뒤(OP06-1) 반에서 명단으로
                   가는 길이 없어졌다 — 인원 수를 누르는 것이 그 길이다(그 수가 곧 명단이다).
                  */}
                    <TableCell className="text-right tabular-nums">
                      <Link
                        to={`/operator/admin/roster?class=${room.classroomId}`}
                        className="hover:text-primary hover:underline"
                      >
                        {room.traineeCount}
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
          </StaleBlock>

          <TableFooterBar
            range={`1–${rooms.length} / ${rooms.length}개`} /* 필터 결과 기준 */
            page={1}
            totalPages={1}
            onPageChange={() => {}}
          />
        </>
      )}

      <AddClassDialog open={addOpen} onOpenChange={setAddOpen} />

      <EditClassDialog target={editing} onOpenChange={(v) => !v && setEditing(null)} />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(v) => !v && setDeleting(null)}
        title={`반을 삭제할까요? — ${deleting?.name ?? ''}`}
        description={
          (deleting?.traineeCount ?? 0) > 0
            ? `이 반의 ${deleting?.traineeCount}명은 미배정으로 돌아갑니다. 교육생 목록에서 지워지지는 않습니다. 담당 매니저 배정도 함께 풀립니다.`
            : '빈 반이라 되돌릴 것이 없습니다. 담당 매니저 배정은 함께 풀립니다.'
        }
        confirmLabel="반 삭제"
        destructive
        onConfirm={async () => {
          if (!deleting || !cohortId) return
          setDeleteError(null)
          try {
            await removeClass.mutateAsync({
              path: { cohortId, classroomId: deleting.classroomId },
            })
            setDeleting(null)
          } catch (e) {
            /*
              **삭제 가능 여부는 서버가 판정한다**(9차 R6). 팀이 편성됐거나 리포트가
              발행된 반은 409 `CLASSROOM_NOT_DELETABLE`이고, 무엇이 걸렸는지는 서버
              메시지에 있다 — 화면이 `개강 전`으로만 막으면 우회된다.
            */
            setDeleteError(
              isApiError(e) && e.code === 'CLASSROOM_NOT_DELETABLE'
                ? e.message
                : '반을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.',
            )
            setDeleting(null)
          }
        }}
      />

      {cohortId && (
        <ClassManagersDialog
          room={assigning}
          cohortId={cohortId}
          onOpenChange={(v) => !v && setAssigning(null)}
          onSaved={() => setAssigning(null)}
        />
      )}
    </>
  )
}
