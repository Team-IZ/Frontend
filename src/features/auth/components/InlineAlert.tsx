import type { ReactNode } from 'react'

export type AlertVariant = 'danger' | 'warning' | 'info'

/** SC-A01 §4 · 폼 상단 상태 알림 (variant: danger/warning/info) */
const STYLES: Record<AlertVariant, string> = {
  danger: 'bg-danger-soft text-danger border-danger-border',
  warning: 'bg-warning-soft text-warning border-warning-border',
  info: 'bg-info-soft text-info border-info-border',
}

export default function InlineAlert({
  variant,
  children,
}: {
  variant: AlertVariant
  children: ReactNode
}) {
  return (
    <div role="alert" className={`rounded-md border px-4 py-3 text-[13px] ${STYLES[variant]}`}>
      {children}
    </div>
  )
}
