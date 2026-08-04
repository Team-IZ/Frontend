import type { ReactNode } from 'react'
import { CheckIcon, TriangleAlertIcon, XIcon } from 'lucide-react'
import { Alert, AlertTitle } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'

/*
  방금 한 일의 결과 — 목업 배정 모드의 `✓ 2명을 F반에 넣었어요 — 한도현 · 정하늘 [되돌리기] ✕`.

  **토스트가 아니라 흐름 안 배너다**(01-design-checklist H+ 「어느 배치를 쓰나」).
  토스트는 *알리되 막지 않는* 자리이고 몇 초 뒤 사라지는데, 되돌리기는 **사라지면 안 되는
  액션**이다 — 잘못 넣은 25명을 손으로 빼야 하는 상황이 그때 생긴다. 사용자가 직접
  닫거나 다음 작업을 할 때까지 남는다.

  **이름을 적는다.** `2명`만 쓰면 누구를 되돌리는지 모른 채 누르게 된다(OP-06 §3).

  **성공과 실패가 같은 컴포넌트다.** 둘 다 *"방금 누른 것이 어떻게 됐나"* 이고 같은 자리에
  나타난다 — H+가 *"아이콘 + 제목 + 액션 카드는 전부 같은 컴포넌트다. 클래스를 나누면
  폭·아이콘 크기·여백이 화면마다 어긋난다"* 고 한 그대로다. 바뀌는 것은 **톤과 액션 라벨**뿐.

  전역 Toaster를 붙이지 않은 이유도 같다 — 목업 어디에도 토스트가 없고, 지금 필요한
  자리는 전부 "그 화면 안에서 결과를 보여주는" 형태다.
*/
type Props = {
  children: ReactNode
  /** 실패를 알릴 때. 아이콘·색이 바뀐다 */
  failed?: boolean
  /** 되돌리기(성공). 되돌릴 수 없는 일에는 넘기지 않는다 */
  onUndo?: () => void
  /** 다시 시도(실패). **실패에는 다음 행동이 있어야 한다** */
  onRetry?: () => void
  onDismiss: () => void
}

export default function ResultBanner({ children, failed, onUndo, onRetry, onDismiss }: Props) {
  return (
    <Alert variant={failed ? 'danger' : 'success'} className="mb-3 flex items-center gap-2">
      {failed ? <TriangleAlertIcon /> : <CheckIcon />}
      <AlertTitle className="flex-1">{children}</AlertTitle>
      {onUndo && (
        <Button variant="ghost" size="sm" onClick={onUndo}>
          되돌리기
        </Button>
      )}
      {onRetry && (
        <Button variant="ghost" size="sm" onClick={onRetry}>
          다시 시도
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        aria-label="알림 닫기"
        className="border-0 bg-transparent px-1.5"
        onClick={onDismiss}
      >
        <XIcon />
      </Button>
    </Alert>
  )
}
