import { useCallback, useEffect, useReducer } from 'react'
import { initialState, reduce, type DemoAction, type DemoState } from './engine.ts'

/*
  세 화면(홈·세션·리포트)이 같은 결과를 본다. 그 결과를 어디에 두나.

  **전역 스토어를 새로 만들지 않는다.** `sessionStorage` 한 칸이면 된다 —
  새로고침해도 살아남고(시연 중 실수로 F5를 눌러도 안 날아간다), 브라우저를 닫으면
  사라져서 시연 뒤에 치울 것이 없다. `localStorage`를 쓰면 다음 시연 때 지난 결과가
  남아 있어 "왜 이미 답이 차 있지"가 된다.

  ⚠️ **`useReducer`가 진짜 상태고 저장소는 사본이다.** 한 탭 안에서 화면을 오갈 때는
  마운트할 때 한 번 읽어 오면 되고, 두 탭을 동시에 여는 시나리오는 시연에 없다.
*/
const KEY = 'iz-demo-session'

function load(): DemoState {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as DemoState) : initialState()
  } catch {
    /*
      저장된 값이 낡았거나(엔진을 고쳤다) 깨졌으면 처음부터 시작한다. 시연 중에 화면이
      터지는 것보다 안내 화면으로 돌아가는 편이 낫다 — 거기서 다시 시작하면 된다.
    */
    return initialState()
  }
}

export function useDemoSession() {
  const [state, dispatch] = useReducer(reduce, undefined, load)

  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      // 저장에 실패해도 이번 세션은 메모리로 계속 돈다 — 새로고침만 못 버틴다
    }
  }, [state])

  const send = useCallback((a: DemoAction) => dispatch(a), [])

  const reset = useCallback(() => {
    sessionStorage.removeItem(KEY)
    dispatch({ type: 'RESET' })
  }, [])

  return { state, send, reset }
}
