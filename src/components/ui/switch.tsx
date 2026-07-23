import { Switch as SwitchPrimitive } from '@base-ui/react/switch'

import { cn } from '@/lib/utils/cn'

function Switch({
  className,
  size = 'default',
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: 'sm' | 'default'
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        /*
          와이어 `.tgl` — 42×24 · thumb 20px · 안쪽 여백 2px.

          켜짐은 primary다. 와이어 CSS에는 success(녹색)로 적혀 있었지만 그 스타일이
          실제로 렌더되는 화면이 하나도 없어(죽은 CSS) 근거로 삼지 않았다. 의미 색
          success는 "정상·활성" 상태를 **표시**할 때 쓰는 것이고(Badge·Alert), 스위치는
          누르는 컨트롤이라 선택 상태는 primary로 통일한다.
          꺼짐은 border-strong — 회색 면이지 의미 색이 아니다.
        */
        'peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-all outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-[size=default]:h-6 data-[size=default]:w-[42px] data-[size=sm]:h-[14px] data-[size=sm]:w-[24px] data-checked:bg-primary data-unchecked:bg-border-strong data-disabled:cursor-not-allowed data-disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        // 42 − 20(thumb) − 2(우측 여백) = 20px 이동
        className="pointer-events-none block rounded-full bg-white ring-0 transition-transform group-data-[size=default]/switch:size-5 group-data-[size=sm]/switch:size-3 group-data-[size=default]/switch:data-checked:translate-x-[20px] group-data-[size=default]/switch:data-unchecked:translate-x-[2px] group-data-[size=sm]/switch:data-checked:translate-x-[calc(100%-2px)] group-data-[size=sm]/switch:data-unchecked:translate-x-0"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
