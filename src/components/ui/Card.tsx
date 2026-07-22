import * as React from 'react'

import { cn } from '@/lib/utils/cn'

/*
  확정 화면 17개 중 6개가 쓴다. 표·지표·폼을 담는 면이다.

  흰 면 + 얇은 테두리 + 중간 반경. 그림자는 기본으로 주지 않는다 — 이 제품에서
  떠 있어야 하는 것은 드물고, 카드는 페이지 배경(canvas)과 색이 달라 그것만으로
  구분된다.

  Header/Title/Description/Action/Content/Footer로 조합한다. 기본 여백
  (`--card-spacing`)이 있지만 표를 담는 카드처럼 여백이 0이어야 하는 곳은
  `className="gap-0 py-0"`로 지운다(예: TableFrame) — 기본값을 없애면 절반은
  그걸 채우는 데 쓰게 되므로 "여백 있음"을 기본으로 두고 필요한 곳에서 지운다.

  ▸ 기본값에서 바꾼 것
    ring-1 ring-foreground/10 → border border-border   링은 레이아웃 폭을 차지하지
      않아 표를 끝까지 붙이는 카드에서 내용과 어긋난다. 실제 테두리로 바꿨다
    rounded-xl → rounded-md   토큰의 반경 스케일에 맞춘다
    font-heading 제거          제목 전용 서체를 두지 않는다(서체 토큰 1종)
*/
function Card({
  className,
  size = 'default',
  ...props
}: React.ComponentProps<'div'> & { size?: 'default' | 'sm' }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        'group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-md border border-border bg-surface py-(--card-spacing) text-sm text-fg [--card-spacing:--spacing(4)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-md *:[img:last-child]:rounded-b-md',
        className,
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        'group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-md px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)',
        className,
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        'text-base leading-snug font-medium group-data-[size=sm]/card:text-sm',
        className,
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-sm text-fg-subtle', className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="card-content" className={cn('px-(--card-spacing)', className)} {...props} />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        'flex items-center rounded-b-md border-t border-border bg-surface-2 p-(--card-spacing)',
        className,
      )}
      {...props}
    />
  )
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent }
