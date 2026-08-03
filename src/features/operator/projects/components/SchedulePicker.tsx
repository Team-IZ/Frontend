import { useState } from 'react'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { Matcher } from 'react-day-picker'
import { Button } from '@/components/ui/Button'
import { Calendar } from '@/components/ui/Calendar'
import { Input } from '@/components/ui/Input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover'

/*
  회차 기간 — 시작과 제출 마감. **각각 날짜 + 시각을 받는다.**

  **손으로 만들지 않았다.** `input-inventory.md` D 범주가 *"날짜 · 기간(시작~종료)"* 를
  `Popover + Calendar + Button` 조합으로 확정해 뒀고 `InputCompositionsPreview.tsx`에
  그 조합이 조립돼 있다.

  **shadcn에는 시각·날짜시각 컴포넌트가 없다**(2026-08 확인 — 공식 문서에 DatePicker
  루트조차 없고 *"Popover와 Calendar로 만든다"* 고만 돼 있다). 날짜+시각도 같은 방식으로
  **Calendar + `<input type="time">`을 조립하라**는 것이 공식 패턴이라, 지금 배치가 그것과
  같다. 네이티브 시각 입력은 24시간/오전오후 표기와 키보드 조작을 브라우저가 로케일에
  맞게 처리하므로 직접 만들 이유가 없다 — `step`을 주지 않아 분 단위이고 초는 안 받는다
  (제출 마감에 초가 의미를 갖는 경우가 없다).

  **한때 마감 시각을 `23:59`로 고정했다.** 목업의 `18:00`도 그 값도 예시였을 뿐인데
  상수로 두니 *"자정 마감이 규칙"* 인 것처럼 굳었다 — 실제로는 회차마다 다르게 잡는다.
  **화면이 기준을 만들지 않는다**(E8). 초기값만 주고 사용자가 바꾼다.

  ─── 배치 ────────────────────────────────────────────────────────
      시작        [📅 2026-08-03]  [09:00]
      제출 마감   [📅 2026-08-17]  [23:59]

  **행이 끝점, 열이 종류다.** 위에서 아래로 읽으면 그대로 `시작 → 마감`이라 **범위라는
  성질이 배치에서 나온다.** 한때 좌우 2칸(시작 | 마감) 안에 날짜를 위, 시각을 아래로
  쌓았는데, 그러면 왼쪽 아래 시각이 **왼쪽 날짜의 것인지 아래 줄인지**가 안 읽혔다 —
  같은 종류(시각)가 세로로 안 모여 비교도 안 됐다.

  **라벨을 눈에 보이게 단다.** `aria-label`만 있으면 스크린리더는 알아도 눈으로 보는
  사람은 달력 아이콘과 `09:00`만 보고 무엇의 시각인지 추측해야 한다.

  **입력을 둘로 나눈 이유** — 달력 하나에서 범위를 끌면 두 날짜가 한 칸에 들어가서
  무엇이 시작이고 무엇이 마감인지 라벨 없이는 안 읽힌다.

  **범위라는 성질은 유지한다.** 마감 달력이 **시작일 이전을 비활성**으로 막고, 시작
  달력이 **마감일 이후를 막는다.** 다만 **같은 날이면 날짜로는 못 가른다** — 시각까지
  봐야 하므로 그 판정은 `toSchedule`이 갖는다(저장 버튼이 그 결과로 잠긴다).
*/
export type ScheduleValue = {
  startAt: Date | undefined
  startTime: string
  dueAt: Date | undefined
  dueTime: string
}

type Props = {
  value: ScheduleValue
  onChange: (patch: Partial<ScheduleValue>) => void
  /** 기수 기간 — 이 밖은 고를 수 없다. 기수가 끝났는데 회차가 도는 상태를 막는다 */
  min?: string
  max?: string
}

export default function SchedulePicker({ value, onChange, min, max }: Props) {
  const { startAt, startTime, dueAt, dueTime } = value

  return (
    <div className="flex flex-col gap-2">
      <Row
        label="시작"
        date={startAt}
        time={startTime}
        onDate={(d) => onChange({ startAt: d })}
        onTime={(t) => onChange({ startTime: t })}
        // 마감보다 뒤인 시작일은 고를 수 없다(같은 날은 시각이 가른다)
        disabled={blocked(min, dueAt ? key(dueAt) : max)}
      />
      <Row
        label="제출 마감"
        date={dueAt}
        time={dueTime}
        onDate={(d) => onChange({ dueAt: d })}
        onTime={(t) => onChange({ dueTime: t })}
        disabled={blocked(startAt ? key(startAt) : min, max)}
      />
    </div>
  )
}

/** 끝점 한 줄 — `라벨 | 날짜 | 시각`. 라벨 폭을 고정해 두 줄의 입력이 세로로 맞는다 */
function Row({
  label,
  date,
  time,
  onDate,
  onTime,
  disabled,
}: {
  label: string
  date: Date | undefined
  time: string
  onDate: (d: Date | undefined) => void
  onTime: (t: string) => void
  disabled?: Matcher[]
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-fg-subtle w-16 shrink-0 text-xs">{label}</span>
      <DateField label={label} date={date} onDate={onDate} disabled={disabled} />
      <Input
        type="time"
        aria-label={`${label} 시각`}
        value={time}
        onChange={(e) => onTime(e.target.value)}
        /*
          **36칸이 아니라 32칸이다.** 크롬이 ko 로케일에서 `오전 12:00`처럼 오전/오후를
          붙여 그리는데 w-28(112px)에서는 `오전 12:0(` 로 잘렸다 — 실측하고 늘렸다.
        */
        className="w-32 shrink-0"
      />
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
