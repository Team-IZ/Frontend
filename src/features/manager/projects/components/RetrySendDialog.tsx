import { useEffect, useState } from 'react'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { Matcher } from 'react-day-picker'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Checkbox } from '@/components/ui/Checkbox'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Calendar } from '@/components/ui/Calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover'
import {
  MOCK_TODAY,
  RETRY_STATUS_VARIANT,
  retryConceptNames,
  retryStatus,
  sendRetry,
  type ProjectResult,
} from '../mockData'

/*
  다시 보기 활성화 모달 — 와이어프레임(#retry-send) 그대로. 전엔 결과 요약
  패널에 체크리스트 + 버튼이 바로 박혀 있었는데, 모달로 빼면서 사람마다
  "막힘 N개" 대신 **막힌 개념 이름**을 보여주도록 바꿨다(와이어 "HITL Trigger
  조건 · State 관리") — 매니저가 뭘 열어줄지 확인하고 누르는 화면이라 이름이
  숫자보다 유용하다.

  ⚠ 용어 롤백(결정 로그 D56 A·D절, 이슈 124) — 지난 세션이 "다시 보기"를
  전부 "재응시"로 바꿨던 걸 되돌린다. 같이 "발송"→"활성화"로 바꿨다 — 백엔드가
  실제로 메시지를 보내는 게 아니라 응시 권한·기한을 부여하는 상태 변경이라
  "보낸다"는 말이 안 맞는다(C절, 알림 채널 절단). `sendRetry` 함수명·
  `retrySentAt` 필드명은 그대로 둔다.

  ⚠ 응시 여부 표기 — 활성화된 사람에게 하드코딩한 "이미 다시 봤어요"를 달고
  있었는데, 이건 **활성화됐다는 뜻이지 실제로 다시 봤다는 뜻이 아니다**(사용자
  지적 — 사실과 다름). `ResultTab` 활성화 현황 표와 같은 4분류(`retryStatus`:
  활성화 전·응시 전·미응시·완료, D56 B절과 같은 마감 전/후 구분)로 통일해 두
  화면이 같은 값을 쓴다.

  ⚠ 활성화된 사람의 체크박스 — 전엔 `checked={checked.has(id)}`를 그대로 써서,
  이 다이얼로그를 다시 열었을 때 **처음부터 활성화돼 있던 사람은 빈 체크박스로
  잠겨** 있었다(체크된 채로 열어줬다가 부모가 리렌더된 사람만 우연히 체크된
  채로 보였다 — 상태가 세션에 따라 달랐다). "빈 채로 못 품" 것과 "이미
  포함돼 있어서 못 뺌"은 다른 뜻이라 헷갈렸다(사용자 지적). `p.retrySentAt`이
  있으면 `checked` Set 내용과 무관하게 **항상 체크된 채로 잠근다**.

  ⚠ 잠긴 체크박스의 색 — 활성 체크와 똑같은 파란색(`data-checked:bg-primary`)
  그대로라 "지금 눌러서 체크한 것"과 "이미 활성화돼 잠긴 것"이 구분이 안
  됐다(사용자 지적 — "클릭했을 때와 다른 회색배경으로"). 원래 있던
  `disabled:opacity-50`으로 흐려질 거라 짐작했는데, 실제로 브라우저에서
  `getComputedStyle`로 재보니 **opacity가 항상 1(안 흐려짐)**이었다 — 원인은
  Base UI `Checkbox.Root`가 `<span role="checkbox">`로 렌더돼(`<button>`이
  아니다) 네이티브 `disabled` 속성 자체가 없고 `data-disabled` 어트리뷰트로만
  비활성을 표시하기 때문이다. Tailwind `disabled:`는 `:disabled` 가상
  클래스라 `<span>`엔 애초에 매칭될 수 없다 — 공용 `Checkbox.tsx`가 처음부터
  안 먹는 클래스를 쓰고 있었던 것(다른 화면들도 같은 증상일 것). `DISABLED_
  CHECKED_CLASS`는 **`data-disabled:data-checked:`**(어트리뷰트 선택자, 항상
  매칭)로 회색(`neutral-soft` 배경·`fg-subtle` 체크 아이콘)을 덮어썼다 —
  공용 `components/ui/Checkbox.tsx`는 팀장님 소유(CLAUDE.md §7)라 그 파일을
  고치지 않고 **여기 이 화면에서만** `className`으로 오버라이드한다(2속성
  선택자라 원래 1속성 선택자인 `data-checked:bg-primary`보다 항상 우선한다 —
  스타일시트 순서에 안 좌우됨). `Checkbox.tsx`의 `disabled:*` 클래스 자체가
  전혀 작동하지 않는 문제는 이 화면 밖이라 고치지 않고 대화·로그에만 남긴다.

  ⚠ 다시 보기 비활성화(사용자 지시, 명칭은 D56 D절) — "응시 전"·"미응시"(열어
  줬지만 아직 안 봄) 상태는 비활성화할 수 있다. **"완료"(이미 봄)는 제외**
  (사용자 지시) — 이미 벌어진 일은 되돌릴 게 없다. 이 화면은 "누구를 열어줄지
  고르는" 용도라 비활성화 액션은 여기 안 두고 `ResultTab`의 활성화 현황 표
  (관리 화면)에 뒀다 — `cancelRetry()`(`mockData.ts`) 참고.

  ⚠ 기한 — 처음엔 "+3일 18:00" 고정 계산값을 문구로만 보여줬는데, 사용자가
  "매니저가 직접 정할 수 있게 해달라"고 지시(렌더 스크린샷 확인 후). 기본값은
  그대로 +3일 18:00으로 채우되, 날짜·시각을 매니저가 바꿀 수 있다 —
  `SchedulePicker.tsx`(operator/projects)와 같은 조합(Popover+Calendar+
  `<input type="time">`, `input-inventory.md` D 범주 확정 패턴)을 여기 다시
  적었다. 그 파일은 팀장님 소유(operator, CLAUDE.md §7)라 가져다 쓸 수 없고
  oxlint가 기능 간 교차 import도 막는다 — decision-log D14 기준으로도 아직
  두 도메인째라 공용으로 올리지 않고 복제해 둔다.

  반 전체 경고(`classWarnings`)에 이미 뜬 개념은 개인 목록에서 뺀다
  (`retryConceptNames`) — 정의서 §3 "개인 위험 사유에서 빼고 반 전체에서만
  경고" 원칙 그대로다.

  ⚠ 버그 수정(사용자 지적, 2026-08-08) — 이 다이얼로그는 `open`만 바뀌고
  컴포넌트 자체는 계속 마운트돼 있어서(Base UI `Dialog`), `useState` 초기값이
  첫 마운트 때 한 번만 계산됐다. 비활성화 → 다시 열기를 하면 지난번 체크·
  기한이 그대로 남아 있던 원인이다 — `useEffect`로 `open`이 열릴 때마다
  최신 `result` 기준으로 체크·기한을 다시 계산해 덮어쓴다.

  ⚠ 되돌림(사용자 지적, 2026-08-08) — "열었을 때 기본값에서 하나도 안
  바꾸면 활성화 버튼을 막는다"는 규칙을 잠깐 넣었다가 뺐다. 기본값(체크된
  대상 + 기한 +3일 18:00) 그대로 누르는 게 오히려 제일 흔한 정상 흐름인데,
  그 규칙이 그 흐름 자체를 막아버렸다("체크가 그대로 남아있어서 활성화를
  못 한다") — 재오픈 시 상태를 초기화하는 위 버그 수정과 목적이 겹치는
  줄 알았는데 실제로는 서로 다른 문제였다.
*/

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  result: ProjectResult
  onSent: () => void
}

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']
const TODAY = new Date(`${MOCK_TODAY}T00:00:00`)

