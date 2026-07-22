import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils/cn'

/*
  확정 화면 17개 중 8개가 쓴다. 계정 상태·판정·진행 상태처럼 **짧은 상태 한 조각**을 표시한다.

  변형 이름은 의미 색 토큰과 1:1로 맞췄다. 와이어에는 ok·warn·off·inv 같은 이름이
  섞여 있었는데, 같은 뜻에 다른 이름이 붙으면 무엇이 같은 상태인지 코드에서 안 보인다.

    success  정상·활성·회복·승인
    warning  주의·표본 부족·미검증·일시 잠금
    danger   위험·차단·에러
    info     정보·안내
    neutral  비활성·보류 — 의미 색이 아니라 회색이다

  Base UI `useRender`로 다형성을 준다 — 필요하면 `render={<Link .../>}`로
  클릭 가능한 배지도 새 컴포넌트 없이 나온다.

  ▸ 기본값에서 덜어낸 것
    focus 링   index.css의 `:focus-visible` 전역 기준선이 이미 그린다. 겹쳐 그리지 않는다
    aria-invalid  배지는 폼 컨트롤이 아니다 — 유효성 상태를 가질 일이 없다
    dark:*     다크 모드는 아직 요구가 없다(index.css 토큰 주석의 승격 조건 1)
*/
const badgeVariants = cva(
  [
    // 구조 — Base UI 기본값에서 가져왔다.
    // h-5(고정 20px)는 뺐다 — 컴포넌트 문서의 `.bdg`는 높이를 정하지 않고
    // 안쪽 여백과 글자 크기로만 정해진다. 고정하면 글자가 커질 때 잘린다
    'group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap',
    // 아이콘이 붙는 쪽 안쪽 여백을 줄인다 — 글자와 아이콘의 시각적 무게가 다르다
    'has-data-[icon=inline-start]:pl-1.5 has-data-[icon=inline-end]:pr-1.5',
    '[&>svg]:pointer-events-none [&>svg]:size-3!',
    // 디자인 — components.html의 `.bdg` (radius 999px · 2px 8px · 11px · 600)
    'rounded-full px-2 py-0.5 text-2xs font-semibold',
  ],
  {
    variants: {
      variant: {
        success: 'bg-success-soft text-success',
        warning: 'bg-warning-soft text-warning',
        danger: 'bg-danger-soft text-danger',
        info: 'bg-info-soft text-info',
        neutral: 'bg-neutral-soft text-fg-subtle',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
)

type Props = useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>

/**
 * 색만으로 상태를 말하지 않는다. 색을 구분하기 어려운 사용자에게는 아무 정보도
 * 전달되지 않으므로, 배지 안의 **글자가 상태를 그대로 말해야** 한다.
 *
 *   <Badge variant="success">활성</Badge>     상태가 글자에 있다
 *   <Badge variant="success" />               색만 남는다 — 이렇게 쓰지 않는다
 */
function Badge({ className, variant, render, ...props }: Props) {
  return useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>({ className: cn(badgeVariants({ variant }), className) }, props),
    render,
    state: { slot: 'badge', variant },
  })
}

export default Badge
export { Badge, badgeVariants }
