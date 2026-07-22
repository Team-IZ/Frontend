import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  loading?: boolean
  loadingText?: string
  disabled?: boolean
  type?: 'button' | 'submit'
}

/** SC-A01 §4 · PrimaryButton (전체 폭 · 로딩 상태 포함) */
export default function PrimaryButton({
  children,
  loading,
  loadingText = '처리 중…',
  disabled,
  type = 'submit',
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? loadingText : children}
    </button>
  )
}
