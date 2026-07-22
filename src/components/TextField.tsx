import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

/** SC-A01 §4 · TextField (type=email, required) */
const TextField = forwardRef<HTMLInputElement, Props>(function TextField(
  { label, error, ...rest },
  ref,
) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-fg-muted">{label}</label>
      <input
        ref={ref}
        required
        className="mt-1.5 w-full rounded-md border border-border-strong px-3.5 py-2.5 text-sm text-fg outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft disabled:bg-canvas disabled:text-fg-subtle"
        {...rest}
      />
      {error && <p className="mt-1.5 text-[12px] text-danger">{error}</p>}
    </div>
  )
})

export default TextField
