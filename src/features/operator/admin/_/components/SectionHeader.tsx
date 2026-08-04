import type { ReactNode } from 'react'

/*
  탭 안 섹션의 제목 줄.

  `components/common/PageHeader`와 **배치가 같고 층이 다르다.** 저쪽은 화면 제목(`<h1>`)
  이고 여기는 그 아래 섹션(`<h2>`)이다 — 한 화면에 `<h1>`이 여럿이면 스크린리더의
  문서 구조가 깨진다. 이 화면은 `운영 관리`가 h1이고 탭 안 표들이 h2다.

  배치는 팀 규약 그대로 — **왼쪽에 제목·총개수·내역, 오른쪽에 액션**(E3).
  `반 · 명단` 탭처럼 한 탭에 섹션이 둘인 경우가 있어 컴포넌트로 뺐다.
*/
type Props = {
  title: string
  /** 전체 개수. `10개` · `250명`처럼 단위까지 넘긴다 — 단위가 대상마다 다르다 */
  count?: string
  /** count 옆 세부 내역. 예: `기관 전체 · 진행 2 · 종료 1` */
  breakdown?: ReactNode
  /** 오른쪽 액션. 둘 이상이면 무엇이 주된 것인지 안 읽히므로 하나만 권한다 */
  action?: ReactNode
}

export default function SectionHeader({ title, count, breakdown, action }: Props) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
      <h2 className="flex items-baseline gap-2 text-base font-bold tracking-[-0.01em]">
        <span>
          {title}
          {count && <span className="text-fg-subtle ml-2 text-sm font-normal">{count}</span>}
        </span>
        {breakdown && <span className="text-fg-subtle text-xs font-normal">{breakdown}</span>}
      </h2>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  )
}
