import { useState } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  CalendarIcon,
  EyeIcon,
  EyeOffIcon,
  PlusIcon,
  SearchIcon,
  UploadIcon,
  XIcon,
} from 'lucide-react'
import type { DateRange } from 'react-day-picker'

import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Calendar } from '@/components/ui/Calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover'
import { Field, FieldLabel, FieldDescription, FieldError } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/InputGroup'
import { ButtonGroup } from '@/components/ui/ButtonGroup'

/*
  docs/dev/input-inventory.md 의 10개 범주가 **지금 있는 컴포넌트로 되는지** 실제로
  조립해 확인하는 화면이다. 여기 렌더되는 것은 전부 새 파일 없이 조합만 한 것이다.

  검증 결과가 이 파일 자체다 — 안 되는 것은 여기 없다.
*/

function Case({
  id,
  title,
  note,
  children,
}: {
  id: string
  title: string
  note?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-fg-subtle text-xs font-semibold">
        <span className="text-primary">{id}</span> · {title}
      </p>
      <div className="max-w-md">{children}</div>
      {note && <p className="text-fg-subtle text-2xs">{note}</p>}
    </div>
  )
}

/* ── D. 날짜 — Popover + Calendar + Button 조합(shadcn 공식도 DatePicker 컴포넌트가 없다) ── */

function DatePickerSingle() {
  const [date, setDate] = useState<Date>()
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="ghost" className="w-56 justify-start font-normal">
            <CalendarIcon />
            {date ? format(date, 'yyyy-MM-dd') : <span className="text-fg-subtle">날짜 선택</span>}
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0">
        <Calendar mode="single" selected={date} onSelect={setDate} locale={ko} autoFocus />
      </PopoverContent>
    </Popover>
  )
}

function DatePickerRange() {
  const [range, setRange] = useState<DateRange>()
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="ghost" className="w-72 justify-start font-normal">
            <CalendarIcon />
            {range?.from ? (
              range.to ? (
                `${format(range.from, 'yyyy-MM-dd')} ~ ${format(range.to, 'yyyy-MM-dd')}`
              ) : (
                format(range.from, 'yyyy-MM-dd')
              )
            ) : (
              <span className="text-fg-subtle">기간 선택</span>
            )}
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="range"
          selected={range}
          onSelect={setRange}
          numberOfMonths={2}
          locale={ko}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}

/* ── F. 칩 입력 — InputGroup + Badge. 로직은 상태 배열 하나가 전부다 ── */

function ChipInput() {
  const [chips, setChips] = useState(['상태 관리', '비동기'])
  const [draft, setDraft] = useState('')

  function add() {
    const v = draft.trim()
    if (v && !chips.includes(v)) setChips([...chips, v])
    setDraft('')
  }

  /*
    미리보기에 쓸 값 — **담길 것과 같은 판정을 거친다.** 공백만 친 것이나 이미 있는
    항목은 담기지 않는데, 그것을 미리보기로 띄우면 화면이 거짓말을 한다.
    `null`이면 담을 것이 없다는 뜻이라 버튼도 같이 막힌다.
  */
  const trimmed = draft.trim()
  const preview = trimmed && !chips.includes(trimmed) ? trimmed : null

  return (
    <div className="flex flex-col gap-1.5">
      <InputGroup>
        {/* 칩 줄 — 확정된 것과 **지금 치는 것**이 같은 자리에 나란히 선다 */}
        {(chips.length > 0 || preview !== null) && (
          <InputGroupAddon align="block-start" className="flex-wrap gap-1">
            {chips.map((c) => (
              <Badge key={c} variant="info" className="gap-1">
                {c}
                <button
                  type="button"
                  aria-label={`${c} 제거`}
                  onClick={() => setChips(chips.filter((x) => x !== c))}
                  className="cursor-pointer"
                >
                  <XIcon className="size-3" />
                </button>
              </Badge>
            ))}

            {/*
              ⚠ **아직 확정 안 된 칩.** 점선 + 흐림으로 위 칩들과 구분한다 — 모양이 같으면
              이미 담긴 줄 알고 Enter를 안 친다.

              **이것이 이 조합의 핵심이다.** 예전에는 친 글자가 항목이 될 것인지를 화면이
              말하지 않아서, 팀원들이 *"등록이 안 된다"* 고 했다 — 안내 문구는 있었지만
              **비어 있을 때는 안 보였고**(그때 placeholder가 예시였다) 문구로는 안 읽혔다.
              문구로 가르치는 대신 **결과를 먼저 보여준다.**
            */}
            {preview !== null && (
              <Badge variant="neutral" className="border-dashed opacity-60" aria-hidden>
                {preview}
              </Badge>
            )}
          </InputGroupAddon>
        )}

        <InputGroupInput
          value={draft}
          placeholder={chips.length ? '초점 추가' : '예: 상태 관리'}
          aria-describedby="chip-help"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            /*
              ⚠ **조합 중 키는 IME 것이다 — 한글에서 이걸 빼면 칩이 두 개 생긴다.**
              `ㅂㅂㅂ`를 치는 동안은 조합이 안 끝난 상태인데 그때 Enter를 누르면 브라우저가
              keydown을 **두 번** 보낸다(조합 확정 하나 + 확정 뒤 하나). 그래서
              `ㅂㅂㅂㅇㅇㅇ`와 `ㅇ`이 각각 칩이 됐다 — 이 파일을 베껴 간 화면에서 실제로
              나온 버그다. **여기가 참조 구현이라 여기서 막아야 다시 안 퍼진다.**
            */
            if (e.nativeEvent.isComposing) return

            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
            // 빈 칸에서 Backspace = 마지막 칩 삭제(입력창의 관습)
            if (e.key === 'Backspace' && draft === '') setChips(chips.slice(0, -1))
          }}
          /*
            포커스를 잃을 때도 담는다 — 치고 나서 Enter를 안 누르고 다음 칸으로 넘어가는
            것이 흔한데, 그때 방금 친 것이 조용히 사라지면 무엇이 빠졌는지 모른다.
          */
          onBlur={() => draft.trim() && add()}
        />

        {/*
          **확정 수단이 눈에 보여야 한다.** 키보드만 쓰는 사람은 Enter, 마우스를 쓰는
          사람은 버튼, 아무것도 모르는 사람은 **버튼이 있으니 누른다.**
          못 누를 때 흐리게 두지 않고(C1) 자리만 지운다 — 비면 입력창이 넓어진다.
        */}
        {draft.trim().length > 0 && (
          <InputGroupAddon align="inline-end">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={preview === null}
              onMouseDown={(e) => e.preventDefault()} // blur보다 먼저 눌리게
              onClick={add}
            >
              <PlusIcon className="size-3.5" />
              추가
            </Button>
          </InputGroupAddon>
        )}
      </InputGroup>

      {/* 방법은 **늘 보인다** — 처음 쓰는 사람이 막히는 순간이 정확히 "비어 있을 때"다 */}
      <p
        id="chip-help"
        className={cn('text-2xs', preview === null && draft ? 'text-warning' : 'text-fg-subtle')}
      >
        {preview === null && draft ? '이미 있는 항목입니다' : 'Enter 또는 추가 버튼으로 담깁니다'}
      </p>
    </div>
  )
}

