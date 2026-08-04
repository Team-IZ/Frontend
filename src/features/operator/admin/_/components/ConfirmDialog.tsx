import { useState } from 'react'
import { TriangleAlertIcon } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/AlertDialog'
import { Spinner } from '@/components/ui/Spinner'

/*
  되돌리기 어려운 한 건을 확인받는다 — 기수 종료 · 매니저 정지 · 초대 취소.

  **모든 액션에 확인을 세우지 않는다.** 배정처럼 **여러 번 반복하는 작업**에 확인 모달을
  세우면 250명을 스무 번 나눠 넣는 동안 스무 번 눌러야 해서 작업이 안 된다 — 그쪽은
  즉시 실행 + 되돌리기다(OP-06 §3, `ResultBanner`). 확인은 **되돌리는 화면이 없는 것**
  에만 세운다.

  **무엇이 일어나는지를 쓴다.** `정말 하시겠습니까?`는 아무 정보도 주지 않는다 —
  종료하면 무엇이 멈추고 무엇이 남는지가 판단 근거다(G4 — 부드럽게 말하려고 사실을
  흐리지 않는다).
*/
type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  /** 되돌릴 수 없는 삭제·차단이면 danger. 기본은 주 액션 색 */
  destructive?: boolean
  onConfirm: () => Promise<void>
}

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive,
  onConfirm,
}: Props) {
  const [running, setRunning] = useState(false)
  const [failed, setFailed] = useState(false)

  const run = async () => {
    setRunning(true)
    setFailed(false)
    try {
      await onConfirm()
    } catch {
      /*
        **실패하면 모달을 닫지 않는다.** 닫으면 목록이 그대로인 것을 보고 "안 눌렸나?"
        하며 다시 누르게 된다 — 여기 남겨 두면 무엇이 안 됐는지가 그 자리에 있다.
        `finally`로 스피너만 끄고 넘어갔던 자리다(실패가 화면 어디에도 안 나왔다).
      */
      setFailed(true)
    } finally {
      // 실패해도 버튼을 되살린다 — 다시 누를 수 있어야 한다
      setRunning(false)
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        // 닫을 때 실패 표시를 지운다 — 안 지우면 다음에 다른 대상으로 열었을 때 남아 있다
        if (!next) setFailed(false)
        onOpenChange(next)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          {/* 아이콘 색만 tone을 갖는다 — 카드 배면은 항상 흰색이다(H+ 상태 메시지) */}
          <AlertDialogMedia className="bg-warning-soft text-warning">
            <TriangleAlertIcon />
          </AlertDialogMedia>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {failed ? (
              // 실패 문구가 설명 자리를 대신한다 — 지금 알아야 하는 것이 그것이다
              <span className="text-danger">처리하지 못했습니다. 잠시 후 다시 시도해 주세요.</span>
            ) : (
              description
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={running}>취소</AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? 'danger' : 'primary'}
            disabled={running}
            onClick={run}
          >
            {running && <Spinner className="size-3.5" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
