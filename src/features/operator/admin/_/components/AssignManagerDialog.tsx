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
import { listManagers, setClassManager } from '../api/api'
import type { ClassRoom } from '../api/types'

/*
  이 반을 누가 맡나 — **반 하나 = 매니저 하나**라 라디오다.

  ⚠ **아직 목이다.** 반 탭이 실서버로 옮겨질 때 이 파일도 함께 다시 쓴다.

  ## 매니저 쪽 문이 갈라져 나갔다
  전에는 이 파일이 양방향을 다 맡았다 — 반 쪽이면 매니저를 고르고, 매니저 쪽이면 반을
  고르는 식이다. **매니저 탭이 실서버로 옮겨가면서**(`ManagerClassroomsDialog`) 두 문이
  서로 다른 데이터를 보게 되어 한 파일에 둘 수 없어졌다.

  나뉜 것이 오히려 맞다 — 관계가 다르므로 컨트롤도(라디오 ↔ 체크박스) 저장 경로도
  원래 갈라져 있었다(op-06-admin.md OP06-11). 한때 둘 다 라디오였고 저장도 하나로
  처리해서, 매니저 쪽에서 반 하나를 고르면 기존 담당은 그대로 둔 채 **하나가 더
  붙었다**(실측: `B반, D반` → F반 선택 → `B반, D반, F반`).

  **가입 전 매니저는 후보에 없다**(기획 확인 · OP06-11). 로그인을 못 해 그 반의 면담·독촉을
  처리할 수 없는데, 반에 id가 박히면 `담당 없음` 경고에 안 잡힌다.
*/
type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * 담당을 정할 반. **행 하나를 통째로 받는다** — 지금 상태(담당·구간 시작)를 다 읽어야
   * 해서, 필드를 하나씩 옮겨 적으면 타입이 늘 때마다 여기도 늘어난다.
   */
  fixed: { kind: 'class'; room: ClassRoom }
  onSaved: () => void
}

export default function AssignManagerDialog({ open, onOpenChange, fixed, onSaved }: Props) {
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)

  const loadManagers = useCallback(() => listManagers({ status: 'ACTIVE' }), [])
  const managers = useAsync(loadManagers, open)

  /*
    ── 반 쪽 ── 매니저 하나. 지금 담당이 처음 선택이다. 안 그러면 `담당 변경`으로 열고
    아무것도 안 만진 채 저장했을 때 담당이 **해제된다**.
  */
  const currentManager = fixed.room.managerId
  const [pickedManager, setPickedManager] = useState<string | null>(currentManager)

  /** 안 바꾼 것은 저장할 것이 없다 */
  const changed = pickedManager !== currentManager

  const save = async () => {
    setSaving(true)
    setFailed(false)
    try {
      await setClassManager(fixed.room.id, pickedManager)
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
      setFailed(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="flex max-h-[80svh] flex-col sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>
            담당 매니저
            <span className="text-fg-subtle text-xs font-normal"> · {fixed.room.name}</span>
          </DialogTitle>
        </DialogHeader>

        {/* **지금 값을 먼저 적는다** — 무엇을 바꾸는지 모르는 채로 고르게 두지 않는다 */}
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

        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          {failed && (
            <Alert variant="danger" className="mb-3">
              <AlertTitle>저장하지 못했습니다. 다시 시도해 주세요.</AlertTitle>
            </Alert>
          )}

          <div className="border-border divide-border divide-y rounded-md border">
            {(managers.data?.items ?? []).map((m) => (
              <Choice
                key={m.id}
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
            ))}
          </div>

          {/*
            **해제도 배정의 일부다.** 매니저가 그만두면 반은 남으므로 비우는 길이 있어야
            하고, 비우면 `담당 필요` 경고가 다시 켜진다. 매니저 쪽은 체크를 푸는 것이
            같은 일을 하므로 이 버튼이 없다.
          */}
          {currentManager !== null && (
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
 * **모양이 관계를 말한다**(E10) — 반 하나에 매니저 하나라 라디오다.
 * 매니저 쪽(반 여럿 · 체크박스)은 `ManagerClassroomsDialog`가 갖는다.
 */
function Choice({
  checked,
  onPick,
  title,
  note,
}: {
  checked: boolean
  onPick: () => void
  title: string
  note: string
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
      <span className="text-fg-subtle ml-auto text-xs">{note}</span>
    </label>
  )
}