/**
 * 잠긴(활성화된) 체크박스 전용 색 — 활성 체크(파랑)와 다른 회색으로 구분한다(사용자
 * 지시). `[data-disabled][data-checked]` 2속성 선택자라 `data-checked:bg-primary`
 * (1속성)보다 항상 우선한다.
 *
 * ⚠ **공용 `Checkbox.tsx`의 `disabled:*` 버그는 이슈 113으로 고쳐졌다**
 * (`data-disabled:*`로 교체 — Base UI `Checkbox.Root`가 `<span role="checkbox">`로
 * 렌더돼 네이티브 `disabled` 속성이 없고 `data-disabled` 어트리뷰트만 쓰기
 * 때문이었다, decision-log D41). 그런데 이 로컬 클래스는 **여전히 필요하다** —
 * 공용 컴포넌트가 고쳐져도 주는 건 "흐릿한 파랑"(`data-disabled:opacity-50`,
 * 불투명도만 낮춤)이지, 이 화면이 원하는 "뚜렷한 회색"(다른 배경·테두리·글자색)이
 * 아니다. 두 클래스는 겹치는 CSS 속성이 없어(opacity·cursor vs
 * border·background·text-color) 공용 클래스 위에 이 오버라이드가 그대로 얹힌다 —
 * 충돌도 중복도 아니다.
 */
