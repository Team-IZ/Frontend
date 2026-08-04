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
import { Spinner } from '@/components/ui/Spinner'
import { useAsync } from '@/lib/useAsync'
import { cn } from '@/lib/utils/cn'
import { listClasses, listManagers, setClassManager } from '../api/api'
import type { ClassRoom } from '../api/types'
import { COHORT_ID } from '../cohortScope'
import { needsManager } from '../rules'

/*
  반 담당 배정 — **한 곳에서만 바꾼다**(`setClassManager`).

  들어오는 문이 둘이다. 반 쪽에서는 *"이 반을 누가 맡나"*, 매니저 쪽에서는 *"이 사람이
  어느 반을 맡나"* 를 묻는데 **바뀌는 것은 같은 값**이라 저장 경로를 나누지 않았다 —
  나누면 같은 규칙이 두 곳에 생기고 한쪽만 고쳐진다.

  **한 번에 한 건이다.** 여러 반을 한꺼번에 맡기는 화면은 만들지 않았다 — 목업에 없고,
  실제로 그 일이 필요한 자리는 반이 늘어날 때이지 매니저를 고를 때가 아니다(YAGNI).

  **확인 모달을 세우지 않는다.** 배정은 언제든 다시 바꿀 수 있고, 되돌릴 수 없는 것에만
  확인을 세운다(`ConfirmDialog` 주석).

  배정이 **기간형 이력**이라 지난 기수의 담당 기록은 이 조작으로 지워지지 않는다 —
  서버가 구간을 닫고 새로 연다(api.ts). 지금 열려 있는 구간이 **언제·누구 손으로**
  열렸는지를 제목 아래에 적는다 — 바꾸려는 사람이 먼저 묻는 것이 그것이다.

  **현재 담당을 미리 골라 둔다.** 안 그러면 `담당 변경`으로 열고 아무것도 안 만진 채
  저장했을 때 담당이 **해제된다** — 바꾸러 들어온 사람이 지우게 되는 자리였다.
*/
type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * 반이 정해져 있으면 매니저를 고른다. 매니저가 정해져 있으면 반을 고른다.
   *
   * 반 쪽은 **행 하나를 통째로 받는다** — 이름·현재 담당·구간 시작을 다 읽어야 해서
   * 필드를 하나씩 옮겨 적으면 `ClassRoom`이 늘 때마다 여기도 늘어난다.
   */
  fixed: { kind: 'class'; room: ClassRoom } | { kind: 'manager'; id: string; name: string }
  onSaved: () => void
}

export default function AssignManagerDialog({ open, onOpenChange, fixed, onSaved }: Props) {
  /*
    반 쪽에서 열면 지금 담당이 처음 선택이다. 매니저 쪽에서는 **비워 둔다** — 한 사람이
    여러 반을 맡을 수 있어(`classNames: string[]`) "지금 고른 것"이 하나로 정해지지 않는다.
  */
  const current = fixed.kind === 'class' ? fixed.room.managerId : null
  const [picked, setPicked] = useState<string | null>(current)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)

  const loadClasses = useCallback(() => listClasses(COHORT_ID), [])
  const loadManagers = useCallback(() => listManagers({ status: 'ACTIVE' }), [])
  const classes = useAsync(loadClasses, open)
  const managers = useAsync(loadManagers, open)

  const pickingManager = fixed.kind === 'class'
  /** 제목에 붙는 이름 — 반 이름이거나 매니저 이름이다 */
  const fixedName = fixed.kind === 'class' ? fixed.room.name : fixed.name

  const save = async () => {
    setSaving(true)
    setFailed(false)
    try {
      // 어느 문으로 들어왔든 저장은 `반 하나에 매니저 하나`다
      const classId = fixed.kind === 'class' ? fixed.room.id : (picked as string)
      const managerId = fixed.kind === 'class' ? picked : fixed.id
      await setClassManager(classId, managerId)
      onSaved()
      onOpenChange(false)
      setPicked(null)
    } catch {
      setFailed(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80svh] flex-col sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>
            {pickingManager ? '담당 매니저' : '담당할 반'}
            <span className="text-fg-subtle text-xs font-normal"> · {fixedName}</span>
          </DialogTitle>
        </DialogHeader>

        {/*
          **지금 값을 먼저 적는다.** 무엇을 바꾸는지 모르는 채로 고르게 두지 않는다.
          `assignedAt`이 있으면 언제부터 누구 손으로 열린 구간인지도 같이 — 담당을
          바꾸기 전에 실제로 묻는 것이 *"언제부터 이 사람이었지"* 다.
        */}
        {fixed.kind === 'class' && (
          <p className="text-fg-muted -mt-1 mb-2 text-xs">
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
          </p>
        )}

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
                    checked={picked === m.id}
                    onPick={() => setPicked(m.id)}
                    title={m.name ?? m.email}
                    // 무엇을 이미 맡고 있는지가 판단 근거다 — 한 사람에게 몰리는 것이 보인다
                    note={
                      m.assignment
                        ? `${m.assignment.cohortName} · ${m.assignment.classNames.join(', ')}`
                        : '담당 반 없음'
                    }
                  />
                ))
              : (classes.data ?? []).map((room) => (
                  <Choice
                    key={room.id}
                    checked={picked === room.id}
                    onPick={() => setPicked(room.id)}
                    title={room.name}
                    note={
                      needsManager(room)
                        ? `담당 없음 · ${room.size}명`
                        : `${room.managerName} · ${room.size}명`
                    }
                    /* 담당이 이미 있는 반을 고르면 그 사람이 교체된다 — 고르기 전에 알린다 */
                    warn={!needsManager(room)}
                  />
                ))}
          </div>

          {/*
            **해제도 배정의 일부다.** 매니저가 그만두면 반은 남으므로 비우는 길이 있어야
            하고, 비우면 `담당 필요` 경고가 다시 켜진다. 현재 담당이 미리 골라져 있으므로
            이 버튼을 눌러야만 해제가 된다 — 예전에는 아무것도 안 만지고 저장해도 풀렸다.
          */}
          {pickingManager && fixed.kind === 'class' && fixed.room.managerId !== null && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => setPicked(null)}
              aria-pressed={picked === null}
            >
              담당 비우기
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            취소
          </Button>
          {/* 안 고른 것도, **안 바꾼 것도** 저장할 것이 없다 — 누르면 같은 값을 다시 쓴다 */}
          <Button disabled={saving || picked === current} onClick={save}>
            {saving && <Spinner className="size-3.5" />}
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** 라디오 한 줄. 단일 선택이라 체크박스가 아니다 — 컨트롤 모양이 곧 규칙이다(E10) */
function Choice({
  checked,
  onPick,
  title,
  note,
  warn,
}: {
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
      <input
        type="radio"
        className="accent-primary"
        checked={checked}
        onChange={onPick}
        name="assign-target"
      />
      <span className="font-medium">{title}</span>
      <span className={cn('ml-auto text-xs', warn ? 'text-warning' : 'text-fg-subtle')}>
        {note}
        {warn && ' · 교체됩니다'}
      </span>
    </label>
  )
}
