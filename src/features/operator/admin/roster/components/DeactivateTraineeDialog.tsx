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
import { Input } from '@/components/ui/Input'
import { errorCopy } from '@/lib/errorCopy'
import { Spinner } from '@/components/ui/Spinner'
import { useUpdateTraineeStatus } from '@/api/member/useMemberMutations'
import RequiredMark from '../../_/components/RequiredMark'
import type { TraineeRosterEntry } from '../../_/api/types'

/*
  교육생 비활성 — **중도 이탈 처리**(op-06-admin.md OP06-7-①).

  **삭제가 아니다.** 명단에서 지우면 그 사람이 남긴 응시·리포트가 주인을 잃는다.
  퇴사한 매니저를 지우지 않고 정지로 남기는 것과 같은 판단이다(OP-06 §3).

  **반은 그대로 둔다.** MG-05 헤더가 `25명 · 활성 23 · 초대 대기 1 · 비활성 1`이라
  비활성을 반 인원 안에 세고 있다 — 반에서 빼면 담당 매니저가 그만둔 학생을 못 본다.

  **사유를 받는다.** MG-05가 *"초대 대기·비활성 행은 흐리게 + **사유·일자**를 쓴다"* 고
  요구하는데, 사유를 안 받으면 매니저 화면에 쓸 것이 없다. 일자는 서버가 찍는다 —
  화면이 만들면 사용자 시계에 따라 달라진다.

  **사유를 목록으로 만들지 않았다.** 기획에 이탈 사유 분류가 없다(mock-first §5 — 없는
  기준을 화면이 만들지 않는다). 분류가 정해지면 그때 드롭다운이 된다.

  ⚠ **되돌리는 길이 없다**(기획 확인). 그래서 되돌릴 수 있는 조작인 것처럼 쓰지 않고,
  **다시 활성으로 못 되돌린다는 사실을 누르기 전에 적는다** — `ConfirmDialog`가 되돌릴
  수 없는 것에만 확인을 세우는 것과 같은 자리다.
*/
type Trainee = TraineeRosterEntry

type Props = {
  /** 비활성할 사람. null이면 닫힌 상태 */
  target: Trainee | null
  /** 이 사람이 속한 기수 — 상태 변경 경로가 기수를 받는다 */
  cohortId: string
  onOpenChange: (open: boolean) => void
  onDone: (t: Trainee, reason: string) => void
}

export default function DeactivateTraineeDialog({ target, cohortId, onOpenChange, onDone }: Props) {
  const [reason, setReason] = useState('')
  /** 실패 **원인**을 들고 있는다 — 있고 없고만 알면 화면이 이유를 지어낸다 */
  const [failure, setFailure] = useState<unknown>(null)
  const update = useUpdateTraineeStatus()

  const close = (next: boolean) => {
    onOpenChange(next)
    // 닫으면 비운다 — 다음 사람에게 지난 사유가 남아 있으면 그대로 저장된다
    if (!next) {
      setReason('')
      setFailure(null)
    }
  }

  const save = async () => {
    if (!target) return
    setFailure(null)
    try {
      await update.mutateAsync({
        path: { cohortId, traineeId: target.traineeId },
        body: { status: 'INACTIVE', reason: reason.trim() },
      })
      onDone(target, reason)
      close(false)
    } catch (e) {
      setFailure(e)
    }
  }

  return (
    <Dialog open={target !== null} onOpenChange={close}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>
            비활성 처리
            <span className="text-fg-subtle text-xs font-normal"> · {target?.name}</span>
          </DialogTitle>
        </DialogHeader>

        {/*
          ⚠ **원인을 추측하지 않는다.** 한때 실패를 하나로 묶어 *"잠시 후 다시 시도해
          주세요"* 라고 했는데, `TRAINEE_STATUS_NOT_MUTABLE`처럼 **기다려도 안 되는 것**
          까지 그렇게 말했다. `errorCopy`가 코드를 보고 정한다.
        */}
        {failure !== null &&
          (() => {
            const copy = errorCopy(failure, { subject: '교육생', action: '비활성 처리' })
            return (
              <Alert variant="danger">
                <AlertTitle>{copy.title}</AlertTitle>
                <AlertDescription>{copy.description}</AlertDescription>
              </Alert>
            )
          })()}

        {/* **무엇이 일어나는지 쓴다**(G4) — `정말 하시겠습니까?`는 판단 근거를 안 준다 */}
        <p className="text-fg-muted text-xs">
          계정이 막혀 더는 로그인할 수 없습니다. 교육생 목록과 소속 반에는 그대로 남고, 이미 응시한
          기록과 리포트도 남습니다.{' '}
          <b className="text-danger font-semibold">다시 활성으로 되돌릴 수 없습니다.</b>
        </p>

        <div className="mt-1">
          <label htmlFor="deactivate-reason" className="mb-1 block text-xs font-semibold">
            사유
            <RequiredMark />
          </label>
          <Input
            id="deactivate-reason"
            value={reason}
            placeholder="중도 이탈"
            onChange={(e) => setReason(e.target.value)}
          />
          {/* 일자는 서버가 찍는다 — 매니저 화면이 `중도 이탈 2026-08-04`로 읽는다 */}
          <p className="text-fg-subtle mt-1 text-2xs">
            사유와 오늘 날짜가 교육생 목록에 남고, 담당 매니저 화면에도 그대로 보입니다.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => close(false)} disabled={update.isPending}>
            취소
          </Button>
          <Button variant="danger" disabled={update.isPending || !reason.trim()} onClick={save}>
            {update.isPending && <Spinner className="size-3.5" />}
            비활성 처리
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
