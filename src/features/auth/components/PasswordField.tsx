import { forwardRef, useState } from 'react'
import type { FocusEvent, InputHTMLAttributes, KeyboardEvent } from 'react'

import { Kbd } from '@/components/ui/kbd'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
  error?: string
}

/**
 * SC-A01 §4 · PasswordField (표시 토글 + Caps Lock 경고)
 *
 * Caps Lock이 켜진 줄 모르고 입력해 로그인에 실패하는 것은 흔한 사고인데, 값이
 * 가려져 있어 화면만 봐서는 원인을 알 수 없다. 실패 후 "비밀번호를 확인해주세요"를
 * 보여주는 것보다 **입력하는 중에** 알려주는 편이 낫다.
 *
 * 수식키 상태는 키 이벤트에서만 읽을 수 있다(focus 이벤트에는 없다). 그래서
 * 포커스만 한 상태에서는 아직 뜨지 않고, 첫 키를 누르는 순간부터 판정된다.
 */
const PasswordField = forwardRef<HTMLInputElement, Props>(function PasswordField(
  { label, error, autoComplete = 'current-password', onKeyUp, onKeyDown, onBlur, ...rest },
  ref,
) {
  const [show, setShow] = useState(false)
  const [capsLock, setCapsLock] = useState(false)

  function detect(event: KeyboardEvent<HTMLInputElement>) {
    setCapsLock(event.getModifierState('CapsLock'))
  }

  return (
    <div>
      <label className="block text-[13px] font-medium text-fg-muted">{label}</label>
      <div className="relative mt-1.5">
        <input
          ref={ref}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          required
          className="w-full rounded-md border border-border-strong px-3.5 py-2.5 pr-14 text-sm text-fg outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft disabled:bg-canvas disabled:text-fg-subtle"
          // 누를 때(대문자로 들어가기 시작)와 뗄 때(그 키가 Caps Lock 자신인 경우) 모두 본다
          onKeyDown={(event) => {
            detect(event)
            onKeyDown?.(event)
          }}
          onKeyUp={(event) => {
            detect(event)
            onKeyUp?.(event)
          }}
          // 필드를 떠나면 경고를 남겨두지 않는다 — 그 자리에서만 의미가 있는 안내다
          onBlur={(event: FocusEvent<HTMLInputElement>) => {
            setCapsLock(false)
            onBlur?.(event)
          }}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          disabled={rest.disabled}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-fg-subtle hover:text-fg-muted disabled:opacity-50"
        >
          {show ? '숨김' : '표시'}
        </button>
      </div>
      {/* role=status — 값이 가려진 필드라 화면을 못 보는 사용자에게도 읽혀야 한다 */}
      {capsLock && (
        <p role="status" className="mt-1.5 flex items-center gap-1.5 text-[12px] text-warning">
          <Kbd>⇪ Caps Lock</Kbd> 켜짐 — 대문자로 입력됩니다.
        </p>
      )}
      {error && <p className="mt-1.5 text-[12px] text-danger">{error}</p>}
    </div>
  )
})

export default PasswordField
