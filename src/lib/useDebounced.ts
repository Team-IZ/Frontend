import { useEffect, useState } from 'react'

/**
 * 검색어가 **멈춘 뒤에만** 따라오는 사본.
 *
 * 입력값이 곧 조회 키인 자리에 쓴다. 그대로 두면 한 글자마다 요청이 나간다 — 실측:
 * `"김민준"` 세 글자에 조회 3건, 한글은 자모가 조합되는 중에도 `input`이 떠서 실제로는
 * 더 나간다.
 *
 * ```tsx
 * const [search, setSearch] = useState('')
 * const query = useDebounced(search)                  // 조회는 이 값으로
 * <SearchBox value={search} onChange={setSearch} />   // 입력은 원본으로
 * ```
 *
 * **입력값과 조회값을 가르는 것이 핵심이다.** 입력칸이 `query`를 보면 타이핑이 끊긴다.
 *
 * `useAsync`의 `alive` 플래그가 **늦게 도착한 응답**은 이미 막고 있다. 이 훅이 막는 것은
 * 그 앞 — **요청 자체가 나가는 것**이다. 둘은 다른 문제다.
 *
 * 문자열만 받는다. 검색어 말고 쓸 자리가 아직 없어서 일반화하지 않았다 — 지우기를
 * 즉시 반영하는 아래 규칙이 **"빈 문자열 = 지웠다"** 라는 뜻에 기대고 있기도 하다.
 *
 * @param delay 멈춘 뒤 기다릴 밀리초. 기본 300 — 타이핑을 멈췄다고 볼 만하면서
 *   결과를 기다린다고 느끼기 전이다.
 */
export function useDebounced(value: string, delay = 300): string {
  const [settled, setSettled] = useState(value)

  useEffect(() => {
    /*
      **지우는 것은 기다리지 않는다.** `필터 해제`가 검색어와 다른 필터를 같이 비우는데,
      검색어만 늦게 따라오면 **조회가 두 번 나간다** — 먼저 `(옛 검색어 + 새 필터)`로
      한 번, 300ms 뒤 `(빈 검색어 + 새 필터)`로 또 한 번. 디바운스가 오히려 요청을 늘린다.

      의도로 봐도 같다 — 다 지웠으면 전체 목록을 지금 보고 싶은 것이지 기다릴 이유가 없다.
    */
    if (value === '') {
      setSettled('')
      return
    }
    const timer = setTimeout(() => setSettled(value), delay)
    // 값이 또 바뀌면 이전 예약을 버린다 — 이래서 마지막 입력만 살아남는다
    return () => clearTimeout(timer)
  }, [value, delay])

  return settled
}
