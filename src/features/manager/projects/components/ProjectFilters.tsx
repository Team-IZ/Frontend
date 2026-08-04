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
import {
  KIND_LABEL,
  STATUS_LABEL,
  type ClassName,
  type ProjectKind,
  type ProjectSort,
  type ProjectStatus,
} from '../mockData'
import { ALL, type FilterValues } from '../filterState'

/*
  목록 툴바 — 검색·상태·반·유형·교안·정렬. 순서·구성을 팀장님의 실제 OP-03 화면
  (검색→상태→유형→교안→|→정렬)에 맞추되, OP-03에 없는 매니저 전용 축(반)을
  **상태와 유형 사이**에 넣는다(사용자 지시, 4차 반영 — 3차에서 뺐다가 되돌렸다).

  **정렬을 2종으로 줄였다**(프로젝트 시작 순 · 마감 임박 순) — "준비 필요 순"은
  매니저에게 뜻이 없어서(확정 권한이 없다) 사용자가 직접 뺐다.

  **상태 옵션에 개수를 싣는다**(`전체 (6)`) — OP-03과 같은 이유(고르기 전에 분포를
  아는 것, 고르는 자리에 있어야 한다).

  **트리거 폭을 전부 고정한다**(`min-w-*`가 아니라 `w-*`). `SelectTrigger`
  기본 클래스가 `w-fit`이라, 폭을 최소값만 주면(`min-w-*`) 그 최소값보다 긴 값이
  선택됐을 땐 트리거가 늘어났다가 짧은 값을 고르면 다시 줄어든다 — 클릭할 때마다
  칸 크기 자체가 바뀌는 문제(사용자 지시로 5차 반영). 게다가 `SelectContent`가
  트리거 폭(`--anchor-width`)에 맞춰 열리는 공용 컴포넌트라, 트리거가 짧아진
  채로 열리면 긴 옵션(`Streamlit 실습 v1`)이 목록에서 잘리기도 했다(교안 필터,
  4차 반영 당시 발견). `w-*` 고정폭을 각 필터의 최장 옵션 기준으로 넉넉히 주면
  두 문제가 한 번에 없어진다 — 공용 `Select` 자체는 고치지 않는다(앱 전체 영향
  회피, 4차 반영과 같은 판단).
*/

const items = (prefix: string, options: { value: string; label: string }[]) =>
  Object.fromEntries(options.map((o) => [o.value, `${prefix} · ${o.label}`]))

type Props = FilterValues & {
  classes: ClassName[]
  /** 이 기수에서 실제로 쓰이는 교안 — 교안 필터 선택지(`CURRICULUM_OPTIONS`) */
  curricula: string[]
  /** 상태별 개수 — 필터와 무관한 전체 모집단 기준(`ProjectListResult.counts`) */
  counts?: Record<ProjectStatus, number>
  onChange: (patch: Partial<FilterValues>) => void
}

const sum = (c: Record<ProjectStatus, number>) => Object.values(c).reduce((a, b) => a + b, 0)

const SORT_OPTIONS: { value: ProjectSort; label: string }[] = [
  { value: 'START', label: '프로젝트 시작 순' },
  { value: 'DUE', label: '마감 임박 순' },
]

export default function ProjectFilters({
  search,
  status,
  classFilter,
  kind,
  curriculum,
  sort,
  classes,
  curricula,
  counts,
  onChange,
}: Props) {
  const statusOptions = [
    { value: ALL, label: counts ? `전체 (${sum(counts)})` : '전체' },
    ...(Object.keys(STATUS_LABEL) as ProjectStatus[]).map((s) => ({
      value: s,
      label: counts ? `${STATUS_LABEL[s]} (${counts[s]})` : STATUS_LABEL[s],
    })),
  ]
  const classOptions = [
    { value: ALL, label: '전체' },
    ...classes.map((c) => ({ value: c, label: c })),
  ]
  const kindOptions = [
    { value: ALL, label: '전체' },
    ...(Object.keys(KIND_LABEL) as ProjectKind[]).map((k) => ({ value: k, label: KIND_LABEL[k] })),
  ]
  const curriculumOptions = [
    { value: ALL, label: '전체' },
    ...curricula.map((c) => ({ value: c, label: c })),
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

      <FilterSelect
        label="상태"
        value={status}
        options={statusOptions}
        onChange={(v) => onChange({ status: v })}
        className="w-44"
      />
      <FilterSelect
        label="반"
        value={classFilter}
        options={classOptions}
        onChange={(v) => onChange({ classFilter: v })}
        className="w-32"
      />
      <FilterSelect
        label="유형"
        value={kind}
        options={kindOptions}
        onChange={(v) => onChange({ kind: v })}
        className="w-44"
      />
      <FilterSelect
        label="교안"
        value={curriculum}
        options={curriculumOptions}
        onChange={(v) => onChange({ curriculum: v })}
        className="w-56"
      />

      <span className="bg-border mx-1 h-5 w-px" />

      <FilterSelect
        label="정렬"
        value={sort}
        options={SORT_OPTIONS}
        onChange={(v) => onChange({ sort: v as ProjectSort })}
        className="w-48"
      />
    </div>
  )
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  className = 'w-28',
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
