import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

export type AuthStatusVariant = 'info' | 'warning' | 'danger' | 'success'

const ICON_VARIANT_CLASS: Record<AuthStatusVariant, string> = {
  info: 'bg-info-soft text-info',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  success: 'bg-success-soft text-success',
}

interface Props {
  variant: AuthStatusVariant
  icon: ReactNode
  title: string
  description: ReactNode
  aux?: ReactNode
  actions: ReactNode
}

/**
 * signup-activation.html / password-reset.html `.scard` — 폼을 통째로 대체하는
 * 상태 화면(만료·위변조·완료 등) 전용 카드. 필드 아래 인라인 에러에는 쓰지 않는다.
 */
export default function AuthStatusCard({ variant, icon, title, description, aux, actions }: Props) {
  return (
    <div className="mx-auto w-full max-w-[460px] text-center">
      <div
        className={cn(
          'mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[15px] text-xl',
          ICON_VARIANT_CLASS[variant],
        )}
      >
        {icon}
      </div>
      <h3 className="text-base font-bold text-fg">{title}</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">{description}</p>
      {aux && <p className="mt-3 text-xs leading-relaxed text-fg-subtle">{aux}</p>}
      <div className="mt-5 flex justify-center gap-2">{actions}</div>
    </div>
  )
}
