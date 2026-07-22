import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils/cn'

/*
  확정 화면 17개 중 10개가 쓴다. 와이어에서 실제로 쓰인 변형만 옮겼다 —
  primary(주 액션) · ghost(보조) · danger, 크기 sm·md·lg.

  variant를 더 만들지 않는다. "이 버튼만 좀 다르게" 가 쌓이면 어느 것이 주 액션인지
  화면에서 읽히지 않는다. 필요해 보이면 먼저 묻는다.

  Base UI Button 프리미티브 위에 올렸다 — 지금 당장은 네이티브 <button>과 동작이
  같지만, `render`(다른 요소로 렌더 — 링크를 버튼처럼)와 `focusableWhenDisabled`
  (비활성 버튼도 탭으로 닿게)가 필요해지면 새 컴포넌트 없이 그대로 확장된다.

  ▸ 기본값에서 덜어낸 것
    outline-none  index.css의 `:focus-visible` 전역 아웃라인을 지워버린다. 쓰면 안 된다
    focus 링      같은 이유 — 전역 기준선이 이미 그린다
    aria-invalid  버튼은 유효성 상태를 갖지 않는다
    dark:*        다크 모드는 아직 요구가 없다
    border border-transparent + bg-clip-padding
      기본값은 모든 변형에 투명 테두리를 둘러 높이를 맞추지만, 컴포넌트 문서의
      `.btn`은 `border: 0`이고 ghost만 1px을 갖는다. 문서를 기준으로 뺐다
*/
const buttonVariants = cva(
  [
    // 구조 — Base UI 기본값에서 가져왔다
    'group/button inline-flex shrink-0 items-center justify-center whitespace-nowrap select-none',
    'active:not-aria-[haspopup]:translate-y-px',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    // 디자인 — components.html의 `.btn` (gap 6px · radius-md · 600)
    'gap-1.5 rounded-md font-semibold',
    'cursor-pointer transition-colors',
    // 비활성은 클래스가 아니라 disabled 속성으로 온다(아래 주석 참고).
    // pointer-events-none을 쓰지 않는다 — 포인터를 죽이면 not-allowed 커서가 보이지 않는다
    'disabled:cursor-not-allowed disabled:opacity-60',
  ],
  {
    variants: {
      variant: {
        /** 주 액션. 한 화면에 하나가 원칙이다 */
        primary: 'bg-primary text-white hover:bg-primary-hover',
        /** 보조 액션. 취소·닫기·부차적 이동 */
        ghost: 'bg-surface text-fg-muted border-border-strong border hover:bg-canvas',
        /** 되돌릴 수 없는 삭제·차단에만 */
        danger: 'bg-danger text-white hover:brightness-95',
      },
      size: {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-3.5 py-2 text-xs',
        /** 폼 제출처럼 목표가 커야 하는 곳 */
        lg: 'h-11 w-full text-sm',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

type Props = ButtonPrimitive.Props & VariantProps<typeof buttonVariants>

/**
 * 비활성 상태는 반드시 `disabled` 속성으로 준다. 회색으로 보이게만 하면
 * 보조기술에는 여전히 누를 수 있는 버튼으로 읽혀 거짓 신호가 된다.
 *
 * `type`은 기본을 `button`으로 둔다. HTML 기본값이 `submit`이라, 폼 안에 놓인
 * 버튼이 의도치 않게 폼을 보내는 사고가 잦다. 제출 버튼은 명시적으로 적는다.
 */
function Button({ className, variant, size, type = 'button', ...props }: Props) {
  return (
    <ButtonPrimitive
      data-slot="button"
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export default Button
export { Button, buttonVariants }
