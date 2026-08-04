import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { Matcher } from 'react-day-picker'
import { Button } from '@/components/ui/Button'
import { Calendar } from '@/components/ui/Calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover'

/*
  기간 입력 — 시작일과 종료일.

  **손으로 만들지 않았다.** `docs/dev/input-inventory.md` D 범주가 *"날짜 · 기간
  (시작~종료)"* 를 `Popover + Calendar + Button` 조합으로 확정해 뒀고(shadcn에도 DatePicker
  컴포넌트가 없다), `InputCompositionsPreview.tsx`에 그 조합이 조립돼 있다.

  **입력을 둘로 나눈다.** 달력 하나에서 범위를 끌면 두 날짜가 한 칸에 들어가 무엇이
  시작이고 무엇이 끝인지 라벨 없이는 안 읽힌다.

  **그래도 범위라는 성질은 잃지 않는다.** 종료 달력이 시작일 이전을, 시작 달력이 종료일
  이후를 **비활성으로 막는다** — `시작 > 종료` 상태가 애초에 만들어지지 않아서 검증도
  에러 문구도 필요 없다. 만들 수 없는 것은 막을 필요가 없다.

  ponytail: `features/operator/projects/list/components/SchedulePicker.tsx`가 같은 조합을
  갖고 있다(그쪽은 마감에 고정 시각이 붙는다). **세 번째 등장이라 공용으로 올릴 때가
  맞지만**(decision-log D14) 그 파일을 OP-04 작업이 동시에 건드리고 있어 지금 옮기지
  않는다 — 머지된 뒤 `components/common/DateRangeField`로 합치고 양쪽에서 지운다.
*/
type Props = {
  startAt: Date | undefined
  endAt: Date | undefined
  onChange: (patch: { startAt?: Date; endAt?: Date }) => void
  startLabel?: string
  endLabel?: string
}

export default function DateRangeField({
  startAt,
  endAt,
  onChange,
  startLabel = '시작일',
  endLabel = '종료일',
}: Props) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <DateField
        label={startLabel}
        value={startAt}
        onSelect={(d) => onChange({ startAt: d })}
        disabled={endAt ? [{ after: endAt }] : undefined}
      />
      <DateField
        label={endLabel}
        value={endAt}
        onSelect={(d) => onChange({ endAt: d })}
        disabled={startAt ? [{ before: startAt }] : undefined}
      />
    </div>
  )
}

function DateField({
  label,
  value,
  onSelect,
  disabled,
}: {
  label: string
  value: Date | undefined
  onSelect: (d: Date | undefined) => void
  disabled?: Matcher[]
}) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="ghost" className="w-full justify-start font-normal" aria-label={label}>
            <CalendarIcon />
            {value ? format(value, 'yyyy-MM-dd') : <span className="text-fg-subtle">{label}</span>}
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
