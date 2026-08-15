import { useState } from 'react'
import { errorCopy } from '@/lib/errorCopy'
import { isApiError, isGenericCode } from '@/api/_contract'

/*
  행 액션·모드 액션의 결과 — 배너(`_/components/ResultBanner`)가 그린다.

  **컴포넌트 파일에서 뺀 이유는 Fast Refresh다.** 한 파일이 컴포넌트와 훅을 같이
  export하면 그 파일에 상태 보존 핫리로드가 안 걸린다(`react/only-export-components` —
  `filterState.ts`를 가른 것과 같은 이유).
*/

/** 배너에 띄울 결과 한 건. 성공·실패가 같은 자리를 쓰므로 상태도 하나다 */
export type ActionResult = { text: string; failed?: boolean; retry?: () => void }

/**
 * 액션 하나를 실행하고 결과를 배너로 보낸다.
 *
 * **화면마다 `try/catch`를 반복하지 않으려고 둔다.** 실패를 화면에 못 그리는 자리가
 * 여덟 곳이었는데 원인은 전부 같았다 — `await`만 하고 실패 경로를 안 쓴 것. 여기를
 * 통과시키면 **성공 문구만 쓰면 되고 실패는 자동으로 잡힌다.**
 *
 * `run`은 실패해도 **throw하지 않는다** — 호출부가 다시 `catch`를 쓸 이유가 없다.
 * 성공하면 값을, 실패하면 `undefined`를 준다.
 */
export function useActionResult() {
  const [result, setResult] = useState<ActionResult | null>(null)

  /**
   * @param action 실행할 일
   * @param onDone 성공했을 때 띄울 문구. 결과값을 받아 문장을 만든다
   * @param failText 실패했을 때 띄울 문구 — **무엇이 안 됐는지**를 쓴다.
   *   서버가 아는 코드로 답하면 그 문구가 이기고 이 값은 밑줄로 내려간다
   * @param subject 실패 문구가 대상 이름을 쓸 때 — `교육생` · `반`
   */
  const run = async <T>(
    action: () => Promise<T>,
    onDone: (value: T) => string,
    failText: string,
    subject = '요청',
  ): Promise<T | undefined> => {
    try {
      const value = await action()
      setResult({ text: onDone(value) })
      return value
    } catch (e) {
      /*
        ⚠ **원인을 버리지 않는다.** 한때 `catch {}`로 묶고 `failText` 하나를 띄우면서
        **재시도 버튼을 늘 달았다.** 그런데 서버가 거절하는 이유의 상당수는 다시 눌러도
        똑같다 — `TRAINEE_STATUS_NOT_MUTABLE`(초대 대기라 못 바꾼다),
        `TRAINEE_NOT_IN_COHORT`(비활성 계정이 섞였다). **버튼이 「다시 하면 된다」는
        거짓 약속**이 된다.

        `errorCopy`가 코드를 아는 실패면 그 문구를 쓰고, **`retry`가 참일 때만** 버튼을
        붙인다. 모르는 실패는 원래 `failText`로 떨어진다.
      */
      /** 서버가 **도메인 코드**로 답했나 — 그때만 그 문구가 `failText`를 이긴다 */
      const known = isApiError(e) && !isGenericCode(e.code)
      const copy = errorCopy(e, { subject })
      const text = known ? `${copy.title} — ${copy.description}` : failText
      setResult({
        text,
        failed: true,
        retry: copy.retry ? () => void run(action, onDone, failText, subject) : undefined,
      })
      return undefined
    }
  }

  return { result, setResult, run, dismiss: () => setResult(null) }
}
