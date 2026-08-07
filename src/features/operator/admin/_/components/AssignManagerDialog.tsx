import { useCallback, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Alert, AlertTitle } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Spinner } from '@/components/ui/Spinner'
import { useAsync } from '@/lib/useAsync'
import { cn } from '@/lib/utils/cn'
import { listClasses, listManagers, setClassManager, setManagerClasses } from '../api/api'
import type { ClassRoom, Manager } from '../api/types'
import { COHORT_ID } from '../cohortScope'
import { needsManager } from '../rules'

/*
  담당 배정 — **문이 둘이고, 두 문의 관계가 다르다**(op-06-admin.md OP06-11).

    · 반 쪽에서 열면   `이 반을 누가 맡나`   → 매니저 **하나**를 고른다(라디오)
    · 매니저 쪽에서 열면 `이 사람이 어느 반을` → 반 **여럿**을 고른다(체크박스)

  **한때 둘 다 라디오였고, 저장도 `setClassManager` 하나로 처리했다.** 그래서 매니저
  쪽에서 반 하나를 고르면 기존 담당은 그대로 둔 채 **하나가 더 붙었다** — 라디오로
  골랐는데 결과가 추가였다(실측: `B반, D반` → F반 선택 → `B반, D반, F반`).
  **컨트롤 모양이 관계를 말해야 한다**(E10) — 그래서 모양도 저장 경로도 갈랐다.

  **가입 전 매니저는 후보에 없다**(기획 확인 · OP06-11). 로그인을 못 해 그 반의 면담·독촉을
  처리할 수 없는데, 반에 id가 박히면 `담당 없음` 경고에 안 잡힌다.

  배정이 **기간형 이력**이라 지난 기수의 담당 기록은 이 조작으로 지워지지 않는다 —
  서버가 구간을 닫고 새로 연다(api.ts).
*/
type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * 반이 정해져 있으면 매니저를 고르고, 매니저가 정해져 있으면 반을 고른다.
   *
   * 양쪽 다 **행 하나를 통째로 받는다** — 지금 상태(담당·구간 시작·담당 반)를 다 읽어야
   * 해서, 필드를 하나씩 옮겨 적으면 타입이 늘 때마다 여기도 늘어난다.
   */
  fixed: { kind: 'class'; room: ClassRoom } | { kind: 'manager'; manager: Manager }
  onSaved: () => void
}