const DISABLED_CHECKED_CLASS =
  'data-disabled:data-checked:border-border-strong data-disabled:data-checked:bg-neutral-soft data-disabled:data-checked:text-fg-subtle'

/**
 * 기본 기한 — "3일 뒤와 다음 프로젝트 제출일 중 빠른 쪽"(정의서·와이어)의 목업 근사값.
 * `date`가 `Date | undefined`인 이유는 아래 `deadlineValid`·`handleSend` 주석 참고 —
 * 달력에서 날짜를 지울 수 있고, 그때는 활성화를 막는다(타입만 넓혔다, 동작은 원래도 이랬다).
 */
function defaultDeadline(): { date: Date | undefined; time: string } {
  const d = new Date(TODAY)
  d.setDate(d.getDate() + 3)
  return { date: d, time: '18:00' }
}

function weekdayLabel(d: Date): string {
  return `${format(d, 'yyyy-MM-dd')} (${WEEKDAY[d.getDay()]})`
}

export default function RetrySendDialog({ open, onOpenChange, projectId, result, onSent }: Props) {
  const candidates = result.people
    .map((p) => ({ p, names: retryConceptNames(p, result.classWarnings) }))
    .filter(({ p, names }) => names.length > 0 || p.retrySentAt)

  // ⚠ 사용자 지적(2026-08-08) — 전엔 아직 안 보낸 대상 전원을 기본 체크해 뒀는데,
  // 그러면 다이얼로그를 열기만 해도 "전원 활성화" 상태로 시작한다 — 매니저가
  // 직접 고른 게 아니라 대량 발송이 기본값이 되는 셈이라 위험하다. 이제
  // 아무도 기본 체크되지 않는다(빈 Set) — 이미 활성화된 사람(`retrySentAt`
  // 있음)은 이 Set과 무관하게 항상 잠긴 체크로 보인다(아래 Checkbox `checked`
  // 분기), 그 사람들 상태 표시용일 뿐 이 Set에 안 들어간다.
  const defaultChecked = () => new Set<string>()

  const [checked, setChecked] = useState<Set<string>>(defaultChecked)
  const [sending, setSending] = useState(false)
  const [{ date: dueDate, time: dueTime }, setDeadline] = useState(defaultDeadline)

  useEffect(() => {
    if (!open) return
    setChecked(defaultChecked())
    setDeadline(defaultDeadline())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function toggle(id: string) {
    const next = new Set(checked)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setChecked(next)
  }

  const checkedCandidates = candidates.filter((c) => checked.has(c.p.person.id))
  const conceptCount = checkedCandidates.reduce((n, c) => n + c.names.length, 0)
  // 날짜 없이는 활성화 기한을 만들 수 없다 — 지워도(달력 재선택 취소) 활성화를 막는다
  const deadlineValid = !!dueDate && !!dueTime

  async function handleSend() {
    if (!dueDate || !dueTime) return
    setSending(true)
    try {
      const dueAt = `${format(dueDate, 'yyyy-MM-dd')}T${dueTime}`
      await sendRetry(projectId, [...checked], dueAt)
      onOpenChange(false)
      onSent()
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85svh] flex-col sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>다시 보기 활성화 · 막힌 개념으로 자동 지정됨</DialogTitle>
        </DialogHeader>

        <p className="text-fg-subtle -mt-2 text-xs">받는 사람 · 체크한 사람만 활성화됩니다</p>

        <div className="border-border min-h-0 flex-1 overflow-y-auto rounded-md border">
          {candidates.length === 0 ? (
            <p className="text-fg-subtle p-4 text-center text-sm">다시 보기 대상이 없어요.</p>
          ) : (
            candidates.map(({ p, names }) => {
              const status = retryStatus(p)
              return (
                <label
                  key={p.person.id}
                  className="border-border flex items-center gap-2 border-b px-3 py-2 text-sm last:border-0"
                >
                  <Checkbox
                    checked={p.retrySentAt ? true : checked.has(p.person.id)}
                    disabled={!!p.retrySentAt}
                    onCheckedChange={() => toggle(p.person.id)}
                    className={DISABLED_CHECKED_CLASS}
                  />
                  <span className="flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="block">{p.person.name}</span>
                      <Badge variant={RETRY_STATUS_VARIANT[status]}>{status}</Badge>
                    </span>
                    {names.length > 0 && (
                      <span className="text-fg-subtle block text-2xs">{names.join(' · ')}</span>
                    )}
                  </span>
                </label>
              )
            })
          )}
        </div>

        {result.classWarnings.length > 0 && (
          <p className="text-fg-subtle text-2xs">
            {result.classWarnings.map((w, i) => (
              <span key={w.concept}>
                {i > 0 && ' '}
                {w.concept}은 목록에 없어요 — 반 절반이 막힌 개념이라 반 전체에 안내하는 편이
                맞습니다.
              </span>
            ))}
          </p>
        )}

        <div>
          <p className="text-fg-muted mb-1.5 text-xs font-bold">기한</p>
          <div className="flex items-center gap-2">
            <DueDateField date={dueDate} onDate={(d) => setDeadline((v) => ({ ...v, date: d }))} />
            <Input
              type="time"
              aria-label="기한 시각"
              value={dueTime}
              onChange={(e) => setDeadline((v) => ({ ...v, time: e.target.value }))}
              className="w-32 shrink-0"
            />
          </div>
          <p className="text-fg-subtle mt-1.5 text-2xs">
            기본값은 3일 뒤 18:00입니다 — 직접 바꿀 수 있어요. 결과는 기록에만 남고 판정에 반영되지
            않아요.
          </p>
        </div>

        <DialogFooter className="sm:justify-between">
          <p className="text-fg-subtle self-center text-xs">
            {checkedCandidates.length}명 · 개념 {conceptCount}건
            {dueDate && (
              <>
                {' '}
                · {weekdayLabel(dueDate)} {dueTime}
              </>
            )}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button
              disabled={checkedCandidates.length === 0 || !deadlineValid || sending}
              onClick={handleSend}
            >
              {sending ? '활성화하는 중…' : '활성화'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** 기한 날짜 선택 — 오늘 이전은 고를 수 없다(지난 기한으로 활성화하는 걸 막는다) */
function DueDateField({
  date,
  onDate,
}: {
  date: Date | undefined
  onDate: (d: Date | undefined) => void
}) {
  const [open, setOpen] = useState(false)
  const disabled: Matcher[] = [{ before: TODAY }]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            className="flex-1 justify-start font-normal"
            aria-label="기한 날짜"
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
