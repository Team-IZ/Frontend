import { useEffect, useState } from 'react'

/**
 * 비동기 조회 한 건 — 로딩·실패·재조회.
 *
 * **화면 파일에서 뺀 이유는 재사용이 아니라 책임이다.** 화면은 "무엇을 그리나"를
 * 담당하고, 데이터 조회 원시 도구를 같이 정의하면 한 파일이 두 층을 갖는다.
 * 목록·상세가 둘 다 쓰므로 위치도 두 화면의 공통 조상(`projects/`)이다.
 *
 * `alive` 플래그가 핵심이다. 필터를 빠르게 바꾸면 **먼저 보낸 요청이 나중에 도착**할 수
 * 있는데, 그대로 두면 방금 지운 필터의 결과가 화면에 남는다.
 *
 * @param load 매번 새로 만들지 말고 `useCallback`으로 감싸 넘긴다 — 매 렌더마다 새
 *   함수면 이 훅이 무한히 다시 부른다.
 */
export function useAsync<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T>()
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  /** 같은 조건으로 다시 부르기 위한 값. 생성 후·재시도에 쓴다 */
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
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
  }, [load, attempt])

  return { data, loading, failed, reload: () => setAttempt((n) => n + 1) }
}
