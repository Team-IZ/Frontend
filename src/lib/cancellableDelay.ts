/**
 * 실제 요청을 보내기 **전에** 두는 짧은 유예시간.
 *
 * D38(`docs/dev/decision-log.md`)이 내린 결론 — "AbortController 취소는 서버가 이미 받은
 * 요청을 못 막는다" — 은 여전히 맞다. 하지만 그 결론이 놓친 자리가 있다: 요청을 **보내기
 * 전**이라면 얘기가 다르다. 이 유예시간 안에 `signal`이 abort되면 `fetch` 자체가 안
 * 나간다 — 이 창 안에서는 서버 이펙트(DB 쓰기·메일 발송)가 100% 확정적으로 없다.
 *
 * ```ts
 * const controller = new AbortController()
 * await delay(SUBMIT_GRACE_MS, controller.signal) // 여기서 닫으면 아래 fetch 자체가 안 나감
 * await registerTrainees({ ..., signal: controller.signal })
 * ```
 *
 * D40 참고.
 */
export function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'))
      return
    }
    const timer = setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(signal.reason ?? new DOMException('Aborted', 'AbortError'))
      },
      { once: true },
    )
  })
}
