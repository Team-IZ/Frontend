import { useState } from 'react'

interface Props {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  /** 로그인은 current-password, 가입·활성화는 new-password */
  autoComplete?: string
}

/** SC-A01 §4 · PasswordField (표시 토글) */
export default function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  autoComplete = 'current-password',
}: Props) {
  const [show, setShow] = useState(false)

  return (
    <div>
      <label className="block text-[13px] font-medium text-fg-muted">{label}</label>
      <div className="relative mt-1.5">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          required
          className="w-full rounded-md border border-border-strong px-3.5 py-2.5 pr-14 text-sm text-fg outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft disabled:bg-canvas disabled:text-fg-subtle"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          disabled={disabled}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-fg-subtle hover:text-fg-muted disabled:opacity-50"
        >
          {show ? '숨김' : '표시'}
        </button>
      </div>
    </div>
  )
}
