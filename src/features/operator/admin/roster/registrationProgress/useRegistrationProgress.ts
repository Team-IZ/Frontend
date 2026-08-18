import { useEffect, useState } from 'react'
import { getRegistrationProgress } from './api'
import type { RegistrationProgress } from './types'

type Params = {
  cohortId: string
  batchRequestId: string
  /** 폴링 자체를 끈다 — 다이얼로그가 닫혔거나 아직 batchRequestId가 없을 때. 기본 true */
  enabled?: boolean
  /**
   * 폴링 간격(ms).
   *
   * ⚠ estimated — 백엔드가 권장 간격을 준 적이 없다. "100명 단위 배치로 순차 처리"만
   * 아는 상태라, 너무 촘촘하면 의미 없는 요청만 늘고 너무 길면 완료를 늦게 안다 —
   * 계획 없이 임시로 잡은 값이다(이슈 "하지 않는 것" 참고. 실제 정책은 백엔드 스펙과
   * 함께 다시 정한다).
   */
  intervalMs?: number
}

const DEFAULT_INTERVAL_MS = 2000

/**
 * 배치 등록 진행 상태를 간격을 두고 반복 조회한다.
 *
 * **`setInterval`이 아니라 재귀 `setTimeout`을 쓴다.** 응답이 간격보다 오래 걸리면
 * `setInterval`은 요청을 겹쳐 보낸다 — 여기서는 이전 응답을 받은 뒤에만 다음 요청을
 * 예약해 항상 하나만 떠 있게 한다.
 *
 * **완료되면 스스로 멈춘다.** `status === 'COMPLETED'`가 되면 더 이상 예약하지 않는다
 * — 사용자가 다이얼로그를 계속 열어 둬도 끝난 배치를 영원히 두드리지 않는다.
 *
 * **언마운트 · `enabled=false`에서 즉시 멈춘다.** `alive` 플래그(`lib/useAsync.ts`와
 * 같은 패턴)만으로는 부족하다 — 이미 예약된 `setTimeout`이 살아 있는 동안 응답을
 * 버리기만 하고 다음 요청을 계속 내보낸다. 그래서 타이머 자체를 `clearTimeout`으로
 * 지운다. 다이얼로그를 열고 닫기를 반복해도 닫힌 다이얼로그의 폴링이 뒤에 남지
 * 않는 것이 완료 조건이다(이슈 224).
 *
 * 실패해도 폴링을 끊지 않는다 — 한 번 튄 응답 때문에 이후 성공 응답을 영영 못 받게
 * 되는 것을 막는다. 대신 `failed`를 켜서 화면이 원하면 표시할 수 있게 한다.
 */
export function useRegistrationProgress({
  cohortId,
  batchRequestId,
  enabled = true,
  intervalMs = DEFAULT_INTERVAL_MS,
}: Params) {
  const [progress, setProgress] = useState<RegistrationProgress>()
  const [loading, setLoading] = useState(enabled)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }

    let alive = true
    let timer: ReturnType<typeof setTimeout> | undefined

    const tick = () => {
      getRegistrationProgress({ cohortId, batchRequestId })
        .then((next) => {
          if (!alive) return
          setProgress(next)
          setFailed(false)
          if (next.status !== 'COMPLETED') {
            timer = setTimeout(tick, intervalMs)
          }
        })
        .catch(() => {
          if (!alive) return
          setFailed(true)
          timer = setTimeout(tick, intervalMs)
        })
        .finally(() => {
          if (alive) setLoading(false)
        })
    }

    setLoading(true)
    tick()

    return () => {
      alive = false
      if (timer) clearTimeout(timer)
    }
  }, [cohortId, batchRequestId, enabled, intervalMs])

  return { progress, loading, failed }
}
