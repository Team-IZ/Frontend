import { Button } from '@/components/ui/Button'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import { Spinner } from '@/components/ui/Spinner'

/*
  조회 중·실패 두 상태 — `admin/_/components/AsyncState.tsx`와 같은 이유로 여기 둔다
  (탭·섹션이 여럿이라 반복된다. 도메인 경계상 import로 공유하지 못한다).
*/
export function Loading({ label }: { label: string }) {
  return (
    <div className="flex justify-center py-16">
      <Spinner className="size-6" aria-label={label} />
    </div>
  )
}

export function LoadFailed({ label, onRetry }: { label: string; onRetry: () => void }) {
  return (
    <Empty variant="failed">
      <EmptyHeader>
        <EmptyTitle>{label}</EmptyTitle>
        <EmptyDescription>잠시 후 다시 시도해 주세요.</EmptyDescription>
      </EmptyHeader>
      <Button variant="ghost" onClick={onRetry}>
        다시 시도
      </Button>
    </Empty>
  )
}
