import { useEffect, useRef, useState } from 'react'

/**
 * 마감까지 남은 ms — 1초마다 갱신한다. 0에 닿으면 `onExpire`를 **한 번만** 부른다 —
 * 주기적으로 서버를 다시 묻는(폴링) 것이 아니라 화면을 띄워 둔 채로 창이 닫히는
 * 그 순간에 한 번 재조회를 트리거하는 용도다(TR-01 §6 "학생이 상태를 폴링하지 않게").
 *
 * `now`를 주입할 수 있게 한 이유 — api-boundary.md §2-3: "화면은 now를 주입받아
 * 테스트 가능해야 한다." 기본값은 실제 시계다.
 */
export function useCountdown(
  deadlineIso: string,
  onExpire?: () => void,
  now: () => number = Date.now,
) {
  const [remainingMs, setRemainingMs] = useState(() => new Date(deadlineIso).getTime() - now())
  const expiredRef = useRef(false)
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire

  useEffect(() => {
    expiredRef.current = false
    const tick = () => {
      const next = new Date(deadlineIso).getTime() - now()
      setRemainingMs(next)
      if (next <= 0 && !expiredRef.current) {
        expiredRef.current = true
        onExpireRef.current?.()
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [deadlineIso, now])

  return Math.max(0, remainingMs)
}
