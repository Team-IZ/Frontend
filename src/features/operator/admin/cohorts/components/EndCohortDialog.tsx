import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Field, FieldLabel } from '@/components/ui/Field'
import { Textarea } from '@/components/ui/Textarea'
import { Spinner } from '@/components/ui/Spinner'
import RequiredMark from '../../_/components/RequiredMark'
import type { Cohort } from '../../_/cohortScope'

/*
  기수 종료 — **확인만 받는 것이 아니라 사유를 받는다.**

  `ConfirmDialog`를 못 쓴다. 서버가 `reason`을 **필수**로 요구한다(빈 문자열이면 400).
  확인 전용 모달로 보내면 400을 받고서야 "사유가 필요하다"를 알게 되는데, 그때는 입력할
  칸이 화면에 없다.

  **사유는 나중에 읽히는 값이다.** 종료가 되돌릴 수 없고 명단·이력이 그대로 남으므로,
  몇 달 뒤 "이 기수는 왜 닫혔지"의 유일한 답이 이 한 줄이다 — 그래서 자유 입력이다
  (드롭다운으로 고르게 하면 실제 이유는 `기타`에 뭉친다).
*/
export default function EndCohortDialog({
  cohort,
  onOpenChange,
  onConfirm,
}: {
  /** 종료할 기수. null이면 닫힌 상태다 */
  cohort: Cohort | null
  onOpenChange: (open: boolean) => void
  onConfirm: (reason: string) => Promise<void>
}) {
  const [reason, setReason] = useState('')
  const [running, setRunning] = useState(false)
  const [failed, setFailed] = useState(false)

  // 다이얼로그는 닫아도 언마운트되지 않는다 — 열 때 비운다(다른 기수의 사유가 남는다)
  useEffect(() => {
    if (cohort) {
      setReason('')
      setFailed(false)
    }
  }, [cohort])

  const run = async () => {
    setRunning(true)
    setFailed(false)
    try {
      await onConfirm(reason.trim())
    } catch {
      // **실패하면 닫지 않는다.** 닫으면 목록이 그대로인 것을 보고 다시 누르게 된다
      setFailed(true)
    } finally {
      setRunning(false)
    }
  }

  return (
    <Dialog open={cohort !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{cohort?.name}를 종료할까요?</DialogTitle>
          <DialogDescription>
            종료하면 새 프로젝트를 만들 수 없고, 진행 중인 회차의 응시 창도 더 열리지 않습니다.
            명단과 이미 발행된 리포트는 그대로 남습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {failed && (
            <Alert variant="danger">종료하지 못했습니다. 잠시 후 다시 시도해 주세요.</Alert>
          )}
          <Field>
            <FieldLabel htmlFor="end-cohort-reason">
              종료 사유 <RequiredMark />
            </FieldLabel>
            <Textarea
              id="end-cohort-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="예: 6개월 과정 정상 종료"
              rows={3}
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={running}>
            취소
          </Button>
          <Button disabled={!reason.trim() || running} onClick={() => void run()}>
            {running && <Spinner className="size-3.5" />}
            기수 종료
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
