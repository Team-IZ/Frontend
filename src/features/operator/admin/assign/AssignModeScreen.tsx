import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { CheckIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
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
import { useFindClassrooms } from '@/api/academic/useAcademicQueries'
import { useFindTraineeRoster } from '@/api/member/useMemberQueries'
import { useAssignTrainees, useRollbackAssignment } from '@/api/academic/useAcademicMutations'
import type { findClassrooms_Item } from '@/api/academic/academicTypes'
import type { findTraineeRoster_Item } from '@/api/member/memberTypes'
import { ROSTER_PAGE_SIZE, capacityPreview, type CapacityPreview } from '../_/rules'
import { useCohortScope } from '../_/cohortScope'
import TableFooterBar from '../_/components/TableFooterBar'
import ResultBanner from '../_/components/ResultBanner'
import { Loading, LoadFailed } from '../_/components/AsyncState'
import { AccountStatusBadge } from '../_/components/StatusBadges'
import { FilterSelect, SearchBox } from '../_/components/AdminFilters'

/*
  반 배정 — **모드**다.

  **표가 아니라 작업이라 모드로 연다**(OP-06 §3). 반마다 인원과 담당을 보면서 골라야 하고
  250명을 한 번에 끝내지 않는다 — **좌우가 동시에 보여야** 반복 배정이 된다.

  **사이드바를 가린다**(H4). 화면이 다르게 생긴 것 자체가 "지금 작업 중" 신호이고,
  검증 세션·면담 브리프가 전체화면인 것과 같은 이유다. 그래서 `ConsoleShell`을 쓰지 않는다.

  **즉시 실행 + 되돌리기.** 확인 모달을 세우면 250명을 스무 번 나눠 넣는 동안 스무 번
  눌러야 해서 작업이 안 되고, 안 세우면 잘못 누른 25명을 손으로 되돌려야 한다.
  토스트가 아니라 **흐름 안 배너**인 이유는 `ResultBanner` 주석에 있다.

  **문이 둘이고 하는 일이 다르다** — 이 구분이 화면 전체를 가른다(op-06-admin.md OP06-6).

    · **채우기** — `미배정 배정하기 →` 또는 주소로 직접. 들고 온 사람이 없다.
      범위는 `미배정만`이고, 미배정이 0이 되면 **완료 상태**로 끝난다.
    · **옮기기** — 명단에서 사람을 고르고 `반 배정 →`, 또는 행의 `반 변경`.
      들고 온 사람이 이미 어느 반에 있을 수 있으므로 범위가 **`전체`로 열린다**.
      전원 배정이 끝난 기수에서도 들어와야 하므로 **완료 상태로 빠지지 않는다.**

  상태 셋이 이 화면의 설계다(§3 — `① 진입 레일 흐림`은 OP06-4에서 뺐다).
    ① 선택      `22 → 24 / 25` 미리보기 + 넣기 버튼 활성
    ② 배정 직후  되돌리기 배너 · 목록에서 그 사람들이 빠짐 · **고른 반은 남는다**
    ③ 미배정 0  완료 상태(채우기로 들어왔을 때만)
*/
const SCOPE_OPTIONS = [
  { value: 'UNASSIGNED', label: '미배정만' },
  { value: 'ALL', label: '전체' },
]

type ClassRoom = findClassrooms_Item
type Trainee = findTraineeRoster_Item
type RosterScope = 'ALL' | 'UNASSIGNED'

/**
 * 방금 넣은 것 — 되돌리기에 필요한 것만 들고 있는다.
 *
 * **화면이 만든다.** 서버 응답(`AssignTraineesResponse`)은 `classroomId`·`assignedCount`·
 * `assignedTraineeIds`뿐이라 이름도 원래 반도 없다 — 그 값들은 보낼 때 화면이 이미 알고
 * 있으므로 응답을 기다릴 이유가 없다.
 */
type Assigned = {
  classroomId: string
  className: string
  /** 옮긴 사람들. **옮기기 전 소속을 같이 들고 있다** — 배너 문구가 그 값을 쓴다 */
  moved: { traineeId: string; name: string; fromClassName: string | null }[]
}

/** 배너 문구 — **이름을 적는다.** `2명`만 쓰면 누구를 되돌리는지 모른 채 누른다 */
const names = (r: Assigned) => r.moved.map((m) => m.name)

/**
 * 넣은 결과 한 줄.
 *
 * ⚠ **되돌리기가 원래 반으로 돌려놓지 않는다.** 서버의 `rollbackAssignment`는 배정을
 * **해제만** 한다(스펙 명시 · 사유 `IMMEDIATE_ROLLBACK`) — 되돌린 사람은 어느 반에도
 * 속하지 않는 상태가 된다. 목은 `fromClassId`로 원래 자리에 돌려놓고 있었다.
 *
 * 그래서 **어디서 왔는지를 여전히 적되**, 되돌리면 미배정이 된다는 것을 버튼 옆에
 * 밝힌다 — B반에서 온 사람이 B반으로 돌아갈 것처럼 읽히면 안 된다.
 */
function assignedText(r: Assigned): string {
  const head = `${r.moved.length}명을 ${r.className}에 넣었어요 — ${names(r).join(' · ')}`

  /*
    옮겨온 반별로 묶는다. **이름에 조사를 붙이지 않는다** — `강건우은`처럼 받침 유무를
    틀리게 되고(은/는·이/가), 이름은 사람 것이라 규칙으로 처리할 값이 아니다.
  */
  const byFrom = new Map<string, string[]>()
  for (const m of r.moved) {
    if (!m.fromClassName) continue
    byFrom.set(m.fromClassName, [...(byFrom.get(m.fromClassName) ?? []), m.name])
  }
  if (byFrom.size === 0) return head

  const from = [...byFrom].map(([room, who]) => `${room} → ${who.join(' · ')}`).join(' / ')
  return `${head} · 옮겨온 사람 ${from}`
}

/** 담당이 비어 있는 반인가 — **서버가 판정해 준 값을 쓴다** */
const needsManager = (room: ClassRoom) => room.managerAssignmentRequired

export default function AssignModeScreen() {
  const navigate = useNavigate()
  /*
    명단에서 고른 사람을 들고 온다 — **선택이 모드로 이월된다**(§3). 리셋되면 방금 한
    일을 다시 해야 한다. `location.state`를 쓰는 이유는 이 값이 주소에 남을 것이
    아니어서다(새로고침하면 사라지는 게 맞다 — 그때는 목록이 원천이다).
  */
  const carried = (useLocation().state as { traineeIds?: string[] } | null)?.traineeIds ?? []
  /*
    **들고 온 사람이 있으면 `옮기기`로 들어온 것이다.**

    명단의 `반 변경`과 `반 배정 →`이 둘 다 이 모드로 오는데, 들고 온 사람이 **이미 어느
    반에 있으면** 기본 범위(`미배정만`)의 목록에 안 나온다 — `1명 선택`이라고 써 있는데
    그 사람이 표에 없다. 골라 온 사람은 보여야 한다.
  */
  const moving = carried.length > 0

  /*
    **선택은 `Set`이다.** 표를 그릴 때마다 행마다 `includes`를 돌면 O(n²)가 된다 —
    이 화면은 `범위=전체`로 250명을 열 수 있어서 명단 탭보다 더 걸린다.
  */
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set(carried))
  const [room, setRoom] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  /** 입력칸은 `search`, 조회는 멈춘 뒤의 `query` */
  const query = useDebounced(search)
  /** 이미 배정된 사람을 옮기려면 `전체`로 바꾼다 — 반 통폐합 때 쓴다(§3) */
  const [scope, setScope] = useState<RosterScope>(moving ? 'ALL' : 'UNASSIGNED')
  const [page, setPage] = useState(1)
  /*
    배너 한 자리를 성공·실패가 나눠 쓴다. **union이라 둘이 동시에 뜰 수 없다** —
    성공은 되돌리기 payload(`AssignResult`)를 들고 있어야 하고 실패는 문구와 재시도라,
    상태를 둘로 두면 "되돌리기와 실패가 같이 떠 있는" 상태가 만들어진다.
  */
  const [banner, setBanner] = useState<
    | { kind: 'assigned'; result: Assigned }
    | { kind: 'failed'; text: string; retry: () => void }
    | null
  >(null)
  const last = banner?.kind === 'assigned' ? banner.result : null

  const cohortScope = useCohortScope()
  const cohortId = cohortScope.cohortId
  const classes = useFindClassrooms({ path: { cohortId: cohortId! } }, { enabled: !!cohortId })
  const roster = useFindTraineeRoster(
    {
      path: { cohortId: cohortId! },
      query: {
        query: query.trim() || undefined,
        unassignedOnly: scope === 'UNASSIGNED' ? true : undefined,
        page: page - 1,
        size: ROSTER_PAGE_SIZE,
      },
    },
    { enabled: !!cohortId },
  )
  const assign = useAssignTrainees()
  const rollback = useRollbackAssignment()
  const saving = assign.isPending

  const rows = roster.data?.content ?? []
  const total = roster.data?.totalElements ?? 0
  const unassigned = roster.data?.unassignedCount ?? 0
  const totalPages = Math.max(1, roster.data?.totalPages ?? 1)
  const target = (classes.data?.classrooms ?? []).find((c) => c.classroomId === room) ?? null
  const preview = target
    ? capacityPreview({ capacity: target.capacity, size: target.traineeCount }, picked.size)
    : null

  const run = async () => {
    if (!target || !cohortId) return
    /*
      **보내기 전에 누구를 옮기는지 적어 둔다.** 응답은 id 목록뿐이라 이름도 원래 반도
      없고, 배정 뒤에는 목록이 갱신되어 그 사람들이 표에서 빠진다 — 그때 찾으면 늦다.
    */
    const moved = rows
      .filter((t) => picked.has(t.traineeId))
      .map((t) => ({ traineeId: t.traineeId, name: t.name, fromClassName: t.className }))
    try {
      await assign.mutateAsync({
        path: { cohortId },
        body: { classroomId: target.classroomId, traineeIds: [...picked] },
      })
      setBanner({
        kind: 'assigned',
        result: { classroomId: target.classroomId, className: target.name, moved },
      })
      setPicked(new Set())
      /*
        **고른 반은 그대로 둔다.** 넣을 때마다 초기화하고 있었는데, 이 화면이 전제하는
        일이 *"A반을 25명까지 채운다"* 라 다음 묶음도 같은 반이다(헤더도 `A반 채우는 중`
        이라고 말한다). 매번 다시 고르게 하면 스무 번 넣는 동안 스무 번 더 누른다.
        다른 반으로 옮길 때는 그 반을 누르면 된다 — 한 번이면 바뀐다.
      */
    } catch {
      /*
        **실패하면 선택을 남긴다.** 고른 사람과 반이 그대로 있어야 다시 누를 수 있다 —
        비우면 250명 중에서 그 둘을 다시 찾아야 한다.
      */
      setBanner({
        kind: 'failed',
        text: `${picked.size}명을 ${target.name}에 넣지 못했습니다`,
        retry: run,
      })
    }
  }

  /**
   * 되돌리기 — **실패가 가장 위험한 자리다.** 조용히 실패하면 되돌렸다고 믿고 넘어가서,
   * 그 학생들이 엉뚱한 반에서 회차를 시작한다.
   */
  const undo = async (result: Assigned) => {
    if (!cohortId) return
    try {
      await rollback.mutateAsync({
        path: { cohortId },
        body: { traineeIds: result.moved.map((m) => m.traineeId) },
      })
      setBanner(null)
    } catch {
      setBanner({
        kind: 'failed',
        text: `${result.className} 배정을 되돌리지 못했습니다 — ${names(result).join(' · ')}`,
        retry: () => undo(result),
      })
    }
  }

  /**
   * ④ 미배정 0 — 더 배정할 사람이 없다. 완료 상태를 그리고 나갈 문을 크게 둔다.
   *
   * ⚠ **`옮기기`로 들어왔으면 완료가 아니다.** 이 조건에 `moving`이 없던 동안, 미배정이
   * 0인 기수에서 명단의 `반 변경`을 누르면 **`모두 반에 들어갔습니다`만 뜨고 표가 아예
   * 안 그려졌다** — 전원 배정이 끝난 기수에서는 사람을 옮길 방법이 없었다.
   */
  const finished = !moving && scope === 'UNASSIGNED' && unassigned === 0 && !roster.isPending

  return (
    <div className="bg-canvas flex h-svh flex-col overflow-hidden">
      {/*
        모드 헤더 — 셸 헤더가 아니다. **나가는 문 하나**만 둔다: 여기서 할 일이 하나뿐이라
        다른 데로 가는 길이 있으면 작업 중이라는 신호가 흐려진다.
      */}
      <header className="bg-surface border-border flex h-14 shrink-0 items-center gap-3 border-b px-6">
        <h1 className="text-base font-bold">
          반 배정{' '}
          <span className="text-fg-subtle text-xs font-normal">· {cohortScope.current?.name}</span>
        </h1>
        {!finished && (
          <span className="text-fg-muted text-xs">
            미배정 <b className="font-semibold">{unassigned}명</b>
            {target && ` · ${target.name} 채우는 중`}
          </span>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto"
          onClick={() => navigate('/operator/admin/roster')}
        >
          {finished ? '완료' : '닫기'}
        </Button>
      </header>

      <main className="min-h-0 flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-7xl">
          {banner && (
            <ResultBanner
              failed={banner.kind === 'failed'}
              onDismiss={() => setBanner(null)}
              onUndo={banner.kind === 'assigned' ? () => void undo(banner.result) : undefined}
              onRetry={banner.kind === 'failed' ? banner.retry : undefined}
            >
              {/* **이름을 적는다** — `2명`만 쓰면 누구를 되돌리는지 모른 채 누른다 */}
              {banner.kind === 'assigned' ? assignedText(banner.result) : banner.text}
            </ResultBanner>
          )}

          {finished ? (
            <CompleteState onClose={() => navigate('/operator/admin/roster')} />
          ) : (
            /*
              좌우 분할 — **동시에 보여야 한다**는 것이 이 화면의 전제다(§3).

              ⚠ **정의서 §3의 `좌 반 레일 · 우 미배정 명단`을 뒤집었다**(op-06-admin.md OP06-5).
              일의 순서가 `누구를(명단) → 어디에(반) → 넣기`인데 좌우가 반대라 눈이
              오른쪽에서 왼쪽으로 되돌아왔고, 넣기 버튼은 화면 맨 아래에 따로 있었다.
              지금은 **왼쪽에서 오른쪽으로 한 번에 끝난다** — 고르고, 반을 정하고, 그
              자리에서 누른다.

              명단이 남는 폭을 갖는 것은 그대로다. 표는 넓을수록 좋고 반 패널은 이름·인원만
              있어 넓힐 이유가 없다.
            */
            <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
              <section>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <SearchBox
                    value={search}
                    onChange={(v) => {
                      setSearch(v)
                      setPage(1)
                    }}
                    placeholder="이름 · 이메일 검색"
                    label="교육생 검색"
                  />
                  <FilterSelect
                    label="범위"
                    value={scope}
                    options={SCOPE_OPTIONS}
                    onChange={(v) => {
                      setScope(v as RosterScope)
                      setPage(1)
                      setPicked(new Set())
                    }}
                    className="min-w-32"
                  />
                  {/*
                    **고른 수는 명단 쪽에 둔다** — 고른 대상이 여기 있는 사람들이라
                    수도 여기 붙는다. 넣을 곳과 넣기 버튼만 오른쪽 패널의 일이다.
                  */}
                  {picked.size > 0 ? (
                    <div className="ml-auto flex items-center gap-2">
                      <b className="text-primary text-xs font-semibold">{picked.size}명 선택</b>
                      <Button variant="ghost" size="sm" onClick={() => setPicked(new Set())}>
                        선택 해제
                      </Button>
                    </div>
                  ) : (
                    <p className="text-fg-subtle ml-auto text-xs">
                      배정 대상 <b className="text-fg-muted font-semibold">{total}명</b>
                    </p>
                  )}
                </div>

                <RosterPanel
                  rows={rows}
                  scope={scope}
                  picked={picked}
                  onToggle={(id) =>
                    setPicked((prev) => {
                      const next = new Set(prev)
                      if (!next.delete(id)) next.add(id)
                      return next
                    })
                  }
                  onToggleAll={() =>
                    setPicked(
                      rows.every((t) => picked.has(t.traineeId))
                        ? new Set()
                        : new Set(rows.map((t) => t.traineeId)),
                    )
                  }
                  loading={roster.isPending}
                  failed={roster.isError}
                  onRetry={() => void roster.refetch()}
                />

                {rows.length > 0 && (
                  <TableFooterBar
                    range={`${(page - 1) * ROSTER_PAGE_SIZE + 1}–${
                      (page - 1) * ROSTER_PAGE_SIZE + rows.length
                    } / ${total}명`}
                    page={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                  />
                )}
              </section>

              <ClassRail
                rooms={classes.data?.classrooms ?? []}
                picked={room}
                onPick={setRoom}
                adding={picked.size}
                target={target}
                preview={preview}
                onRun={run}
                saving={saving}
                loading={classes.isPending}
                failed={classes.isError}
                onRetry={() => void classes.refetch()}
                justAdded={last}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

/**
 * 우 반 패널 — **넣을 곳을 고르고 그 자리에서 넣는다.**
 *
 * ⚠ 정의서와 두 군데 다르다. 근거는 op-06-admin.md OP06-4·OP06-5.
 *
 * ▸ **`① 진입 → 레일 흐림`을 따르지 않는다.** 흐림은 *"교육생부터 골라라"* 는 순서를
 *   강제하는데, **반부터 정하는 사람이 있다** — 모드 헤더가 스스로 `A반 채우는 중`이라고
 *   말하는 것이 그 머릿속이다. 순서를 강제해서 막을 사고가 없다(넣기는 둘 다 정해져야 켜진다).
 * ▸ **좌우를 뒤집었다.** `좌 반 레일 · 우 명단`이었는데, 일의 순서가 `누구를 → 어디에 →
 *   넣기`라 눈이 오른쪽에서 왼쪽으로 되돌아왔다.
 *
 * **넣기 버튼이 이 패널 안에 있다.** 화면 바닥의 가로 바에 두었을 때는 *"너무 아래라
 * 빈 줄처럼 보인다"* 는 평가를 받았다 — 폭 1200px에 컨트롤 셋뿐이라 대부분이 빈 공간이었고,
 * 눈이 머무는 곳(표·반 목록)에서 200px 넘게 떨어져 있었다. **버튼은 그 버튼이 무엇에
 * 대한 것인지 바로 옆에 있어야 한다** — `A반에 넣기`는 A반 밑에 있을 때 읽힌다.
 */
function ClassRail({
  rooms,
  picked,
  onPick,
  adding,
  target,
  preview,
  onRun,
  saving,
  loading,
  failed,
  onRetry,
  justAdded,
}: {
  rooms: ClassRoom[]
  picked: string | null
  onPick: (id: string) => void
  adding: number
  target: ClassRoom | null
  preview: CapacityPreview | null
  onRun: () => void
  saving: boolean
  loading: boolean
  failed: boolean
  onRetry: () => void
  justAdded: Assigned | null
}) {
  return (
    /*
      **화면에 붙여 둔다**(`sticky`). 명단을 아래로 훑어도 넣을 곳과 넣기 버튼이 따라온다 —
      반 열 개면 패널이 뷰포트보다 짧아 스크롤이 필요 없다.
    */
    <section className="bg-surface border-border self-start rounded-lg border p-3 lg:sticky lg:top-0">
      <p className="text-fg-muted mb-2 px-1 text-sm font-semibold">채울 반</p>

      {loading ? (
        <Loading label="반을 불러오는 중" />
      ) : failed ? (
        <LoadFailed label="반을 불러오지 못했습니다" onRetry={onRetry} />
      ) : (
        <div className="space-y-0.5">
          {rooms.map((room) => {
            const selected = picked === room.classroomId
            const added = justAdded?.classroomId === room.classroomId
            return (
              <button
                key={room.classroomId}
                type="button"
                aria-pressed={selected}
                onClick={() => onPick(room.classroomId)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left',
                  // 패널 안이라 칸마다 테두리를 두르지 않는다 — 상자 안의 상자가 된다
                  selected ? 'bg-primary-soft ring-primary ring-1' : 'hover:bg-surface-2',
                )}
              >
                <b className="text-sm font-semibold">{room.name}</b>
                <span
                  className={cn('text-2xs', needsManager(room) ? 'text-warning' : 'text-fg-subtle')}
                >
                  {room.managers.map((m) => m.name ?? m.email).join(' · ') ?? '담당 없음'}
                </span>
                {/*
                  **미리보기(`22 → 24`)를 여기 두지 않는다.** 고른 반에만 뜨는 값이라
                  비교에 쓰이지 않는데, 아래 넣기 버튼 위에 같은 값이 또 나온다(D1).
                  목록은 **고를 때 필요한 것**(지금 인원·정원)만 말한다.
                */}
                <span className="text-fg-muted ml-auto text-xs tabular-nums">
                  {room.traineeCount} <span className="text-fg-subtle">/ {room.capacity}</span>
                </span>
                {/* ③ 배정 직후 — 어느 반에 방금 넣었는지가 레일에도 남는다 */}
                {added && (
                  <span className="text-success text-2xs">방금 +{justAdded.moved.length}</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/*
        넣기 — **고른 반 바로 밑이다.** 정원 미리보기(`22 → 24 / 25 · 1자리 남음`)가 여기
        한 번만 나온다 — 넣기 전에 결과를 알면 되돌릴 일이 줄어드는데(§3), 그 값이 필요한
        자리는 **누르기 직전**이다.

        **못 누를 때 무엇이 빠졌는지 적는다.** 버튼 이름에 사용법을 쓰지 않는 대신(E10)
        버튼 밑 한 줄이 그 일을 한다 — 비활성 버튼만 두면 왜 안 눌리는지 알 수 없다.
      */}
      <div className="border-border mt-3 border-t pt-3">
        {target && preview && adding > 0 && (
          <p
            className={cn(
              'mb-2 px-1 text-xs tabular-nums',
              preview.over ? 'text-warning' : 'text-fg-muted',
            )}
          >
            {target.traineeCount} → <b className="font-semibold">{preview.next}</b> /{' '}
            {target.capacity} · {/* **정원 초과를 막지 않는다** — 넘는다는 사실만 알린다(§3) */}
            {preview.over ? `${-preview.remaining}명 초과` : `${preview.remaining}자리 남음`}
          </p>
        )}
        <Button className="w-full" disabled={!target || adding === 0 || saving} onClick={onRun}>
          {target ? `${target.name}에 넣기` : '반에 넣기'}
        </Button>
        {(adding === 0 || !target) && (
          <p className="text-fg-subtle mt-1.5 px-1 text-2xs">
            {adding === 0 ? '왼쪽에서 교육생을 고르세요' : '넣을 반을 고르세요'}
          </p>
        )}
      </div>
    </section>
  )
}

/** 우 명단. 배정 대상만 보여준다 — 기본은 `미배정만`이다 */
function RosterPanel({
  rows,
  scope,
  picked,
  onToggle,
  onToggleAll,
  loading,
  failed,
  onRetry,
}: {
  rows: Trainee[]
  scope: RosterScope
  picked: ReadonlySet<string>
  onToggle: (id: string) => void
  onToggleAll: () => void
  loading: boolean
  failed: boolean
  onRetry: () => void
}) {
  if (loading) return <Loading label="명단을 불러오는 중" />
  if (failed) return <LoadFailed label="명단을 불러오지 못했습니다" onRetry={onRetry} />
  if (rows.length === 0)
    return (
      <div className="border-border-strong bg-surface-2 text-fg-muted rounded-md border border-dashed p-8 text-center text-sm">
        조건에 맞는 사람이 없습니다
      </div>
    )

  const allOnPage = rows.every((t) => picked.has(t.traineeId))

  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-10">
            <Checkbox
              checked={allOnPage}
              aria-label="이 쪽 전체 선택"
              onCheckedChange={onToggleAll}
            />
          </TableHead>
          {/* 이메일은 이름 밑이 아니라 제 열에 둔다 — 근거는 명단 탭 주석(E11) */}
          <TableHead className="w-28">교육생</TableHead>
          <TableHead className="w-52">이메일</TableHead>
          {/* `전체` 범위일 때만 현재 소속이 필요하다 — 반 통폐합에서 어디서 옮기는지가 근거다 */}
          {scope === 'ALL' && <TableHead className="w-28">현재 소속</TableHead>}
          {/*
            **`직전 기수`를 뺐다**(OP06-6) — **이 부트캠프에 재수강생이 없다**(기획 확인).
            목업에 있다고 그대로 옮긴 열이었고, 250행 중 몇 줄만 값이 있었다.
            마지막 열(계정)이 남는 폭을 흡수한다.
          */}
          <TableHead>계정</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((t) => {
          const checked = picked.has(t.traineeId)
          return (
            <TableRow key={t.traineeId} className={cn(checked && 'bg-primary-soft')}>
              <TableCell>
                <Checkbox
                  checked={checked}
                  aria-label={`${t.name} 선택`}
                  onCheckedChange={() => onToggle(t.traineeId)}
                />
              </TableCell>
              <TableCell className="font-semibold">{t.name}</TableCell>
              <TableCell className="text-fg-muted truncate text-xs">{t.email}</TableCell>
              {scope === 'ALL' && (
                <TableCell className="text-fg-muted text-xs">{t.className ?? '미배정'}</TableCell>
              )}
              <TableCell>
                <AccountStatusBadge status={t.status} />
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

/** ④ 미배정 0 — 끝났다. **다음 행동 하나**만 둔다(흐름 안 상태 카드, H+) */
function CompleteState({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex justify-center py-16">
      <div className="bg-surface border-border w-[460px] rounded-lg border p-6 text-center">
        <div className="bg-success-soft text-success mx-auto flex size-12 items-center justify-center rounded-lg">
          <CheckIcon className="size-6" />
        </div>
        <p className="mt-4 text-base font-semibold">모두 반에 들어갔습니다</p>
        <p className="text-fg-muted mt-1 text-sm">7기 · 미배정 없음</p>
        <Button className="mt-4" onClick={onClose}>
          명단으로 돌아가기
        </Button>
      </div>
    </div>
  )
}
