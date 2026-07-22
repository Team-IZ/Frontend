interface Props {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
  disabled?: boolean
  autoComplete?: string
}

/** SC-A01 §4 · TextField (type=email, required) */
export default function TextField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  disabled,
  autoComplete,
}: Props) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-fg-muted">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        required
        className="mt-1.5 w-full rounded-md border border-border-strong px-3.5 py-2.5 text-sm text-fg outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft disabled:bg-canvas disabled:text-fg-subtle"
      />
    </div>
  )
}
