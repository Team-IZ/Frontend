import * as React from 'react'
import { Input as InputPrimitive } from '@base-ui/react/input'

import { cn } from '@/lib/utils/cn'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        /*
          와이어 공통값 — border-strong · radius-md · 13px · 좌우 12px · 높이 40px.
          배경은 surface-2다. 인증 화면(.input)만 흰 면을 쓰는데, 그건 폼 자체가 흰
          카드 위에 있어서다 — 그 화면에서 `bg-surface`로 덮는다.

          ▸ 기본값에서 바꾼 것
            h-8 → h-10          와이어 실측 38~44px, 모달 기준 40px
            rounded-lg → md     lg(14px)는 카드용이다. 폼 컨트롤은 10px
            text-base/md:sm → sm  우리 기준 글자는 13px 하나다(반응형 분기 없음)
            px-2.5 → px-3       와이어 --sp-3
            dark:*              다크 모드는 요구가 없다
        */
        'h-10 w-full min-w-0 rounded-md border border-input bg-surface-2 px-3 py-1 text-sm transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
