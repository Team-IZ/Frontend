import { CircleHelp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ButtonGroup } from '@/components/ui/ButtonGroup'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/Popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { cn } from '@/lib/utils/cn'
import {
  ROUND_OPTIONS,
  CLASS_OPTIONS,
  type ClassName,
  type HeatmapLevel,
  type RoundId,
  type SortMode,
} from '../mockData'

/*
  툴바 — 프로젝트 select가 이 화면의 변수라 맨 왼쪽·크게 둔다(정의서 "회차 비교
  토글 자리에 프로젝트 select"). 계층(반별·팀·개인)은 2지가 아니라 3지라 InputCompositionsPreview
  J 규약(ButtonGroup)을 3버튼으로 확장했다 — OP-02 `RoundToolbar`의 2지 토글과 같은 조립.

  각 계층마다 필요한 선택 필터만 보인다(정의서 §3 표) — 반은 정렬·문제만, 팀은
  반 select·정렬, 팀원은 반·팀 select·정렬·위험만.

  ⚠ 버튼 라벨은 "반별/팀/개인"이었다가 "반/팀/팀원"으로 바꿨다(렌더 확인 후
  사용자 지시) — 셋 다 명사형으로 맞추고, "개인"은 그 계층에서 실제로 보여주는
  단위(팀 소속 개인 = 팀원)를 더 직접적으로 가리키게 했다.
*/
export default function HeatmapToolbar({
  round,
  level,
  classFilter,
  teamFilter,
  teamOptions,
  sort,
  problemOnly,
  riskOnly,
  onRoundChange,
  onLevelChange,
  onClassChange,
  onTeamChange,
  onSortChange,
  onProblemOnlyChange,
  onRiskOnlyChange,
}: {
  round: RoundId
  level: HeatmapLevel
  classFilter: ClassName
  teamFilter: string
  teamOptions: { id: string; name: string }[]
  sort: SortMode
  problemOnly: boolean
  riskOnly: boolean
  onRoundChange: (v: RoundId) => void
  onLevelChange: (v: HeatmapLevel) => void
  onClassChange: (v: ClassName) => void
  onTeamChange: (v: string) => void
  onSortChange: (v: SortMode) => void
  onProblemOnlyChange: (v: boolean) => void
  onRiskOnlyChange: (v: boolean) => void
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <Select
        value={round}
        onValueChange={(v) => onRoundChange((v ?? round) as RoundId)}
        items={ROUND_OPTIONS.map((o) => ({ value: o.value, label: `프로젝트 · ${o.label}` }))}
      >
        {/* SelectContent 폭이 트리거 폭(--anchor-width)을 그대로 물려받는다 — "프로젝트 ·
            미프 4차"가 다 들어갈 만큼 넉넉히 줘야 목록에서 글자와 체크 표시가 안
            겹친다(렌더 확인 후 w-36 → w-48) */}
        <SelectTrigger className="h-9 w-48 text-sm font-bold" aria-label="프로젝트">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ROUND_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              프로젝트 · {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <ButtonGroup>
        <Button
          variant={level === 'class' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => onLevelChange('class')}
        >
          반
        </Button>
        <Button
          variant={level === 'team' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => onLevelChange('team')}
        >
          팀
        </Button>
        <Button
          variant={level === 'person' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => onLevelChange('person')}
        >
          팀원
        </Button>
      </ButtonGroup>

      {(level === 'team' || level === 'person') && (
        <FilterSelect
          label="반"
          value={classFilter}
          options={CLASS_OPTIONS.map((c) => ({ value: c, label: c }))}
          onChange={(v) => onClassChange(v as ClassName)}
          className="w-24"
        />
      )}

      {level === 'person' && (
        <FilterSelect
          label="팀"
          value={teamFilter}
          options={teamOptions.map((t) => ({ value: t.id, label: t.name }))}
          onChange={onTeamChange}
          className="w-24"
        />
      )}

      <FilterSelect
        label="정렬"
        value={sort}
        options={[
          { value: 'DEFAULT', label: '기본' },
          { value: 'LOW_FIRST', label: '낮은 순' },
        ]}
        onChange={(v) => onSortChange(v as SortMode)}
        className="w-28"
      />

      {/* "반 문제만"·"위험만"이었다가 "반 : 위험"·"팀원 : 위험"으로 바꿨다(렌더
          확인 후 사용자 지시) — "문제"라는 말이 뭘 가리키는지 애매하다는 지적.
          집단 미달·위험 배지 둘 다 결국 같은 개념(위험 신호)이라 두 토글의
          어휘를 "대상 : 위험"으로 통일했다. 콜론 양옆 1칸은 표 안 "세로 : X"·
          "가로 : X" 축 라벨과 같은 간격 규칙(렌더 확인 후 사용자 지시,
          `HeatmapTable.tsx`).

          ⚠ **팀 계층에도 같은 토글을 추가했다**(사용자 제안, 이번 라운드) — 처음엔
          반별에만 있었는데, "팀에도 있는 게 좋지 않을까?" 하는 지적을 받고 보니
          팀 행도 반 행과 똑같이 `cell.flagged`(집단 미달)를 갖고 있어 같은 필터를
          그대로 재사용할 수 있었다(`mockData.ts`의 `problemOnly` 분기를 team
          레벨에도 추가). 상태(`problemOnly`)를 새로 안 만들고 기존 것을 공유한다
          — class·team은 서로 배타적으로만 보이는 탭이라 하나의 상태를 같이 써도
          꼬이지 않는다. */}
      {(level === 'class' || level === 'team') && (
        <TogglePill active={problemOnly} onClick={() => onProblemOnlyChange(!problemOnly)}>
          ⚠ {level === 'class' ? '반' : '팀'} : 위험
        </TogglePill>
      )}

      {level === 'person' && (
        <TogglePill active={riskOnly} onClick={() => onRiskOnlyChange(!riskOnly)}>
          ⚠ 팀원 : 위험
        </TogglePill>
      )}

      {/* "위험" 판정 기준을 설명하는 도움말 버튼(사용자 지시) — 반/팀은 집단 통계
          기준, 팀원은 개인 배지 기준으로 서로 다른데 이름만 봐서는 안 드러난다
          ("위험 팀원이 왜 항상 0명이냐"는 질문이 실제로 나왔다). 계층에 상관없이
          항상 보이게 뒀다 — 세 계층 기준을 한 번에 설명하는 내용이라 특정
          계층에서만 보이면 다른 계층에 있을 때는 못 찾는다.

          트리거는 위험 토글(⚠, 앰버 필 스타일)과 헷갈리지 않게 일부러 다른 아이콘
          (`CircleHelp`)·중립색을 썼다 — 같은 ⚠를 쓰면 이 버튼도 필터처럼 보인다.
          `Popover`는 `UiPreviewScreen.tsx`의 "SC-M10 코치마크" 용례를 그대로
          따랐다(정의서 밖 새 UI라 기존 패턴을 재사용).

          ⚠ `ml-auto`로 오른쪽 끝에 붙였다(사용자 지시, 이번 라운드) — §6 "툴바는
          전부 좌측, 우측 비움"과는 결이 다르지만, 이건 필터가 아니라 도움말이라
          "필터 줄의 다른 액션들과 나란히 좌측에 쌓인 것"보다 "줄 끝에 따로 뗀 것"
          이 여기서는 더 명확하다고 판단해 그대로 반영했다. */}
      <Popover>
        <PopoverTrigger
          render={
            <button
              type="button"
              className="ml-auto flex items-center gap-1 rounded-full border border-border-strong bg-surface-2 px-3 py-1.5 text-xs text-fg-muted hover:bg-canvas"
            >
              <CircleHelp className="size-3.5" aria-hidden="true" />
              위험 기준?
            </button>
          }
        />
        <PopoverContent className="w-80" align="end">
          <PopoverHeader>
            <PopoverTitle>&ldquo;위험&rdquo; 판정 기준</PopoverTitle>
          </PopoverHeader>
          <PopoverDescription className="flex flex-col gap-2">
            <span>
              <b className="font-semibold text-fg">반 · 팀 위험</b> — 검증 개념 3개 중 하나라도{' '}
              <b className="font-semibold text-fg">그 반(팀) 인원의 절반 이상이 2단 이하</b>를
              받으면 위험으로 표시돼요. 개인 점수가 아니라 집단 전체의 통계예요.
            </span>
            <span>
              <b className="font-semibold text-fg">팀원 위험</b> —{' '}
              <b className="font-semibold text-fg">
                &ldquo;단계 하락&rdquo;·&ldquo;지속 저점&rdquo;
              </b>{' '}
              배지가 붙어 있거나, 검증 개념 중 하나라도{' '}
              <b className="font-semibold text-fg">0단·1단</b>을 받았으면 해당돼요. 배지는 직전
              회차와 비교해야 매길 수 있어서 최소 3차부터 나오지만, 0단·1단은 그 회차 점수만 보기
              때문에 회차와 상관없이 바로 적용돼요.
            </span>
          </PopoverDescription>
        </PopoverContent>
      </Popover>
    </div>
  )
}

function TogglePill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full border px-3 py-1.5 text-xs',
        active
          ? 'border-primary-border bg-primary-soft font-semibold text-primary'
          : 'border-border-strong bg-surface-2 text-fg-muted',
      )}
    >
      {children}
    </button>
  )
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  className,
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
      onValueChange={(v) => onChange(v ?? options[0]?.value)}
      items={options.map((o) => ({ value: o.value, label: `${label} · ${o.label}` }))}
    >
      <SelectTrigger className={cn('h-9', className)} aria-label={`${label} 필터`}>
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
