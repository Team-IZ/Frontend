import { useState, type FocusEvent, type KeyboardEvent } from 'react'

/**
 * Caps Lock이 켜진 채 비밀번호를 입력해도 값이 가려져 있어 화면만 봐선 원인을 알 수 없다.
 * 로그인 실패 후 안내하는 것보다 입력 중에 알려주는 편이 낫다. 수식키 상태는 키 이벤트에서만
 * 읽혀 첫 키를 누르는 순간부터 판정되고, 필드를 떠나면 그 자리에서만 의미 있는 경고라 지운다.
 */
export function useCapsLockWarning() {
  const [capsLock, setCapsLock] = useState(false)

  function detect(event: KeyboardEvent<HTMLInputElement>) {
    setCapsLock(event.getModifierState('CapsLock'))
  }

  function reset(_event: FocusEvent<HTMLInputElement>) {
    setCapsLock(false)
  }

  return { capsLock, onKeyDown: detect, onKeyUp: detect, onBlur: reset }
}
