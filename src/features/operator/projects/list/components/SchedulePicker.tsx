import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { Matcher } from 'react-day-picker'
import { Button } from '@/components/ui/Button'
import { Calendar } from '@/components/ui/Calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover'
import { DUE_TIME } from '../../rules'

/*
  회차 기간 — 시작일과 제출 마감일.

  **손으로 만들지 않았다.** `input-inventory.md` D 범주가 *"날짜 · 기간(시작~종료)"*를
  `Popover + Calendar + Button` 조합으로 확정해 뒀고(shadcn도 DatePicker 컴포넌트가
  없다), `InputCompositionsPreview.tsx`에 그 조합이 조립돼 있다.

  **입력을 둘로 나눈 이유** — 달력 하나에서 범위를 끌면 두 날짜가 한 칸에 들어가서
  무엇이 시작이고 무엇이 마감인지 라벨 없이는 안 읽힌다. 칸이 둘이면 각자 라벨을 갖는다.

  **그래도 범위라는 성질은 잃지 않는다.** 마감 달력이 **시작일 이전을 비활성**으로 막고,
  시작 달력이 **마감일 이후를 막는다** — `시작 > 마감` 상태가 애초에 만들어지지 않아서
  검증도 에러 문구도 필요 없다. 만들 수 없는 것은 막을 필요가 없다.

  **시각은 받지 않는다.** 마감은 **그날 자정까지**(23:59)로 고정이라 회차마다 다른 값이
  아니다 — 입력으로 두면 운영자가 매번 같은 값을 치게 되고 잘못 치면 그날 마감이
  어긋난다. `rules.ts`의 `DUE_TIME`이 갖는다.
*/
type Props = {
  startAt: Date | undefined
  dueAt: Date | undefined
  onChange: (patch: { startAt?: Date; dueAt?: Date }) => void
  /** 기수 기간 — 이 밖은 고를 수 없다. 기수가 끝났는데 회차가 도는 상태를 막는다 */
  min?: string
  max?: string
}

export default function SchedulePicker({ startAt, dueAt, onChange, min, max }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <DateField
        label="시작일"
        value={startAt}
        onSelect={(d) => onChange({ startAt: d })}
        // 마감보다 뒤인 시작일은 고를 수 없다
        disabled={blocked(min, dueAt ? key(dueAt) : max)}
      />
      <DateField
        label="제출 마감일"
        value={dueAt}
        onSelect={(d) => onChange({ dueAt: d })}
        // 시작일보다 앞인 마감일은 고를 수 없다
        disabled={blocked(startAt ? key(startAt) : min, max)}
        suffix={DUE_TIME}
      />
    </div>
  )
}

function DateField({
  label,
  value,
  onSelect,
  disabled,
  suffix,
}: {
  label: string
  value: Date | undefined
  onSelect: (d: Date | undefined) => void
  disabled?: Matcher[]
  /** 날짜 뒤에 붙는 고정 시각. 마감에만 있다 */
  suffix?: string
}) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="ghost" className="w-full justify-start font-normal" aria-label={label}>
            <CalendarIcon />
            {value ? (
              <>
                {format(value, 'yyyy-MM-dd')}
                {suffix && <span className="text-fg-subtle ml-1">{suffix}</span>}
              </>
            ) : (
              <span className="text-fg-subtle">{label}</span>
            )}
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onSelect}
          defaultMonth={value}
          locale={ko}
          disabled={disabled}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}

/** 고를 수 없는 구간. 둘 다 없으면 `undefined`를 준다(빈 배열은 전부 비활성으로 읽힌다) */
function blocked(before?: string, after?: string): Matcher[] | undefined {
  const rules: Matcher[] = []
  if (before) rules.push({ before: new Date(before) })
  if (after) rules.push({ after: new Date(after) })
  return rules.length ? rules : undefined
}

const key = (d: Date) => format(d, 'yyyy-MM-dd')
