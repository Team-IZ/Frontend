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
import { STATUS_LABEL } from '../../labels'
import type { Curriculum, ProjectSort, ProjectStatus } from '../../types'
import { ALL, type FilterValues } from '../filterState'

/*
  목록 툴바 — 검색·필터·정렬. **전부 왼쪽에 둔다**(E3 표 3단 배치). 오른쪽을 비우는
  이유는 주 액션이 화면 제목 줄(PageHeader)에 있기 때문이다 — 툴바 오른쪽에도 버튼을
  두면 주 액션이 둘로 보인다.

  ─── 배치 ────────────────────────────────────────────────────────
      [검색] [상태▾] [교안▾]  │  [정렬▾]

  ▸ **상태가 검색 바로 옆이다.** 이 화면의 주 동선이 *"준비 중만 보기"* 라 가장 많이
    쓰는 축이 가장 가깝다. 한때 교안을 지나야 닿았다.
  ▸ **정렬은 구분선 뒤다.** 필터는 **줄이는 것**, 정렬은 **순서를 바꾸는 것**이라 성격이
    다르다. 섞으면 `교안 · 전체`와 `정렬 · 준비 필요 순`이 같은 종류로 보인다.
  ▸ **접지 않는다.** 한때 교안을 `조건 더보기`에 넣었는데, **접힌 조건은 결과가 왜
    적은지를 숨긴다** — 필터가 걸린 채 접혀 있으면 빈 상태가 `조건에 맞는 회차가
    없습니다`라고만 하고 그 조건은 안 보인다. 셋 다 한 줄에 들어가므로 전부 편다.

  ▸ **상태 옵션에 개수가 붙는다**(`준비 중 (2)`). 개수는 **고르기 전에 분포를 아는 것**이
    목적이라 **고르는 자리**에 있어야 한다 — 한때 화면 제목 줄에 `준비 중 2 · 준비됨 2 ·
    진행 중 1 · 종료 2`를 늘어놨는데, 스코프 문구와 붙어 한 줄이 정신없었고 거기서는
    누를 수도 없었다.

  **값을 갖지 않는다.** 고른 값은 화면이 들고 서버 쿼리로 나간다 — 이 컴포넌트가
  상태를 가지면 화면이 무엇으로 조회 중인지 두 곳을 봐야 알 수 있다.
*/

/**
 * 정렬 — **기본은 `준비 필요 순`**(매니저 MG-07은 최신순). 예정 회차가 매니저에게는
 * 빈 행이고 오퍼레이터에게는 맨 위다. 정렬 자체는 서버가 한다.
 */
const SORT_OPTIONS: { value: ProjectSort; label: string }[] = [
  { value: 'PREP_FIRST', label: '준비 필요 순' },
  { value: 'START', label: '시작 임박 순' },
  { value: 'DUE', label: '마감 임박 순' },
]

type Props = FilterValues & {
  curricula: Curriculum[]
  /**
   * 상태별 개수 — **필터와 무관한 전체 모집단 기준**이다(`ProjectPage.counts`).
   * 고른 조건에 따라 줄어들면 *"고르면 몇 개가 되나"* 를 미리 알 수 없다.
   * 아직 안 왔으면 개수 없이 라벨만 그린다 — `0`으로 쓰면 없는 사실을 주장한다.
   */
  counts?: Record<ProjectStatus, number>
  /** 전체 회차 수. `counts`를 더하면 PLANNED를 두 번 센다(`ProjectPage.population`) */
  population?: number
  onChange: (patch: Partial<FilterValues>) => void
}

/** 라벨 접두사를 붙인 선택지 맵 — Select가 닫힌 상태에서 무엇으로 거른 건지 읽히게 */
const items = (prefix: string, options: { value: string; label: string }[]) =>
  Object.fromEntries(options.map((o) => [o.value, `${prefix} · ${o.label}`]))

export default function ProjectFilters({
  search,
  curriculumId,
  status,
  sort,
  curricula,
  counts,
  population,
  onChange,
}: Props) {
  /*
    상태 선택지 — 개수를 라벨에 싣는다. `전체`는 모집단이라 `population`을 따로 받는다.

    네 값이 전부 온다(10차 Q1의 `readinessCounts`). **아직 안 왔을 때만 라벨만 그린다** —
    `0`으로 채우면 없는 사실을 주장하게 되고, 개수가 0인 상태와 구분이 안 된다.
  */
  const statusOptions = [
    { value: ALL, label: population != null ? `전체 (${population})` : '전체' },
    ...(Object.keys(STATUS_LABEL) as ProjectStatus[]).map((st) => ({
      value: st,
      label: counts?.[st] != null ? `${STATUS_LABEL[st]} (${counts[st]})` : STATUS_LABEL[st],
    })),
  ]

  const curriculumOptions = [
    { value: ALL, label: '전체' },
    ...curricula.map((c) => ({
      value: c.versionId,
      label: `${c.originalFileName} v${c.versionNo}`,
    })),
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
        className="min-w-36"
      />
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

      {/* 정렬과 필터 사이 구분선 — 줄이는 것과 순서를 바꾸는 것은 다른 일이다 */}
      <span className="bg-border mx-1 h-5 w-px" />

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

/** 필터 드롭다운 하나. 셋이 같은 모양이라 여기서 한 번만 조립한다 */
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
