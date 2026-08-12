import { useEffect, useState } from 'react'
import { Spinner } from '@/components/ui/Spinner'

/*
  **모양을 모르는 것**의 로딩. 표·목록처럼 형태가 정해진 것은 `TableSkeleton`을 쓴다 —
  스피너는 "기다려"만 말하고 스켈레톤은 "이런 것이 올 것이다"까지 말한다(async-states §1-2).

  남는 자리는 응답에 따라 구조가 갈리는 것(모달 안 목록·비용 매트릭스)과 화면 전체 조회다.

  `admin/_/components/AsyncState.tsx`와 `report/_/components/AsyncState.tsx`가 같은 것을
  두 벌 갖고 있었고 화면 넷이 또 인라인으로 적고 있었다 — 세 번째를 넘겼으므로 올린다(D14).
*/
/**
 * **오래 걸린다는 사실만** 말하는 것 — 스피너가 없다.
 *
 * 스켈레톤과 같이 쓴다. 스켈레톤이 이미 *"이런 것이 올 것이다"* 를 말하고 있으므로
 * 그 아래에 스피너를 또 두면 **기다리라는 말이 두 번**이고, 화면이 어수선해진다
 * (실측 — 상세 진입에서 스켈레톤 밑에 스피너가 돌고 있었다).
 *
 * 그래도 안내는 필요하다 — 없는 회차는 서버가 404 대신 매달고(18차 R7), 시작 전 회차의
 * 현황도 마찬가지다(R8). 스켈레톤만 있으면 **영원히 곧 올 것처럼** 보인다.
 *
 * @param afterMs 이 시간을 넘기면 뜬다. 기본 12초.
 */
export function SlowNotice({ afterMs = 12000 }: { afterMs?: number }) {
  const slow = useSlow(afterMs)
  if (!slow) return null
  return (
    <p className="text-fg-subtle mt-4 text-center text-xs">
      예상보다 오래 걸립니다. 서버가 깨어나는 중일 수 있습니다 — 조금 더 기다리거나 주소가 맞는지
      확인해 주세요.
    </p>
  )
}

/*
  **끊지 않는 이유** — 서버가 잠들어 있으면 깨어나는 데 **최대 76초**가 걸린다
  (App Runner). 30초에 끊으면 정상적으로 깨어나는 중인 요청을 죽인다. 그래서 끊지 않고
  말한다 — 기다릴지 나갈지는 사용자가 정한다.
*/
function useSlow(afterMs: number) {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    if (!afterMs) return
    const timer = setTimeout(() => setSlow(true), afterMs)
    return () => clearTimeout(timer)
  }, [afterMs])
  return slow
}

/**
 * @param label 무엇을 기다리는지 — 보조 기술이 읽는다
 * @param slowAfterMs 이 시간을 넘기면 **오래 걸린다는 사실 자체를 말한다.**
 *   기본값 12초. 0이면 안 쓴다.
 */
export default function Loading({
  label,
  slowAfterMs = 12000,
}: {
  label: string
  slowAfterMs?: number
}) {
  /*
   **끝나지 않는 스피너를 만들지 않는다.** 없는 회차를 열면 서버가 404가 아니라
   **아무 응답도 주지 않아서**(18차 R7) 화면이 영원히 돌았다.
   */
  const slow = useSlow(slowAfterMs)

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      {/*
        Spinner가 이미 `role="status"`를 갖는다 — 래퍼에 또 붙이면 라이브 리전이 중첩된다.
        기본 aria-label이 영문("Loading")이라 화면 언어에 맞춰 덮어쓴다.
      */}
      <Spinner className="size-6" aria-label={label} />
      {slow && (
        <p className="text-fg-subtle max-w-xs text-center text-xs">
          예상보다 오래 걸립니다. 서버가 깨어나는 중일 수 있습니다 — 조금 더 기다리거나
          <br />
          주소가 맞는지 확인해 주세요.
        </p>
      )}
    </div>
  )
}
