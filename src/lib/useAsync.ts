import { useEffect, useState } from 'react'

/**
 * 비동기 조회 한 건 — 로딩·실패·재조회.
 *
 * `alive` 플래그가 핵심이다. 필터를 빠르게 바꾸면 **먼저 보낸 요청이 나중에 도착**할 수
 * 있는데, 그대로 두면 방금 지운 필터의 결과가 화면에 남는다.
 *
 * **왜 `lib/`인가** — 두 번째 도메인(운영 관리)이 같은 것을 필요로 했다. 한 번은
 * 만들고, 두 번은 기록하고, **세 번째에 올린다**는 규칙의 그 시점이다(decision-log D14).
 * 도메인을 하나도 모르는 순수 훅이라 `components/`가 아니라 여기가 맞다 — `lib/`는
 * `features/*`를 import할 수 없고, 이 파일은 그럴 이유가 없다.
 *
 * ponytail: `features/operator/projects/useAsync.ts`가 같은 코드를 갖고 있다. 지금
 * 합치지 않는 이유는 그 파일을 OP-04 작업이 동시에 건드리고 있어서다 — **그 작업이
 * 머지된 뒤 import만 이 파일로 바꾸고 삭제한다.** 그때까지만 두 벌이다.
 *
 * @param load 매번 새로 만들지 말고 `useCallback`으로 감싸 넘긴다 — 매 렌더마다 새
 *   함수면 이 훅이 무한히 다시 부른다.
 * @param enabled 아직 필요하지 않은 조회를 미룬다. 기본은 `true`.
 *
 *   **마운트됐다고 데이터가 필요한 것은 아니다.** 닫힌 다이얼로그·잠긴 탭은 화면에
 *   붙어 있지만 아무것도 안 그린다 — 그런데도 조회가 나가면 사용자가 열어보지도 않은
 *   것 때문에 요청이 생긴다(실측: 탭 하나 진입에 조회 8건 중 5건이 이것이었다).
 *
 *   조건부 렌더(`{open && <Dialog/>}`)로도 막히지만, 그러면 닫힘 애니메이션과 폼
 *   상태가 같이 사라진다. **컴포넌트는 두고 조회만 늦추는 것**이 정확하다.
 */
export function useAsync<T>(load: () => Promise<T>, enabled = true) {
  const [data, setData] = useState<T>()
  /** 조회를 미룬 동안은 로딩이 아니다 — 스피너가 열지도 않은 다이얼로그에서 돌면 안 된다 */
  const [loading, setLoading] = useState(enabled)
  const [failed, setFailed] = useState(false)
  /** 같은 조건으로 다시 부르기 위한 값. 생성 후·재시도에 쓴다 */
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
