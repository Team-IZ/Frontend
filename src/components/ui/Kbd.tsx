import { cn } from '@/lib/utils/cn'

function Kbd({ className, ...props }: React.ComponentProps<'kbd'>) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        /*
          물리 키를 가리키는 표식이다. 우리 제품엔 단축키 UI가 없고, 실제 쓰임은
          **Caps Lock 경고**처럼 "지금 눌려 있는 키"를 문장 안에서 지목하는 자리다.
          그래서 배지가 아니라 키캡처럼 보이게 테두리를 준다 — 배지(Badge)는 상태를
          말하고, 이건 키보드 위의 물건을 말한다. 둘이 같아 보이면 안 된다.

          크기는 배지와 같은 11px(text-2xs)에 맞춘다. 문장 안에 섞이는 요소라
          본문(13px)보다 작아야 줄 높이를 밀지 않는다.
        */
        "pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-sm border border-border-strong bg-surface-2 px-1.5 font-sans text-2xs font-semibold text-fg-muted select-none [&_svg:not([class*='size-'])]:size-3",
        className,
      )}
      {...props}
    />
  )
}

function KbdGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <kbd
      data-slot="kbd-group"
      className={cn('inline-flex items-center gap-1', className)}
      {...props}
    />
  )
}

export { Kbd, KbdGroup }
