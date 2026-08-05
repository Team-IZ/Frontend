import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

export type StatusMessageVariant = 'default' | 'info' | 'warning' | 'danger' | 'success'

const ICON_VARIANT_CLASS: Record<StatusMessageVariant, string> = {
  /** 알리기만 하고 경고 톤이 필요 없는 진행 안내(예: "다음 문제로 갈게요") */
  default: 'bg-primary-soft text-primary',
  info: 'bg-info-soft text-info',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  success: 'bg-success-soft text-success',
}

interface Props {
  variant: StatusMessageVariant
  icon: ReactNode
  title: string
  description: ReactNode
  aux?: ReactNode
  actions?: ReactNode
  /** 기본 max-w-[460px]를 넘겨 쓸 자리(예: 옆에 여유 있는 카드 안) — cn이 뒤엣것을 우선한다 */
  className?: string
}

/*
  "아이콘 + 제목 + 설명 + 보조 + 액션" 카드 — 흐름 안에 놓이든 오버레이로 뜨든 배치만
  다르고 생김새는 같다(01-design-checklist.md H+). 폼을 통째로 대체하는 상태 화면
  (만료·위변조·완료·연결 끊김·세션 종료 등) 전용이다 — 필드 아래 인라인 에러에는
  쓰지 않는다.

  원래 features/auth/components/AuthStatusCard.tsx로 auth 2화면(가입·비밀번호 재설정)
  전용이었다 — trainee/session이 똑같은 모양(세션 종료·타임아웃·연결 끊김)을 필요로
  한 시점에 여기로 올렸다(architecture §7 "다른 도메인도 필요해지면 공용으로").
*/
export default function StatusMessageCard({
  variant,
  icon,
  title,
  description,
  aux,
  actions,
  className,
}: Props) {
  return (
    <div className={cn('mx-auto w-full max-w-[460px] text-center', className)}>
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
      {actions && <div className="mt-5 flex justify-center gap-2">{actions}</div>}
    </div>
  )
}
