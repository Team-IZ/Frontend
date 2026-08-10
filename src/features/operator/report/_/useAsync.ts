import { useEffect, useState } from 'react'

/**
 * 비동기 조회 한 건 — 로딩·실패·재조회.
 *
 * `projects/useAsync.ts`와 같은 훅이다. 도메인 경계상(`features/A`는 `features/B`를
 * 모른다) import로 공유하지 못해 여기 다시 둔다 — 세 번째 도메인에서도 필요해지면
 * 그때 `lib/`로 올린다(architecture §7).
 */
export function useAsync<T>(load: () => Promise<T>, enabled = true) {
  const [data, setData] = useState<T>()
  const [loading, setLoading] = useState(enabled)
  /*
    **실패를 boolean으로만 들고 있으면 화면이 이유를 말할 수 없다.** `errorCopy`가
    `status`·코드를 봐야 "아직 발행 전"과 "서버 문제"를 가른다(async-states §3-1).
    이 훅은 react-query로 옮길 때 사라진다(async-states-plan 6단계).
  */
  const [error, setError] = useState<unknown>()
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!enabled) return
    let alive = true
    setLoading(true)
    setError(undefined)
    load()
      .then((v) => {
        if (alive) setData(v)
      })
      .catch((e) => {
        if (alive) setError(e)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [load, attempt, enabled])

  return {
    data,
    loading,
    failed: error !== undefined,
    error,
    reload: () => setAttempt((n) => n + 1),
  }
}