/* ── G. 파일 드롭존 — 유일하게 조합이 안 되는 자리(attachment에 drop 핸들러가 0개) ── */

function FileDropzone() {
  const [over, setOver] = useState(false)
  const [name, setName] = useState<string>()
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        setName(e.dataTransfer.files[0]?.name)
      }}
      className={[
        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed px-6 py-8 text-center transition-colors',
        over ? 'border-primary bg-primary-soft' : 'border-border-strong bg-surface-2',
      ].join(' ')}
    >
      <input
        type="file"
        accept=".zip"
        className="sr-only"
        onChange={(e) => setName(e.target.files?.[0]?.name)}
      />
      <UploadIcon className="text-fg-subtle size-5" />
      <span className="text-sm">{name ?? '여기로 .zip 파일을 끌어놓거나 클릭해서 선택'}</span>
    </label>
  )
}

export default function InputCompositionsPreview() {
  const [q, setQ] = useState('')
  const [showPw, setShowPw] = useState(false)

  return (
    <div className="flex flex-col gap-7">
      <p className="text-fg-muted text-xs">
        docs/dev/input-inventory.md 의 범주가 <b>새 컴포넌트 없이</b> 되는지 확인하는 자리. 여기
        있는 건 전부 기존 컴포넌트 조합이다 — G(드롭존)만 예외.
      </p>

      <Case id="A" title="기본 타입 — Field + Input, type만 다름">
        <div className="flex flex-col gap-3">
          <Field>
            <FieldLabel htmlFor="c-text">기수명 · text</FieldLabel>
            <Input id="c-text" placeholder="예: 9기" />
          </Field>

          <Field>
            <FieldLabel htmlFor="c-email">이메일 · email</FieldLabel>
            <Input id="c-email" type="email" placeholder="manager@org.com" />
            <FieldDescription>초대 메일이 이 주소로 갑니다.</FieldDescription>
          </Field>

          {/*
            비밀번호는 표시 토글이 붙는다. 가려진 값은 오타를 확인할 방법이 없어서,
            토글이 없으면 틀린 줄 모르고 계속 다시 친다.
            Caps Lock 경고는 features/auth/useCapsLockWarning.ts에 이미 있다.
          */}
          <Field>
            <FieldLabel htmlFor="c-pw">비밀번호 · password</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="c-pw"
                type={showPw ? 'text' : 'password'}
                defaultValue="pass1234"
                autoComplete="current-password"
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-xs"
                  aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 표시'}
                  aria-pressed={showPw}
                  onClick={() => setShowPw(!showPw)}
                >
                  {showPw ? <EyeOffIcon /> : <EyeIcon />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            <FieldDescription>영문·숫자 포함 8자 이상</FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="c-url">저장소 주소 · url</FieldLabel>
            <Input id="c-url" type="url" placeholder="https://github.com/사용자명/저장소" />
          </Field>

          <Field data-invalid>
            <FieldLabel htmlFor="c-org">기관명 · text + 오류</FieldLabel>
            <Input id="c-org" aria-invalid defaultValue="그린컴퍼니 부트캠프" />
            <FieldError>이미 존재하는 기관명입니다.</FieldError>
          </Field>
          {/*
            ⚠️ Field는 `*:w-full`로 **직계 자식의 폭을 강제**한다(자식 선택자라 자식이 가진
            `w-28`보다 명시도가 높다). 좁은 칸이 필요하면 `!`로 덮거나 div로 한 겹 감싼다.
            숫자는 우측 정렬 + tabular-nums — 왼쪽 정렬하면 자릿수 비교가 안 된다.
          */}
          <Field>
            <FieldLabel htmlFor="c-num">질문 수</FieldLabel>
            <Input
              id="c-num"
              type="number"
              defaultValue={5}
              className="w-28! text-right tabular-nums"
            />
          </Field>
        </div>
      </Case>

      <Case
        id="B"
        title="검색 — InputGroup + 🔍 + 지우기"
        note="값이 있을 때만 ✕가 나온다. 항상 떠 있으면 지울 게 없는데도 누를 수 있어 보인다."
      >
        {/* 툴바에 놓이는 검색은 h-9 — 옆의 select(36px)와 높이를 맞춘다. 폼 안이면 기본 h-10 */}
        <InputGroup className="h-9 w-60">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="이름 · 이메일 검색"
          />
          {q && (
            <InputGroupAddon align="inline-end">
              {/* 아이콘 액션은 size="icon-xs" — 글자 액션(변경)과 색·굵기가 다르다 */}
              <InputGroupButton size="icon-xs" aria-label="검색어 지우기" onClick={() => setQ('')}>
                <XIcon />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>
      </Case>

      <Case id="C" title="여러 줄 — Textarea (세션 답변은 Enter=줄바꿈)">
        <Field>
          <FieldLabel htmlFor="c-ta">개입 사유</FieldLabel>
          <Textarea id="c-ta" placeholder="사유를 입력하세요" />
        </Field>
      </Case>

      <Case
        id="D"
        title="날짜 — Popover + Calendar + Button (단일 / 범위)"
        note="shadcn 공식도 DatePicker 루트 컴포넌트가 없다. react-day-picker v10 + date-fns 모두 설치돼 있다."
      >
        <div className="flex flex-wrap gap-3">
          <DatePickerSingle />
          <DatePickerRange />
        </div>
      </Case>

      <Case id="E" title="읽기전용 + 변경 — InputGroup(readOnly) + 배지">
        <InputGroup>
          <InputGroupInput readOnly value="minjun.dev@gmail.com" />
          <InputGroupAddon align="inline-end">
            <Badge variant="success">검증됨</Badge>
            <InputGroupButton>변경</InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </Case>

      <Case
        id="F"
        title="칩 입력 — InputGroup + Badge"
        note="빈 칸에서 Backspace를 누르면 마지막 칩이 지워진다(입력창의 관습)."
      >
        <ChipInput />
      </Case>

      <Case
        id="G"
        title="파일 드롭존 — ❌ 조합 불가, 직접 구현"
        note="attachment.tsx에 drop 핸들러가 0개다(올린 뒤 목록만 그린다). 끌어놓기 영역은 여기처럼 label + input[type=file]로 직접 만든다."
      >
        <FileDropzone />
      </Case>

      <Case id="H" title="명단 일괄 — Textarea + 파싱">
        <Field>
          <FieldLabel htmlFor="c-roster">명단 직접 입력</FieldLabel>
          <Textarea
            id="c-roster"
            rows={4}
            placeholder={'홍길동, hong@org.com\n김철수, kim@org.com'}
          />
          <FieldDescription>한 줄에 한 명. 이름, 이메일 순.</FieldDescription>
        </Field>
      </Case>

      <Case id="I" title="단위 접미 — InputGroupText">
        <div className="flex flex-wrap gap-3">
          <InputGroup className="w-40">
            <InputGroupAddon>
              <InputGroupText>$</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput type="number" defaultValue={600} className="text-right" />
          </InputGroup>
          <InputGroup className="w-40">
            <InputGroupInput type="number" defaultValue={180} className="text-right" />
            <InputGroupAddon align="inline-end">
              <InputGroupText>일</InputGroupText>
            </InputGroupAddon>
          </InputGroup>
        </div>
      </Case>

      <Case id="J" title="2지 토글 — ButtonGroup (제출 방식)">
        <ButtonGroup>
          <Button variant="primary" size="sm">
            GitHub 저장소
          </Button>
          <Button variant="ghost" size="sm">
            ZIP 업로드
          </Button>
        </ButtonGroup>
      </Case>
    </div>
  )
}
