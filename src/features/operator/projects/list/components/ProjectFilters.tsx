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
import { KIND_LABEL, STATUS_LABEL } from '../../labels'
import type { Curriculum, ProjectKind, ProjectSort, ProjectStatus } from '../../types'
import { ALL, type FilterValues } from '../filterState'

/*
  목록 툴바 — 검색·필터·정렬. **전부 왼쪽에 둔다**(E3 표 3단 배치). 오른쪽을 비우는
  이유는 주 액션이 화면 제목 줄(PageHeader)에 있기 때문이다 — 툴바 오른쪽에도 버튼을
  두면 주 액션이 둘로 보인다.

  **값을 갖지 않는다.** 고른 값은 화면이 들고 서버 쿼리로 나간다 — 이 컴포넌트가
  상태를 가지면 화면이 무엇으로 조회 중인지 두 곳을 봐야 알 수 있다.
*/

const KIND_OPTIONS = [
  { value: ALL, label: '전체' },
  ...(Object.keys(KIND_LABEL) as ProjectKind[]).map((k) => ({ value: k, label: KIND_LABEL[k] })),
]

const STATUS_OPTIONS = [
  { value: ALL, label: '전체' },
  ...(Object.keys(STATUS_LABEL) as ProjectStatus[]).map((s) => ({
    value: s,
    label: STATUS_LABEL[s],
  })),
]

/**
 * 정렬 — **기본은 `준비 필요 순`**(매니저 MG-07은 최신순). 예정 회차가 매니저에게는
 * 빈 행이고 오퍼레이터에게는 맨 위다. 정렬 자체는 서버가 한다.
 */
const SORT_OPTIONS: { value: ProjectSort; label: string }[] = [
  { value: 'PREP_FIRST', label: '준비 필요 순' },
  { value: 'DUE', label: '마감 임박 순' },
]

type Props = FilterValues & {
  curricula: Curriculum[]
  onChange: (patch: Partial<FilterValues>) => void
}

/** 라벨 접두사를 붙인 선택지 맵 — Select가 닫힌 상태에서 무엇으로 거른 건지 읽히게 */
const items = (prefix: string, options: { value: string; label: string }[]) =>
  Object.fromEntries(options.map((o) => [o.value, `${prefix} · ${o.label}`]))

export default function ProjectFilters({
  search,
  curriculumId,
  kind,
  status,
  sort,
  curricula,
  onChange,
}: Props) {
  const curriculumOptions = [
    { value: ALL, label: '전체' },
    ...curricula.map((c) => ({ value: c.id, label: c.name })),
  ]

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <InputGroup className="h-9 w-60">
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          value={search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder="프로젝트명 검색"
          aria-label="프로젝트 검색"
        />
        {search && (
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              size="icon-xs"
              aria-label="검색어 지우기"
              onClick={() => onChange({ search: '' })}
            >
              <XIcon />
            </InputGroupButton>
          </InputGroupAddon>
        )}
      </InputGroup>

      {/*
        교안 필터 — 매니저에게는 없는 필요다. 교안을 **재분석하면 `teaches`가 바뀌므로**
        어느 회차가 영향받는지 좁혀 봐야 한다.
      */}
      <FilterSelect
        label="교안"
        value={curriculumId}
        options={curriculumOptions}
        onChange={(v) => onChange({ curriculumId: v })}
        className="min-w-32"
      />
      <FilterSelect
        label="유형"
        value={kind}
        options={KIND_OPTIONS}
        onChange={(v) => onChange({ kind: v })}
      />
      <FilterSelect
        label="상태"
        value={status}
        options={STATUS_OPTIONS}
        onChange={(v) => onChange({ status: v })}
      />
      <FilterSelect
        label="정렬"
        value={sort}
        options={SORT_OPTIONS}
        onChange={(v) => onChange({ sort: v as ProjectSort })}
        className="min-w-36"
      />
    </div>
  )
}

/** 필터 드롭다운 하나. 넷이 같은 모양이라 여기서 한 번만 조립한다 */
function FilterSelect({
  label,
  value,
  options,
  onChange,
  className = 'min-w-28',
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  className?: string
}) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v ?? options[0].value)}
      items={items(label, options)}
    >
      <SelectTrigger className={`h-9 ${className}`} aria-label={`${label} 필터`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {label} · {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