export default function AssignManagerDialog({ open, onOpenChange, fixed, onSaved }: Props) {
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)

  const loadClasses = useCallback(() => listClasses(COHORT_ID), [])
  const loadManagers = useCallback(() => listManagers({ status: 'ACTIVE' }), [])
  const classes = useAsync(loadClasses, open)
  const managers = useAsync(loadManagers, open)

  const pickingManager = fixed.kind === 'class'
  const fixedName =
    fixed.kind === 'class' ? fixed.room.name : (fixed.manager.name ?? fixed.manager.email)

  /*
    ── 반 쪽 ── 매니저 하나. 지금 담당이 처음 선택이다. 안 그러면 `담당 변경`으로 열고
    아무것도 안 만진 채 저장했을 때 담당이 **해제된다**.
  */
  const currentManager = fixed.kind === 'class' ? fixed.room.managerId : null
  const [pickedManager, setPickedManager] = useState<string | null>(currentManager)

  /*
    ── 매니저 쪽 ── 반 여럿. **지금 맡은 반이 미리 체크돼 있다** — 그래야 체크를 풀어
    담당을 뺄 수 있다(예전에는 매니저 쪽에서 반을 빼는 길이 아예 없었다).
  */
  const currentRooms = (classes.data ?? [])
    .filter((c) => fixed.kind === 'manager' && c.managerId === fixed.manager.id)
    .map((c) => c.id)
  const [pickedRooms, setPickedRooms] = useState<ReadonlySet<string> | null>(null)
  /** 목록이 아직 안 왔으면 지금 담당을 초기값으로 쓴다 */
  const rooms = pickedRooms ?? new Set(currentRooms)

  const toggleRoom = (id: string) =>
    setPickedRooms(() => {
      const next = new Set(rooms)
      if (!next.delete(id)) next.add(id)
      return next
    })

  /** 안 바꾼 것은 저장할 것이 없다 */
  const changed = pickingManager
    ? pickedManager !== currentManager
    : pickedRooms !== null &&
      (rooms.size !== currentRooms.length || currentRooms.some((id) => !rooms.has(id)))

  const save = async () => {
    setSaving(true)
    setFailed(false)
    try {
      if (fixed.kind === 'class') await setClassManager(fixed.room.id, pickedManager)
      else await setManagerClasses(fixed.manager.id, [...rooms])
      onSaved()
      close(false)
    } catch {
      setFailed(true)
    } finally {
      setSaving(false)
    }
  }

  const close = (next: boolean) => {
    onOpenChange(next)
    // 닫으면 비운다 — 다음에 다른 대상으로 열었을 때 지난 선택이 남으면 그대로 저장된다
    if (!next) {
      setPickedManager(currentManager)
      setPickedRooms(null)
      setFailed(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="flex max-h-[80svh] flex-col sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>
            {pickingManager ? '담당 매니저' : '담당할 반'}
            <span className="text-fg-subtle text-xs font-normal"> · {fixedName}</span>
          </DialogTitle>
        </DialogHeader>

        {/* **지금 값을 먼저 적는다** — 무엇을 바꾸는지 모르는 채로 고르게 두지 않는다 */}
        <p className="text-fg-muted -mt-1 mb-2 text-xs">
          {fixed.kind === 'class' ? (
            <>
              현재{' '}
              {fixed.room.managerName ? (
                <b className="text-fg font-semibold">{fixed.room.managerName}</b>
              ) : (
                <b className="text-warning font-semibold">담당 없음</b>
              )}
              {fixed.room.assignedAt && (
                <span className="text-fg-subtle">
                  {' · '}
                  {fixed.room.assignedAt}부터
                  {fixed.room.assignedBy && ` · ${fixed.room.assignedBy} 배정`}
                </span>
              )}
            </>
          ) : (
            <>
              현재 <b className="text-fg font-semibold">{currentRooms.length}개 반</b> 담당 · 체크를
              풀면 그 반은 담당 없음이 됩니다
            </>
          )}
        </p>

        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          {failed && (
            <Alert variant="danger" className="mb-3">
              <AlertTitle>저장하지 못했습니다. 다시 시도해 주세요.</AlertTitle>
            </Alert>
          )}

          <div className="border-border divide-border divide-y rounded-md border">
            {pickingManager
              ? (managers.data?.items ?? []).map((m) => (
                  <Choice
                    key={m.id}
                    kind="radio"
                    checked={pickedManager === m.id}
                    onPick={() => setPickedManager(m.id)}
                    title={m.name ?? m.email}
                    // 무엇을 이미 맡고 있는지가 판단 근거다 — 한 사람에게 몰리는 것이 보인다
                    note={
                      m.assignments.length > 0
                        ? m.assignments
                            .map((a) => `${a.cohortName} · ${a.classNames.join(', ')}`)
                            .join(' / ')
                        : '담당 반 없음'
                    }
                  />
                ))
              : (classes.data ?? []).map((room) => {
                  /*
                    **본인이 맡은 반에는 경고를 붙이지 않는다.** 담당 유무만 보고 있어서
                    이미 자기가 맡은 반에도 `교체됩니다`가 떴다 — 자기를 자기로 교체한다는 말이다.
                  */
                  const mine = fixed.kind === 'manager' && room.managerId === fixed.manager.id
                  return (
                    <Choice
                      key={room.id}
                      kind="checkbox"
                      checked={rooms.has(room.id)}
                      onPick={() => toggleRoom(room.id)}
                      title={room.name}
                      note={
                        needsManager(room)
                          ? `담당 없음 · ${room.size}명`
                          : `${room.managerName} · ${room.size}명`
                      }
                      warn={!needsManager(room) && !mine}
                    />
                  )
                })}
          </div>

          {/*
            **해제도 배정의 일부다.** 매니저가 그만두면 반은 남으므로 비우는 길이 있어야
            하고, 비우면 `담당 필요` 경고가 다시 켜진다. 매니저 쪽은 체크를 푸는 것이
            같은 일을 하므로 이 버튼이 없다.
          */}
          {pickingManager && currentManager !== null && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => setPickedManager(null)}
              aria-pressed={pickedManager === null}
            >
              담당 비우기
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => close(false)} disabled={saving}>
            취소
          </Button>
          <Button disabled={saving || !changed} onClick={save}>
            {saving && <Spinner className="size-3.5" />}
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * 선택지 한 줄.
 *
 * **모양이 관계를 말한다**(E10) — 반 하나에 매니저 하나라 라디오, 매니저 하나에 반
 * 여럿이라 체크박스다. 같은 컴포넌트를 쓰되 컨트롤만 갈린다.
 */
function Choice({
  kind,
  checked,
  onPick,
  title,
  note,
  warn,
}: {
  kind: 'radio' | 'checkbox'
  checked: boolean
  onPick: () => void
  title: string
  note: string
  warn?: boolean
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center gap-2.5 p-2.5 text-sm',
        checked && 'bg-primary-soft',
      )}
    >
      {kind === 'radio' ? (
        <input
          type="radio"
          className="accent-primary"
          checked={checked}
          onChange={onPick}
          name="assign-target"
        />
      ) : (
        <Checkbox checked={checked} onCheckedChange={onPick} />
      )}
      <span className="font-medium">{title}</span>
      <span className={cn('ml-auto text-xs', warn ? 'text-warning' : 'text-fg-subtle')}>
        {note}
        {warn && ' · 교체됩니다'}
      </span>
    </label>
  )
}
