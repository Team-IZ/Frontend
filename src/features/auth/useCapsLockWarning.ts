import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react'

/**
 * Caps Lock이 켜진 채 비밀번호를 입력해도 값이 가려져 있어 화면만 봐선 원인을 알 수 없다.
 * 로그인 실패 후 안내하는 것보다 입력 중에 알려주는 편이 낫다. 수식키 상태는 키 이벤트에서만
 * 읽혀 첫 키를 누르는 순간부터 판정되고, 필드를 떠나면 그 자리에서만 의미 있는 경고라 지운다.
 *
 * 필드 안에서 누른 키만으로는 **재포커스**를 못 잡는다 — Caps Lock을 켠 채 필드를 벗어났다
 * 돌아오면, 안에서 키를 다시 누르기 전까지 경고가 안 뜬다(실제 키보드로 재현·확인됨).
 * `window` 레벨로 키 이벤트를 계속 들어 "마지막으로 알려진 상태"를 필드 밖에서도 갱신해 두고,
 * `onFocus`에서 그 값을 그대로 꽂는다 — `FocusEvent`엔 `getModifierState`가 없어 포커스
 * 시점에 직접 물을 수 없기 때문이다.
 */
export function useCapsLockWarning() {
  const [capsLock, setCapsLock] = useState(false)
  const lastKnown = useRef(false)

  useEffect(() => {
    const track = (event: globalThis.KeyboardEvent) => {
      lastKnown.current = event.getModifierState('CapsLock')
    }
    window.addEventListener('keydown', track)
    window.addEventListener('keyup', track)
    return () => {
      window.removeEventListener('keydown', track)
      window.removeEventListener('keyup', track)
    }
  }, [])

  function detect(event: KeyboardEvent<HTMLInputElement>) {
    const capsOn = event.getModifierState('CapsLock')
    lastKnown.current = capsOn
    setCapsLock(capsOn)
  }

  function focus(_event: FocusEvent<HTMLInputElement>) {
    setCapsLock(lastKnown.current)
  }

  function reset(_event: FocusEvent<HTMLInputElement>) {
    setCapsLock(false)
  }

  return { capsLock, onKeyDown: detect, onKeyUp: detect, onFocus: focus, onBlur: reset }
}
