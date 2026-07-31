import type { ReactNode } from 'react'

/*
  화면 제목 줄. 확정 화면 17개 중 6개가 쓴다.

  배치는 팀 규약으로 확정돼 있다 — 왼쪽에 제목과 총개수, 오른쪽에 주 액션 하나.
  총개수를 제목 옆에 두는 이유는, 오른쪽에 두면 주 액션과 자리를 다투기 때문이다.
  (표 아래 푸터의 "범위 개수"와는 다른 값이다. 여기는 전체, 거기는 지금 보는 범위)

  주 액션은 하나만 받는다. 둘 이상이면 무엇이 주된 것인지 화면에서 안 읽힌다.
*/
type Props = {
  title: string
  /** 전체 개수. "48명"처럼 단위까지 넘긴다 — 단위가 대상마다 다르다 */
  count?: string
  /** 상위 경로. 예: "교육생 › 7기" */
  breadcrumb?: string
  /** count 옆에 붙는 세부 내역. 예: "활성 23 · 초대 대기 1 · 비활성 1"(MG-05 lhead .cnts2) */
  breakdown?: ReactNode
  /** 주 액션 하나. 없으면 생략한다 */
  action?: ReactNode
}

export default function PageHeader({ title, count, breadcrumb, breakdown, action }: Props) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        {breadcrumb && <p className="text-fg-subtle mb-0.5 text-xs">{breadcrumb}</p>}
        <h1 className="flex items-baseline gap-3 text-xl font-bold tracking-[-0.01em]">
          <span>
            {title}
            {count && <span className="text-fg-subtle ml-2 text-sm font-normal">{count}</span>}
          </span>
          {breakdown && <span className="text-fg-muted text-xs font-normal">{breakdown}</span>}
        </h1>
      </div>
      {action}
    </div>
  )
}
