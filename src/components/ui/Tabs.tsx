import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'

import { cn } from '@/lib/utils/cn'

/*
  한 컨텍스트의 여러 측면을 오갈 때 쓴다(기관 상세의 개요·매니저·사용량·설정).
  대등한 별개 화면이면 탭이 아니라 좌측 네비의 하위 메뉴로 나눈다.

  ▸ 모양은 **밑줄형 하나뿐이다.**
    와이어 8개 파일의 `.tabs`가 전부 같은 규칙이다 —
      컨테이너  아래쪽 1px 경계선
      탭        13px · fg-muted · 위아래 8px · 좌우 0 · 투명 2px 밑줄
      선택      primary 글자 + primary 2px 밑줄 + 600

    shadcn 기본값은 회색 면에 알약이 얹힌 세그먼트 형태(`bg-muted` + `rounded-lg`)라
    통째로 걷어냈다. 두 모양을 다 두면 화면마다 다른 탭이 나오고, 우리 와이어에
    알약 탭을 쓰는 화면은 하나도 없다. 세그먼트가 필요한 자리(모드 전환·버전 전환)는
    탭이 아니라 `button-group`이 맡는다.

  ▸ `margin-bottom:-1px`이 핵심이다. 탭의 2px 밑줄이 컨테이너의 1px 경계선을 덮어야
    선이 두 겹으로 보이지 않는다.

  ▸ 세로 방향은 만들지 않았다. 쓰는 화면이 없다.
*/
function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn('group/tabs flex flex-col', className)}
      {...props}
    />
  )
}

function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn('flex w-full items-center gap-5 border-b border-border', className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        'relative -mb-px inline-flex cursor-pointer items-center gap-1.5 border-b-2 border-transparent py-2 text-sm whitespace-nowrap text-fg-muted transition-colors',
        'hover:text-fg',
        'data-active:border-primary data-active:font-semibold data-active:text-primary',
        'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn('flex-1 text-sm outline-none', className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
