import { cn } from '@/lib/utils/cn'

type RailItem = { id: string; label: string; note?: string; hasDot: boolean }

/** 좌측 회차 목록 — 마스터-디테일의 마스터. 별도 아카이브 화면을 만들지 않는다(정의서 §3) */
export default function RoundRail({
  items,
  selectedId,
  onSelect,
}: {
  items: RailItem[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  return (
    // 220px 고정 폭에 반응형 분기가 없어서 375px 화면에서 본문이 123px로 눌렸다
    // (Sidebar.tsx가 이미 쓰는 md: 접기 관례를 그대로 따른다 — 좁은 화면엔 위쪽
    // 전체 폭 목록, md 이상에서만 옆 레일).
    <nav className="w-full border-b border-border pb-4 md:w-[220px] md:shrink-0 md:border-r md:border-b-0 md:pr-4 md:pb-0">
      <div className="mb-2 text-xs font-semibold text-fg-subtle">회차</div>
      <ul className="flex flex-col">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              className={cn(
                'w-full rounded-md px-2 py-2 text-left text-sm',
                item.id === selectedId
                  ? 'bg-primary-soft text-primary'
                  : 'text-fg hover:bg-surface-2',
              )}
            >
              <div className="flex items-center gap-1.5 font-medium">
                {item.label}
                {item.hasDot && <span className="size-1.5 rounded-full bg-warning" />}
              </div>
              {item.note && <div className="text-xs text-fg-subtle">{item.note}</div>}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
