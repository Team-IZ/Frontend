import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox'

import { cn } from '@/lib/utils/cn'
import { CheckIcon } from 'lucide-react'

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        /*
          ⚠ `disabled:*`가 아니라 `data-disabled:*`를 쓴다(버그 수정, 이슈 113·
          decision-log D41) — Base UI `Checkbox.Root`는 `<span role="checkbox">`로
          렌더돼 네이티브 `disabled` 속성 자체가 없고 `data-disabled` 어트리뷰트로만
          비활성을 표시한다. `disabled:`는 `:disabled` 가상 클래스라 `<span>`엔
          애초에 매칭될 수 없어 여기 두 클래스는 한 번도 작동한 적이 없었다.
          `Switch.tsx`·`Select.tsx`·`DropdownMenu.tsx`가 이미 쓰는 `data-disabled:`
          패턴과 통일한다. `group-has-disabled/field:`도 같은 이유로
          `group-has-data-disabled/field:`로(Field.tsx·Avatar.tsx의
          `group-has-data-*` 표기와 동일).
        */
        'peer relative flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input transition-colors outline-none group-has-data-disabled/field:opacity-50 after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-disabled:cursor-not-allowed data-disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none [&>svg]:size-3.5"
      >
        <CheckIcon />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
