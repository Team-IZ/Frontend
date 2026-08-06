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
  CLASS_OPTIONS,
  RISK_LABEL,
  RISK_TYPE_OPTIONS,
  ROUND_OPTIONS,
  STATUS_LABEL,
  type CaseRisk,
  type InterviewCounts,
} from '../mockData'
import { ALL, type FilterValues } from '../filterState'

/*
  목록 툴바 — 회차 · 이름 검색 · 상태 · 반 · 위험 유형. MG-07 `ProjectFilters`와
  같은 조립(트리거 폭 고정, 개수 있는 옵션엔 개수 싣기).

  ⚠ 위험 유형·반 필터 추가(사용자 지시, 렌더 확인 후) — 위험 유형은 상태처럼
  옵션에 개수를 싣고(`riskCounts`), 반은 MG-07 `ProjectFilters`의 반 필터와 같이
  개수 없이 이름만(그 필터엔 애초에 개수가 없었다 — 반은 검색 스코프를 좁히는
  용도지, 분포를 보여주는 용도가 아니라는 판단을 그대로 따랐다). 순서는 상태 →
  반 → 위험 유형(사용자 지시) — 상태·반은 흔히 같이 좁혀 보는 축이라 붙이고,
  위험 유형은 옵션 라벨이 길어 맨 끝에 둬도 다른 트리거를 밀지 않는다.

  ⚠ **정렬 안내 고정 문구를 없앴다**(사용자 지시, 렌더 확인 후) — 정렬 자체는
  여전히 사용자가 못 고른다(정의서 §3, `mockData.ts`의 `sortCases`가 고정 규칙을
  가짐), 그런데 "정렬 OO 순"이라는 안내 문구는 이 레포 다른 목록 화면(MG-07
  등)에 없던 것을 이 화면에만 새로 만든 것이었다 — 사용자가 "보여주는 이유가
  없는 것 같다"고 지적했고 맞는 지적이라 판단해 지웠다(고르지도 못하는 값을
  굳이 문구로 설명할 필요는 없다 — 이상하면 필요할 때 표에서 직접 확인하면 된다).
*/

const items = (prefix: string, options: { value: string; label: string }[]) =>
  Object.fromEntries(options.map((o) => [o.value, `${prefix} · ${o.label}`]))

type Props = FilterValues & {
  counts?: InterviewCounts
  riskCounts?: Record<CaseRisk['type'], number>
  onChange: (patch: Partial<FilterValues>) => void
}

const sum = (c: InterviewCounts) => c.PLANNED + c.DONE + c.EXCLUDED
const sumRisk = (c: Record<CaseRisk['type'], number>) =>
  c.INVALID + c.LOW_PERSISTENT + c.DECLINE + c.OBSERVE

export default function InterviewFilters({
  round,
  search,
  status,
  riskType,
  classFilter,
  counts,
  riskCounts,
  onChange,
}: Props) {
  const statusOptions = [
    { value: ALL, label: counts ? `전체 (${sum(counts)})` : '전체' },
    ...(Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[]).map((s) => ({
      value: s,
      label: counts ? `${STATUS_LABEL[s]} (${counts[s]})` : STATUS_LABEL[s],
    })),
  ]

  const riskOptions = [
    { value: ALL, label: riskCounts ? `전체 (${sumRisk(riskCounts)})` : '전체' },
    ...RISK_TYPE_OPTIONS.map((t) => ({
      value: t,
      label: riskCounts ? `${RISK_LABEL[t]} (${riskCounts[t]})` : RISK_LABEL[t],
    })),
  ]

  const classOptions = [
    { value: ALL, label: '전체' },
    ...CLASS_OPTIONS.map((c) => ({ value: c, label: c })),
  ]

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <FilterSelect
        label="회차"
        value={round}
        options={ROUND_OPTIONS}
        onChange={(v) => onChange({ round: v as FilterValues['round'] })}
        className="w-44"
      />

      <InputGroup className="h-9 w-60">
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          value={search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder="이름 검색"
          aria-label="이름 검색"
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
        className="w-32"
      />

      <FilterSelect
        label="반"
        value={classFilter}
        options={classOptions}
        onChange={(v) => onChange({ classFilter: v })}
        className="w-28"
      />

      <FilterSelect
        label="위험 유형"
        value={riskType}
        options={riskOptions}
        onChange={(v) => onChange({ riskType: v })}
        className="w-60"
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
