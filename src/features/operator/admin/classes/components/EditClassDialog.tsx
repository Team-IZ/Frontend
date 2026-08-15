import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Field, FieldLabel, FieldDescription } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/InputGroup'
import { classroomName } from '../../_/rules'
import { Spinner } from '@/components/ui/Spinner'
import { errorCopy } from '@/lib/errorCopy'
import { useUpdateClassroom } from '@/api/academic/useAcademicMutations'
import type { findClassrooms_Item } from '@/api/academic/academicTypes'
import RequiredMark from '../../_/components/RequiredMark'

/*
  반 수정 — 이름·정원(op-06-admin.md OP06-7-②).

  **개강 전에만 열린다.** 이 모달을 여는 버튼 자체가 그때만 그려지고, 서버도 같은 규칙을
  다시 검증한다(화면만 막으면 우회된다).

  **담당 매니저는 여기서 안 바꾼다.** 담당 변경은 개강 후에도 계속 일어나는 일이라
  잠금 규칙이 다르고, 이미 제 모달이 있다(`ClassManagersDialog`) — 같은 값을 두 곳에서
  바꾸면 규칙이 두 벌이 된다.

  **`PATCH`라 바뀐 것만 보낸다.** 이름만 고치는데 정원까지 실어 보내면 그 사이 남이 바꾼
  정원을 옛 값으로 덮어쓴다(SA-02 운영 설정 모달과 같은 근거 · 6차 요청 R1).
*/
type Props = {
  /** 수정할 반. null이면 닫힌 상태 */
  target: findClassrooms_Item | null
  onOpenChange: (open: boolean) => void
}

export default function EditClassDialog({ target, onOpenChange }: Props) {
  /*
    **열 때마다 지금 값에서 시작한다.** `key`로 리마운트시키는 대신 대상 id가 바뀌면
    상태를 다시 잡는다 — 이전에 열었던 반의 값이 남아 있으면 그대로 저장된다.
  */
  const [editing, setEditing] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [capacity, setCapacity] = useState('')
  /** 실패 **원인**을 들고 있는다 — 있고 없고만 알면 화면이 이유를 지어내게 된다 */
  const [failure, setFailure] = useState<unknown>(null)
  const update = useUpdateClassroom()

  if (target && target.classroomId !== editing) {
    setEditing(target.classroomId)
    setName(target.name)
    setCapacity(String(target.capacity))
    setFailure(null)
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
    setFailure(null)
    try {
      await update.mutateAsync({
        path: { cohortId: target.cohortId, classroomId: target.classroomId },
        // 바뀐 것만 — 둘 다 생략하면 서버가 400 `CLASSROOM_UPDATE_EMPTY`로 답한다
        body: {
          ...(classroomName(name) !== target.name && { name: classroomName(name) }),
          ...(size !== target.capacity && { capacity: size }),
        },
      })
      close(false)
    } catch (e) {
      setFailure(e)
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
          {/*
            ⚠ **원인을 추측하지 않는다.** 한때 실패를 하나로 묶어
            *"같은 이름의 반이 있는지 확인해 주세요"* 를 고정으로 띄웠는데, 인증이
            끊겼거나 네트워크가 죽어도 같은 말을 했다 — 사용자가 엉뚱한 것을 고치게 된다.
            `errorCopy`가 코드·상태를 보고 문구를 정한다.
          */}
          {failure !== null &&
            (() => {
              const copy = errorCopy(failure, { subject: '반', action: '수정' })
              return (
                <Alert variant="danger">
                  <AlertTitle>{copy.title}</AlertTitle>
                  <AlertDescription>{copy.description}</AlertDescription>
                </Alert>
              )
            })()}

          <div>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Field>
                <FieldLabel htmlFor="edit-class-name">
                  반 이름 <RequiredMark />
                </FieldLabel>
                {/* 추가 모달과 같은 모양 — 「반」은 화면이 붙인다(`rules.classroomName`) */}
                <InputGroup className="h-9">
                  <InputGroupInput
                    id="edit-class-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="K"
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupText>반</InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
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
              지금 {target?.traineeCount ?? 0}명이 있습니다. 이름을 바꾸면 교육생의 소속 반 표기도
              같이 바뀝니다.
            </FieldDescription>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => close(false)} disabled={update.isPending}>
            취소
          </Button>
          {/* 안 바꾼 것은 저장할 것이 없다 — `AssignManagerDialog`와 같은 규칙 */}
          <Button disabled={!submittable || update.isPending} onClick={save}>
            {update.isPending && <Spinner className="size-3.5" />}
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
