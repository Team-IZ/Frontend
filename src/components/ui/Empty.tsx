import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils/cn'

/*
  「없는 것」은 세 종류다(02-layout §4). **질문 하나로 갈린다 — 사용자가 지금 할 일이 있나.**

      pending `아직`  기다리면 채워진다   점선          문구에 **언제** 채워지는지
      empty   `없음`  만들거나 조건을 푼다 실선          **0건이 무슨 뜻인지** + 그 행동
      failed  `실패`  다시 시도            실선 + danger 다시 시도 버튼

  점선은 "지금은 비었지만 채워질 자리", 실선은 "확정된 면"이라는 뜻이다. 셋을 갈라 쓰지
  않으면 화면이 *"기다리면 됩니다"* 라고 잘못 말한다 — 실제로 운영 관리 열 곳이 전부
  유형 2인데 점선으로 그려지고 있었다(async-states §2-2).

  ⚠ **기본값은 아직 `pending`이다.** 실사용 빈도는 `empty`가 압도적이라 기본값이 그쪽이어야
  맞지만, 이 컴포넌트를 **다른 레포(auth·슈퍼어드민)도 쓴다** — 지금 뒤집으면 그쪽 화면이
  조용히 바뀐다. 양쪽이 `variant`로 옮긴 뒤에 뒤집는다(async-states-plan §3).
*/
const emptyVariants = cva(
  'flex w-full min-w-0 flex-1 flex-col items-center justify-center gap-4 rounded-md border p-6 text-center text-balance',
  {
    variants: {
      variant: {
        pending: 'border-dashed border-border-strong bg-surface-2',
        empty: 'border-solid border-border-strong bg-surface-2',
        failed: 'border-solid border-danger-border bg-danger-soft',
      },
    },
    defaultVariants: { variant: 'pending' },
  },
)

function Empty({
  className,
  variant,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof emptyVariants>) {
  return (
    <div
      data-slot="empty"
      data-variant={variant ?? 'pending'}
      className={cn(emptyVariants({ variant }), className)}
      {...props}
    />
  )
}

function EmptyHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-header"
      className={cn('flex max-w-sm flex-col items-center gap-2', className)}
      {...props}
    />
  )
}

const emptyMediaVariants = cva(
  'mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        icon: "flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground [&_svg:not([class*='size-'])]:size-4",
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function EmptyMedia({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof emptyMediaVariants>) {
  return (
    <div
      data-slot="empty-icon"
      data-variant={variant}
      className={cn(emptyMediaVariants({ variant, className }))}
      {...props}
    />
  )
}

function EmptyTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-title"
      className={cn('font-heading text-sm font-medium tracking-tight', className)}
      {...props}
    />
  )
}

function EmptyDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <div
      data-slot="empty-description"
      className={cn(
        'text-sm/relaxed text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary',
        className,
      )}
      {...props}
    />
  )
}

function EmptyContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-content"
      className={cn(
        'flex w-full max-w-sm min-w-0 flex-col items-center gap-2.5 text-sm text-balance',
        className,
      )}
      {...props}
    />
  )
}

export { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia }
