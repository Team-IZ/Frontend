import { forwardRef, useState } from 'react'
import type { InputHTMLAttributes } from 'react'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
  error?: string
}

/** SC-A01 §4 · PasswordField (표시 토글) */
const PasswordField = forwardRef<HTMLInputElement, Props>(function PasswordField(
  { label, error, autoComplete = 'current-password', ...rest },
  ref,
) {
  const [show, setShow] = useState(false)

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
      {error && <p className="mt-1.5 text-[12px] text-danger">{error}</p>}
    </div>
  )
})

export default PasswordField
