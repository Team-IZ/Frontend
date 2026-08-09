import { useState } from 'react'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { Matcher } from 'react-day-picker'
import { Button } from '@/components/ui/Button'
import { Calendar } from '@/components/ui/Calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover'

/*
  회차 기간 — 시작과 제출 마감. **날짜만 받는다.**

  **손으로 만들지 않았다.** `input-inventory.md` D 범주가 *"날짜 · 기간(시작~종료)"* 를
  `Popover + Calendar + Button` 조합으로 확정해 뒀고 `InputCompositionsPreview.tsx`에
  그 조합이 조립돼 있다.

  ─── 시각 입력을 뺐다 ────────────────────────────────────────────
  한때 각 끝점에 `<input type="time">`을 붙여 `09:00 시작 · 23:59 마감`을 받았다.
  **서버가 그 시각을 저장하지 않는다** — `project.start_date`·`end_date`가 `DATE`이고,
  학생에게 나가는 실제 마감은 다른 테이블(`submission_due_at`)이며 이 값과 연결돼 있지
  않다(9차 회신 §15).

  받아 놓고 버리는 입력은 **거짓말이다.** 오퍼레이터가 `18:00`을 골랐는데 아무 데도
  반영되지 않고, 화면은 그 시각을 마감이라고 계속 말한다. 결론(ⓐ 서버가 파생 · ⓑ 운영자
  입력 · ⓒ `submissionDueAt`만 표시)이 나오면 되살린다 — 그때는 `rules.ts`의 주석도 같이.

  ─── 배치 ────────────────────────────────────────────────────────
      시작        [📅 2026-08-03]
      제출 마감   [📅 2026-08-17]

  **행이 끝점이다.** 위에서 아래로 읽으면 그대로 `시작 → 마감`이라 **범위라는 성질이
  배치에서 나온다.**

  **라벨을 눈에 보이게 단다.** `aria-label`만 있으면 스크린리더는 알아도 눈으로 보는
  사람은 달력 아이콘과 날짜만 보고 무엇의 날짜인지 추측해야 한다.

  **입력을 둘로 나눈 이유** — 달력 하나에서 범위를 끌면 두 날짜가 한 칸에 들어가서
  무엇이 시작이고 무엇이 마감인지 라벨 없이는 안 읽힌다.

  **범위라는 성질은 유지한다.** 마감 달력이 **시작일 이전을 비활성**으로 막고, 시작
  달력이 **마감일 이후를 막는다.** 시각이 없어졌으므로 같은 날은 허용이다(하루짜리 회차).
*/
export type ScheduleValue = {
  startAt: Date | undefined
  dueAt: Date | undefined
}

type Props = {
  value: ScheduleValue
  onChange: (patch: Partial<ScheduleValue>) => void
  /** 기수 기간 — 이 밖은 고를 수 없다. 기수가 끝났는데 회차가 도는 상태를 막는다 */
  min?: string
  max?: string
}

export default function SchedulePicker({ value, onChange, min, max }: Props) {
  const { startAt, dueAt } = value

  return (
    <div className="flex flex-col gap-2">
      <Row
        label="시작"
        date={startAt}
        onDate={(d) => onChange({ startAt: d })}
        // 마감보다 뒤인 시작일은 고를 수 없다 — 같은 날은 허용이다
        disabled={blocked(min, dueAt ? key(dueAt) : max)}
      />
      <Row
        label="제출 마감"
        date={dueAt}
        onDate={(d) => onChange({ dueAt: d })}
        disabled={blocked(startAt ? key(startAt) : min, max)}
      />
    </div>
  )
}

/** 끝점 한 줄 — `라벨 | 날짜`. 라벨 폭을 고정해 두 줄의 입력이 세로로 맞는다 */
function Row({
  label,
  date,
  onDate,
  disabled,
}: {
  label: string
  date: Date | undefined
  onDate: (d: Date | undefined) => void
  disabled?: Matcher[]
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-fg-subtle w-16 shrink-0 text-xs">{label}</span>
      <DateField label={label} date={date} onDate={onDate} disabled={disabled} />
    </div>
  )
}

function DateField({
  label,
  date,
  onDate,
  disabled,
}: {
  label: string
  date: Date | undefined
  onDate: (d: Date | undefined) => void
  disabled?: Matcher[]
}) {
  /*
    **고르면 닫는다.** 열어 둔 채로 두면 달력이 아래 내용을 덮는다 — 모달 안에서는
    그게 `저장` 버튼이라, 날짜를 고른 뒤 저장을 누를 수가 없다.
  */
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            className="flex-1 justify-start font-normal"
            aria-label={`${label} 날짜`}
          >
            <CalendarIcon />
            {date ? format(date, 'yyyy-MM-dd') : <span className="text-fg-subtle">날짜 선택</span>}
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            onDate(d)
            setOpen(false)
          }}
          defaultMonth={date}
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
