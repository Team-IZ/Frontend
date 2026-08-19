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
import { useUpdateCohort } from '@/api/academic/useAcademicMutations'
import { toIsoDate } from '../../_/rules'
import RequiredMark from '../../_/components/RequiredMark'
import DateRangeField from './DateRangeField'
import type { Cohort } from '@/stores/cohortScope'

/*
  기수 수정 — 이름·기간(11차 Q2).

  **개강 전에만 열린다.** 서버가 `PLANNED`가 아니면 거절하고, 화면도 그때만 버튼을 그린다.
  개강하고 나면 그 기수로 회차가 돌고 리포트가 쌓여서, 이름을 바꾸면 지난 기록이 가리키는
  곳이 흔들린다.

  **`PATCH`라 바뀐 키만 보낸다.** 이름만 고치는데 기간까지 실어 보내면 그 사이 남이 바꾼
  값을 옛 값으로 덮어쓴다(반 수정과 같은 규칙 · 6차 R1의 근거).
  셋 다 생략하면 서버가 400 `COHORT_UPDATE_EMPTY`로 답한다.
*/
type Props = {
  /** 수정할 기수. null이면 닫힌 상태 */
  target: Cohort | null
  onOpenChange: (open: boolean) => void
}

const toDate = (iso: string | null) => (iso ? new Date(iso) : undefined)

export default function EditCohortDialog({ target, onOpenChange }: Props) {
  /*
    **열 때마다 지금 값에서 시작한다.** 대상 id가 바뀌면 상태를 다시 잡는다 — 이전에
    열었던 기수의 값이 남아 있으면 그대로 저장된다(반 수정 모달과 같은 처리).
  */
  const [editing, setEditing] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [startAt, setStartAt] = useState<Date>()
  const [endAt, setEndAt] = useState<Date>()
  const [failed, setFailed] = useState(false)
  const update = useUpdateCohort()

  if (target && target.cohortId !== editing) {
    setEditing(target.cohortId)
    setName(target.name)
    setStartAt(toDate(target.startDate))
    setEndAt(toDate(target.endDate))
    setFailed(false)
  }

  const nextStart = startAt && toIsoDate(startAt)
  const nextEnd = endAt && toIsoDate(endAt)
  const changed =
    target &&
    (name.trim() !== target.name ||
      nextStart !== (target.startDate ?? undefined) ||
      nextEnd !== (target.endDate ?? undefined))
  const submittable = name.trim().length > 0 && changed && !update.isPending

  const close = (next: boolean) => {
    onOpenChange(next)
    if (!next) setEditing(null)
  }

  const save = async () => {
    if (!target) return
    setFailed(false)
    try {
      await update.mutateAsync({
        path: { cohortId: target.cohortId },
        // 바뀐 것만 — 안 보낸 키는 서버가 그대로 둔다
        body: {
          ...(name.trim() !== target.name && { name: name.trim() }),
          ...(nextStart !== (target.startDate ?? undefined) && { startDate: nextStart }),
          ...(nextEnd !== (target.endDate ?? undefined) && { endDate: nextEnd }),
        },
      })
      close(false)
    } catch {
      setFailed(true)
    }
  }

  return (
    <Dialog open={target !== null} onOpenChange={close}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            기수 수정
            <span className="text-fg-subtle text-xs font-normal"> · {target?.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {failed && (
            <Alert variant="danger">
              <AlertTitle>수정하지 못했습니다. 같은 이름의 기수가 있는지 확인해 주세요.</AlertTitle>
            </Alert>
          )}

          <Field>
            <FieldLabel htmlFor="edit-cohort-name">
              기수명 <RequiredMark />
            </FieldLabel>
            <Input
              id="edit-cohort-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="9기"
            />
            <FieldDescription>같은 기관 안에서 중복될 수 없습니다.</FieldDescription>
          </Field>

          <Field>
            <FieldLabel>기간</FieldLabel>
            <DateRangeField
              startAt={startAt}
              endAt={endAt}
              onChange={(patch) => {
                if ('startAt' in patch) setStartAt(patch.startAt)
                if ('endAt' in patch) setEndAt(patch.endAt)
              }}
            />
            <FieldDescription>개강하면 이 창이 닫힙니다.</FieldDescription>
          </Field>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => close(false)} disabled={update.isPending}>
            취소
          </Button>
          <Button disabled={!submittable} onClick={() => void save()}>
            {update.isPending && <Spinner className="size-3.5" />}
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
