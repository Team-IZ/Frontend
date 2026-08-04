import { Button } from '@/components/ui/Button'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import { Spinner } from '@/components/ui/Spinner'

/*
  조회 중·실패 두 상태. **탭 다섯이 같은 모양을 반복하므로 여기서 한 번만 조립한다.**

  빈 상태는 여기 없다. 「없는 것」은 세 종류이고(02-layout §4) 그중 **`없음`과 `아직`은
  문구가 화면마다 다르다** — `면담 대상 0명`(좋은 소식)과 `아직 결과가 없어요`(기다려야
  함)를 같은 컴포넌트로 만들면 그 구분이 사라진다. 각 탭이 직접 쓴다.
*/

/**
 * Spinner가 이미 `role="status"`를 갖는다 — 래퍼에 또 붙이면 라이브 리전이 중첩된다.
 * 기본 aria-label이 영문("Loading")이라 화면 언어에 맞춰 덮어쓴다.
 */
export function Loading({ label }: { label: string }) {
  return (
    <div className="flex justify-center py-16">
      <Spinner className="size-6" aria-label={label} />
    </div>
  )
}

/**
 * 못 가져온 것 — 빈 상태 3종 중 **유형 3 `실패`**다(02-layout §4). `없음`(0건)과 달리
 * 사용자가 할 일이 있으므로 **다시 시도**를 같이 둔다.
 */
export function LoadFailed({ label, onRetry }: { label: string; onRetry: () => void }) {
  return (
    <Empty className="bg-danger-soft border-danger-border border-solid">
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
