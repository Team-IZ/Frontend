import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Alert, AlertTitle } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Field, FieldLabel, FieldDescription } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { updateClass } from '../../_/api/api'
import type { ClassRoom } from '../../_/api/types'
import RequiredMark from '../../_/components/RequiredMark'

/*
  반 수정 — 이름·정원(op-06-admin.md OP06-7-②).

  **개강 전에만 열린다.** 이 모달을 여는 버튼 자체가 그때만 그려지고, 서버도 같은 규칙을
  다시 검증한다(화면만 막으면 우회된다).

  **담당 매니저는 여기서 안 바꾼다.** 담당 변경은 개강 후에도 계속 일어나는 일이라
  잠금 규칙이 다르고, 이미 제 모달이 있다(`AssignManagerDialog`) — 같은 값을 두 곳에서
  바꾸면 규칙이 두 벌이 된다.
*/
type Props = {
  /** 수정할 반. null이면 닫힌 상태 */
  target: ClassRoom | null
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export default function EditClassDialog({ target, onOpenChange, onSaved }: Props) {
  /*
    **열 때마다 지금 값에서 시작한다.** `key`로 리마운트시키는 대신 대상 id가 바뀌면
    상태를 다시 잡는다 — 이전에 열었던 반의 값이 남아 있으면 그대로 저장된다.
  */
  const [editing, setEditing] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [capacity, setCapacity] = useState('')
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)

  if (target && target.id !== editing) {
    setEditing(target.id)
    setName(target.name)
    setCapacity(String(target.capacity))
    setFailed(false)
  }

  const size = Number(capacity)
  const changed = target && (name.trim() !== target.name || size !== target.capacity)
  const submittable = name.trim().length > 0 && Number.isFinite(size) && size > 0 && changed

  const close = (next: boolean) => {
    onOpenChange(next)
    if (!next) setEditing(null)
  }

  const save = async () => {
    if (!target) return
    setSaving(true)
    setFailed(false)
    try {
      await updateClass(target.id, { name: name.trim(), capacity: size })
      onSaved()
      close(false)
    } catch {
      setFailed(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={target !== null} onOpenChange={close}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>
            반 수정
            <span className="text-fg-subtle text-xs font-normal"> · {target?.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {failed && (
            <Alert variant="danger">
              <AlertTitle>수정하지 못했습니다. 같은 이름의 반이 있는지 확인해 주세요.</AlertTitle>
            </Alert>
          )}

          <div>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Field>
                <FieldLabel htmlFor="edit-class-name">
                  반 이름 <RequiredMark />
                </FieldLabel>
                <Input
                  id="edit-class-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
              <Field className="w-24">
                <FieldLabel htmlFor="edit-class-capacity">
                  정원 <RequiredMark />
                </FieldLabel>
                <Input
                  id="edit-class-capacity"
                  type="number"
                  min={1}
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                />
              </Field>
            </div>
            <FieldDescription className="mt-1.5">
              {/* 이름을 바꾸면 명단의 `소속 반`도 같이 바뀐다 — 한 사실이 한 곳에서 나온다 */}
              지금 {target?.size ?? 0}명이 있습니다. 이름을 바꾸면 명단의 소속 반 표기도 같이
              바뀝니다.
            </FieldDescription>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => close(false)} disabled={saving}>
            취소
          </Button>
          {/* 안 바꾼 것은 저장할 것이 없다 — `AssignManagerDialog`와 같은 규칙 */}
          <Button disabled={!submittable || saving} onClick={save}>
            {saving && <Spinner className="size-3.5" />}
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
