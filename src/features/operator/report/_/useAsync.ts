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
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!enabled) return
    let alive = true
    setLoading(true)
    setFailed(false)
    load()
      .then((v) => {
        if (alive) setData(v)
      })
      .catch(() => {
        if (alive) setFailed(true)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [load, attempt, enabled])

  return { data, loading, failed, reload: () => setAttempt((n) => n + 1) }
}
