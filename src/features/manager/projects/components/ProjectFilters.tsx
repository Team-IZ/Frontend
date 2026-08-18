import { SearchIcon, XIcon } from 'lucide-react'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/InputGroup'
import { SORT_LABEL, STATUS_LABEL, type ProjectSort, type ProjectStatus } from '../_/api/listTypes'
import ServerFilterSelect from '@/components/common/FilterSelect'
import { ALL, type FilterValues } from '../filterState'

/*
  목록 툴바 — 검색·상태·반·교안·정렬. 순서·구성을 팀장님의 실제 OP-03 화면
  (검색→상태→교안→|→정렬)에 맞추되, OP-03에 없는 매니저 전용 축(반)을
  **상태와 교안 사이**에 넣는다(사용자 지시, 4차 반영 — 3차에서 뺐다가 되돌렸다).

  ⚠ 유형(미니/빅) 필터 삭제 — 사용자 지시로 프로젝트를 유형으로 나누지 않기로
  했다(렌더 비교 다음 세션 반영). `ProjectKind`·`KIND_LABEL` 자체가 `mockData.ts`
  에서 없어졌다 — 이 화면은 그 필터 UI만 뺀다.

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

type ClassOption = { classroomId: string; name: string }

type Props = FilterValues & {
  /**
   * 담당 반 — **아직 안 왔으면 `undefined`다**(규칙 E). 빈 배열로 뭉개면 「담당 반이
   * 없다」로 읽히는데, 담당 반이 0개인 매니저는 이 화면 자체를 못 본다.
   */
  classes: ClassOption[] | undefined
  /** 반 목록 조회가 실패했나 — 메뉴가 그 사실과 「다시 시도」를 그린다 */
  classesFailed?: boolean
  onRetryClasses?: () => void
  /** 상태별 개수 — 필터와 무관한 전체 모집단 기준(`counts`) */
  counts?: Record<string, number>
  onChange: (patch: Partial<FilterValues>) => void
}

const sum = (c: Record<string, number>) => Object.values(c).reduce((a, b) => a + b, 0)

/** 서버가 셋을 준다 — 목은 둘이었다(`READINESS`가 늘었다) */
const SORT_OPTIONS: { value: ProjectSort; label: string }[] = (
  Object.keys(SORT_LABEL) as ProjectSort[]
).map((v) => ({ value: v, label: SORT_LABEL[v] }))

export default function ProjectFilters({
  search,
  status,
  classFilter,
  sort,
  classes,
  classesFailed,
  onRetryClasses,
  counts,
  onChange,
}: Props) {
  const statusOptions = [
    { value: ALL, label: counts ? `전체 (${sum(counts)})` : '전체' },
    ...(Object.keys(STATUS_LABEL) as ProjectStatus[]).map((s) => ({
      value: s,
      label: counts ? `${STATUS_LABEL[s]} (${counts[s] ?? 0})` : STATUS_LABEL[s],
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

      <ServerFilterSelect
        label="상태"
        value={status}
        options={statusOptions}
        onChange={(v) => onChange({ status: v })}
        className="w-44"
      />
      {/*
        선택지가 서버에서 온다 — 늦거나 실패하면 **메뉴가** 말한다(공용 `FilterSelect`).
        값이 반 이름이 아니라 `classroomId`인 것은 반 이름이 기수마다 바뀌기 때문이다.
      */}
      <ServerFilterSelect
        label="반"
        value={classFilter}
        onChange={(v) => onChange({ classFilter: v })}
        fixed={[{ value: ALL, label: '전체' }]}
        options={classes?.map((c) => ({ value: c.classroomId, label: c.name }))}
        failed={classesFailed}
        onRetry={onRetryClasses}
      />
      {/*
        🔴 **교안 필터를 잠시 뺐다.** 서버는 `curriculumId`(UUID)를 받는데 선택지를 줄
        조회를 이 화면이 아직 안 부른다(`linked-curricula`가 그 자리다). 이름으로 보내면
        400이라, **고를 수 없는 것을 그리지 않는다**(규칙 F). 조회를 붙일 때 되살린다.
      */}

      <span className="bg-border mx-1 h-5 w-px" />

      <ServerFilterSelect
        label="정렬"
        value={sort}
        options={SORT_OPTIONS}
        onChange={(v) => onChange({ sort: v as ProjectSort })}
        className="w-48"
      />
    </div>
  )
}
