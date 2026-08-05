import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'

/*
  섹션 안 컨트롤 줄.

  **왜 따로 만들었나** — 전에는 토글과 칩을 그냥 표 위에 늘어놨는데, 배경도 테두리도
  없어서 "누를 수 있는 것"으로 안 보였다(사용자 지적: *"칩들이 위에 있는 게 티가 잘 안
  난다"*). 문서형 화면이라 주변이 온통 값과 표라, 컨트롤이 같은 바탕 위에 맨몸으로
  있으면 그냥 또 다른 라벨 줄로 읽힌다. **면을 깔아 컨트롤 구역을 만든다** — 이 한 줄
  안은 조작하는 곳이고 밖은 읽는 곳이라는 경계가 생긴다.

  **칩 나열이 아니라 드롭다운이다.** 칩은 개수만큼 줄이 늘어나(교안 20종이면 20개)
  컨트롤이 콘텐츠보다 커진다. 드롭다운은 닫혀 있을 때 한 칸이고, 닫힌 상태에 **고른
  값이 라벨과 함께 남아**(`교안 · 전체`) 무엇으로 거른 건지가 계속 보인다 —
  `admin/_/components/AdminFilters.tsx`의 `FilterSelect`와 같은 규칙이다(도메인 경계상
  import는 못 하지만 형태는 그대로 따른다).

  전부 **왼쪽**에 둔다(E3 표 3단 배치) — 이 섹션들엔 주 액션이 없으므로 오른쪽은 비운다.
  인쇄에는 나가지 않는다(`print:hidden`) — 종이엔 조작할 것이 없다.
*/
export default function ReportToolbar({
  children,
  note,
}: {
  children: React.ReactNode
  /** 지금 무엇만 보고 있는지 등, 컨트롤 상태를 말로 남기는 자리 */
  note?: React.ReactNode
}) {
  return (
    <div className="border-border bg-surface-2 mb-4 rounded-md border px-3 py-2.5 print:hidden">
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      {note && <p className="text-fg-subtle mt-2 text-2xs">{note}</p>}
    </div>
  )
}

/**
 * 필터 드롭다운 하나. **라벨 접두사를 값에도 붙인다**(`반 · 전체`) — 닫힌 상태에서
 * 무엇으로 거른 건지가 보여야 한다. 사용법 문장은 쓰지 않는다(E10) — 컨트롤 모양이
 * 이미 그 말이다.
 */
export function ToolbarSelect({
  label,
  value,
  options,
  onChange,
  className = 'min-w-32',
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  className?: string
}) {
  const items = Object.fromEntries(options.map((o) => [o.value, `${label} · ${o.label}`]))
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange((v as string | null) ?? options[0].value)}
      items={items}
    >
      <SelectTrigger className={`h-8 ${className}`} aria-label={`${label} 필터`}>
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
