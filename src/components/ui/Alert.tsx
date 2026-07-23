import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils/cn'

/*
  변형 이름을 Badge와 1:1로 맞췄다. 같은 뜻(주의·위험·정보)에 컴포넌트마다 다른 이름이
  붙으면 무엇이 같은 상태인지 코드에서 안 보인다 — Badge.tsx가 같은 이유로 이 어휘를 쓴다.

  shadcn 기본값은 `default`/`destructive` 둘뿐이고 둘 다 배경이 카드 색이다. 우리 와이어의
  배너는 **의미 색 soft 배경 + 같은 계열 테두리**라(SC-A01 InlineAlert, SC-S01 사용량 경고 등)
  기본값 그대로는 쓸 수 없었다.

  여백·반경은 InlineAlert 실측값(px-4 py-3 · radius-md)에 맞춘다.
*/
const alertVariants = cva(
  "group/alert relative grid w-full gap-0.5 rounded-md border px-4 py-3 text-left text-sm has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        /** 정상·활성·회복 */
        success: 'bg-success-soft text-success border-success-border',
        /** 주의·표본 부족·미검증·일시 잠금 */
        warning: 'bg-warning-soft text-warning border-warning-border',
        /** 위험·차단·에러 */
        danger: 'bg-danger-soft text-danger border-danger-border',
        /** 정보·안내 */
        info: 'bg-info-soft text-info border-info-border',
        /** 의미 색이 아닌 안내. 카드 면 위에 얹는다 */
        neutral: 'bg-surface-2 text-fg-muted border-border',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  },
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        'font-medium group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground',
        className,
      )}
      {...props}
    />
  )
}

function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        'text-sm text-balance text-muted-foreground md:text-pretty [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4',
        className,
      )}
      {...props}
    />
  )
}

function AlertAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="alert-action" className={cn('absolute top-2 right-2', className)} {...props} />
  )
}

export { Alert, AlertTitle, AlertDescription, AlertAction }
