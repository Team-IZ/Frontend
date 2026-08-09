import { useState } from 'react'
import { TriangleAlertIcon } from 'lucide-react'
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
import { useRequestAnalysis } from '@/api/curriculum/useCurriculumMutations'

/*
  다시 분석하기 전에 — **쓰는 회차를 먼저 보여준다**(OP-06 §6).

  다시 분석하면 섹션이 합쳐지거나 쪽 번호가 달라진다. 그러면 **이미 발행된 리포트의
  교안 위치가 실제와 어긋난다** — 면담에서 `3장 36~46쪽`을 폈는데 다른 내용이 나온다.

  **이미 응시한 학생의 문항과 리포트는 그대로 둔다.** 새 분석 결과는 **다음에 만드는
  회차부터** 적용된다 — 지난 회차 결과가 바뀌면 회차 간 비교가 깨진다.

  쓰는 회차가 없으면 이 경고가 필요 없다 — 그때는 무엇이 바뀌는지만 알린다.
  **없는 위험을 매번 확인받으면 확인이 의미를 잃는다.**

  ## ⚠ 경고 문턱이 넓어졌다
  목은 **응시가 시작된 회차**만 위험으로 봤다(`attended > 0`). 서버가 주는 것은
  `GET /curricula/{materialId}/projects`의 **회차 이름 배열**뿐이라 응시 여부를 알 수 없어,
  **연결된 회차가 하나라도 있으면** 경고한다.

  좁은 쪽으로 틀리는 것보다 낫다 — 아직 응시 전인 회차에도 경고가 뜨는 것은 과하지만,
  응시가 시작된 회차를 조용히 지나가면 발행된 리포트가 어긋난다. 서버가 응시 수를 주면
  다시 좁힌다(10차 요청).
*/
type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  materialId: string
  title: string
  /** 이 교안을 쓰는 회차 이름. 비어 있으면 경고 문구가 달라진다 */
  usedProjectNames: string[]
}

export default function ReanalyzeDialog({
  open,
  onOpenChange,
  materialId,
  title,
  usedProjectNames,
}: Props) {
  const [failed, setFailed] = useState(false)
  const request = useRequestAnalysis()
  const running = request.isPending
  const inUse = usedProjectNames

  const run = async () => {
    setFailed(false)
    try {
      await request.mutateAsync({ path: { materialId } })
      onOpenChange(false)
    } catch {
      setFailed(true)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>다시 분석하기 전에</DialogTitle>
        </DialogHeader>

        {failed && (
          <Alert variant="danger">
            <AlertTitle>분석을 요청하지 못했습니다. 잠시 후 다시 시도해 주세요.</AlertTitle>
          </Alert>
        )}

        {inUse.length > 0 ? (
          <div className="flex gap-3">
            {/* 아이콘 색만 tone을 갖는다 — 카드 배면은 흰색이다(H+ 상태 메시지) */}
            <div className="bg-warning-soft text-warning flex size-10 shrink-0 items-center justify-center rounded-md">
              <TriangleAlertIcon className="size-5" />
            </div>
            <div className="space-y-2 text-sm">
              <p className="font-semibold">
                {inUse.join(' · ')}가 {title}을 쓰고 있습니다
              </p>
              <p className="text-fg-muted">
                이미 응시한 학생이 있다면 그 문항은 지금 버전의 쪽 번호와 개념으로 만들어졌습니다.
              </p>
              <p className="text-fg-muted">
                다시 분석하면 섹션이 합쳐지거나 쪽 번호가 달라질 수 있습니다. 그러면 이미 발행된
                리포트의 교안 위치가 실제와 어긋납니다.
              </p>
              <p className="text-fg font-medium">
                이미 응시한 학생의 문항과 리포트는 그대로 둡니다 — 분석 결과는 다음에 만드는
                회차부터 적용됩니다.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-fg-muted text-sm">
            이 교안을 쓰는 회차 중 응시가 시작된 것이 없어 발행된 리포트에 영향이 없습니다. 분석이
            끝나면 <b className="text-fg font-medium">가르친 항목</b>이 새로 만들어집니다.
          </p>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={running}>
            취소
          </Button>
          <Button disabled={running} onClick={run}>
            {running && <Spinner className="size-3.5" />}
            {inUse.length > 0 ? '그래도 다시 분석' : '다시 분석'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
