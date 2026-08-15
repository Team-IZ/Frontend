import { SearchIcon, XIcon } from 'lucide-react'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/InputGroup'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import ControlLabel from '@/components/common/ControlLabel'
import type { FilterOption } from '../filterState'

/*
  툴바 조각 — 검색과 필터 드롭다운. **전부 왼쪽에 둔다**(E3 표 3단 배치). 오른쪽을
  비우는 이유는 주 액션이 제목 줄에 있기 때문이다 — 툴바 오른쪽에도 버튼을 두면 주
  액션이 둘로 보인다.

  **값을 갖지 않는다.** 고른 값은 화면이 들고 서버 쿼리로 나간다 — 이 컴포넌트가 상태를
  가지면 화면이 무엇으로 조회 중인지 두 곳을 봐야 알 수 있다.

  OP-03의 `ProjectFilters`가 같은 조합을 갖고 있다. **아직 공용으로 올리지 않는다** —
  거기는 필터 축이 화면에 고정(교안·유형·상태·정렬)이라 컴포넌트 하나가 그것을 통째로
  그리고, 여기는 탭마다 축이 달라 조각으로 받아 조립한다. 두 번째 등장이라 기록만
  남긴다(decision-log D14 — 세 번째에 올린다).
*/

export function SearchBox({
  value,
  onChange,
  placeholder,
  label,
  className = 'w-60',
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  /** 스크린리더용. 시각 라벨이 없는 검색창이라 이것이 유일한 이름이다 */
  label: string
  className?: string
}) {
  return (
    <InputGroup className={`h-9 ${className}`}>
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
      />
      {value && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton size="icon-xs" aria-label="검색어 지우기" onClick={() => onChange('')}>
            <XIcon />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  )
}

/**
 * 필터 드롭다운 하나.
 *
 * 닫힌 상태에서 무엇으로 거른 건지가 보여야 한다. **다만 이름표를 값에 섞지 않는다** —
 * 이름표는 컨트롤 안 왼쪽(`ControlLabel`)이 갖고, 옵션은 값만 말한다.
 *
 * 한때 `{label} · {값}`을 **옵션마다** 넣었다. 그러면 열었을 때
 * `상태 · 전체 / 상태 · 활성 / 상태 · 초대 대기 / 상태 · 정지`가 되어 접두사가 4번
 * 반복되고, 스크린리더도 항목마다 그것을 읽는다. **이미 그 컨트롤 안에 있는데** 말이다.
 * OP-02가 같은 이유로 먼저 걷어냈고(`ProjectFilters`), 거기서는 파일명이 값으로 들어가
 * 트리거가 580px까지 자라 **툴바가 두 줄로 접히는** 일까지 있었다. 여기 값은 짧아
 * 그 사고는 안 나지만, 같은 앱에서 같은 일을 두 가지로 할 이유가 없다.
 *
 * 드롭다운에 사용법 문장을 쓰지 않는다(E10) — 컨트롤 모양이 이미 그 말이다.
 */
export function FilterSelect({
  label,
  value,
  options,
  onChange,
  className = 'min-w-28',
}: {
  label: string
  value: string
  options: FilterOption[]
  onChange: (value: string) => void
  className?: string
}) {
  const items = Object.fromEntries(options.map((o) => [o.value, o.label]))
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange((v as string | null) ?? options[0].value)}
      items={items}
    >
      <SelectTrigger className={`h-9 ${className}`} aria-label={`${label} 필터`}>
        <ControlLabel>{label}</ControlLabel>
        <SelectValue className="truncate" />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
