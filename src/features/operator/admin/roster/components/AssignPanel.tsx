import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'
import { useFindClassrooms } from '@/api/academic/useAcademicQueries'
import { useAssignTrainees, useRollbackAssignment } from '@/api/academic/useAcademicMutations'
import type { findClassrooms_Item } from '@/api/academic/academicTypes'
import { capacityPreview, type CapacityPreview } from '../../_/rules'
import { errorCopy } from '@/lib/errorCopy'
import { isApiError, isGenericCode } from '@/api/_contract'
import ResultBanner from '../../_/components/ResultBanner'
import Loading from '@/components/common/Loading'
import ErrorState from '@/components/common/ErrorState'
import type { TraineeRosterEntry } from '../../_/api/types'

type ClassRoom = findClassrooms_Item
type Trainee = TraineeRosterEntry

/*
  반 배정 패널 — **명단 탭 오른쪽에서 열린다.**

  ⚠ 한때 이것이 **전체 화면 모드**(`/operator/admin/assign`)였다. 사이드바와 헤더가
  사라지고 왼쪽에 명단 표를 **다시 그렸는데**, 그 표는 명단 탭의 것과 검색·필터·페이저·
  선택이 따로 놀았다. 그래서 고른 사람을 `location.state`로 넘겨야 했고, 넘겨도 화면이
  통째로 갈아엎여서 **무엇이 이어졌는지 보이지 않았다.**

  하는 일은 명단 탭에서 하던 것과 같다(사람을 고른다). 표를 두 벌 만들 이유가 없다 —
  **고르는 곳은 그대로 두고 넣을 곳만 옆에 연다.** 선택·필터·쪽이 그대로 남는다.
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

export default function AssignPanel({
  cohortId,
  picked,
  rows,
  onAssigned,
  onClose,
}: {
  cohortId: string
  /** 명단에서 고른 사람. **이 패널은 선택을 갖지 않는다** — 원천은 명단 표다 */
  picked: ReadonlySet<string>
  /** 지금 쪽에 보이는 행 — 넣기 전에 이름을 적어 두는 데 쓴다 */
  rows: Trainee[]
  /** 넣기가 끝났을 때. 명단이 선택을 비우고 목록을 다시 받는다 */
  onAssigned: () => void
  onClose: () => void
}) {
  const [room, setRoom] = useState<string | null>(null)
  const [banner, setBanner] = useState<
    | { kind: 'assigned'; result: Assigned }
    | { kind: 'failed'; text: string; retry?: () => void }
    | null
  >(null)
  const classes = useFindClassrooms({ path: { cohortId } })
  const assign = useAssignTrainees()
  const rollback = useRollbackAssignment()
  const saving = assign.isPending
  const last = banner?.kind === 'assigned' ? banner.result : null

  const target = (classes.data?.classrooms ?? []).find((c) => c.classroomId === room) ?? null
  const preview = target
    ? capacityPreview({ capacity: target.capacity, size: target.traineeCount }, picked.size)
    : null

  const run = async () => {
    if (!target) return
    /*
      **보내기 전에 누구를 옮기는지 적어 둔다.** 응답은 id 목록뿐이라 이름도 원래 반도
      없고, 배정 뒤에는 목록이 갱신되어 그 사람들이 표에서 빠진다 — 그때 찾으면 늦다.
    */
    const moved = rows
      .filter((t) => picked.has(t.traineeId))
      .map((t) => ({ traineeId: t.traineeId, name: t.name, fromClassName: t.className }))
    /*
      ⚠ **서버에는 「배정」만 있고 「이동」이 없다.**

      이미 어느 반에 있는 사람에게 배정을 부르면 DB 유니크 제약에 걸려
      `409 DATA_INTEGRITY_VIOLATION`(*"데이터 제약 조건에 맞지 않습니다"*)이 나온다 —
      **같은 반으로 다시 넣어도, 다른 반으로 옮겨도 똑같다**(실측). 그런데 이 패널의
      `범위=전체`는 애초에 **반 통폐합 때 옮기려고** 있는 자리다.

      되돌리기(`rollback`)로 배정을 풀면 그 다음 배정은 통과한다(실측 — 풀고 B반 200,
      다시 A반 200). 그래서 **옮길 사람만 먼저 풀고 한 번에 넣는다.** 사용자는 여전히
      한 번 누른다.

      서버가 이동을 한 번에 받아 주면 이 두 단계는 사라진다(25차 R7).
    */
    const relocating = moved.filter((m) => m.fromClassName !== null).map((m) => m.traineeId)
    /** 되돌리기가 **실제로 끝났나** — 실패했으면 아무도 원래 반에서 안 빠졌다 */
    let unassigned = false
    try {
      if (relocating.length > 0) {
        await rollback.mutateAsync({ path: { cohortId }, body: { traineeIds: relocating } })
        unassigned = true
      }
      await assign.mutateAsync({
        path: { cohortId },
        body: { classroomId: target.classroomId, traineeIds: [...picked] },
      })
      setBanner({
        kind: 'assigned',
        result: { classroomId: target.classroomId, className: target.name, moved },
      })
      onAssigned()
      /*
        **고른 반은 그대로 둔다.** 넣을 때마다 초기화하고 있었는데, 이 화면이 전제하는
        일이 *"A반을 25명까지 채운다"* 라 다음 묶음도 같은 반이다(헤더도 `A반 채우는 중`
        이라고 말한다). 매번 다시 고르게 하면 스무 번 넣는 동안 스무 번 더 누른다.
        다른 반으로 옮길 때는 그 반을 누르면 된다 — 한 번이면 바뀐다.
      */
    } catch (e) {
      /*
        **실패하면 선택을 남긴다.** 고른 사람과 반이 그대로 있어야 다시 누를 수 있다 —
        비우면 250명 중에서 그 둘을 다시 찾아야 한다.

        ⚠ **원인을 버리지 않는다.** 한때 `catch {}`로 묶고 「N명을 A반에 넣지 못했습니다」
        + 재시도 버튼만 띄웠는데, 서버는 이유를 정확히 준다 —
        `400 TRAINEE_NOT_IN_COHORT · "기수에 속하지 않은 교육생입니다: [id]"`
        (실측 — 비활성 교육생을 고르면 이 코드다). **다시 눌러도 같은 실패**라
        재시도 버튼이 거짓 약속이었다.
      */
      const known = isApiError(e) && !isGenericCode(e.code)
      const copy = errorCopy(e, { subject: '교육생', action: '배정' })
      /*
        **되돌리기까지 갔다가 실패하면 그 사람들은 미배정이다.** 원래 반이 사라졌으므로
        그 사실을 적는다 — 「넣지 못했습니다」만 쓰면 원래대로인 줄 안다.
      */
      /*
        ⚠ **되돌리기가 실패했으면 아무도 안 옮겨졌다.** 한때 `relocating.length > 0`만 보고
        「미배정 상태입니다」를 붙였는데, 되돌리기 자체가 400이면 그 사람들은 **원래 반에
        그대로 있다** — 화면이 없는 사고를 알리는 것이다(실측 — 비활성 학생을 고르면
        되돌리기가 `TRAINEE_NOT_IN_COHORT`로 먼저 막힌다).
      */
      const strandedNote = unassigned
        ? ` · 옮기려던 ${relocating.length}명은 미배정 상태입니다`
        : ''
      setBanner({
        kind: 'failed',
        text:
          (known
            ? `${copy.title} — ${copy.description}`
            : `${picked.size}명을 ${target.name}에 넣지 못했습니다`) + strandedNote,
        retry: copy.retry ? run : undefined,
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

  return (
    <aside className="w-[300px] shrink-0">
      <div className="mb-3 flex items-center justify-between">
        <b className="text-sm font-semibold">반에 넣기</b>
        <Button variant="ghost" size="sm" onClick={onClose}>
          닫기
        </Button>
      </div>

      {banner && (
        <div className="mb-3">
          <ResultBanner
            failed={banner.kind === 'failed'}
            onDismiss={() => setBanner(null)}
            onUndo={banner.kind === 'assigned' ? () => void undo(banner.result) : undefined}
            onRetry={banner.kind === 'failed' ? banner.retry : undefined}
          >
            {banner.kind === 'assigned' ? assignedText(banner.result) : banner.text}
          </ResultBanner>
        </div>
      )}

      <ClassRail
        rooms={classes.data?.classrooms ?? []}
        picked={room}
        onPick={setRoom}
        adding={picked.size}
        target={target}
        preview={preview}
        onRun={run}
        saving={saving}
        loading={classes.isLoading}
        error={classes.error}
        onRetry={() => void classes.refetch()}
        justAdded={last}
      />
    </aside>
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
  error,
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
  /** 실패했으면 그 원인. `errorCopy`가 status·코드를 보고 문구를 정한다 */
  error: unknown
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
      ) : error ? (
        <ErrorState error={error} subject="반" onRetry={onRetry} />
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
