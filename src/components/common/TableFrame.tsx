import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'
import { Card } from '@/components/ui/Card'

/*
  표를 담는 틀. 확정 화면 17개 중 5개가 이 배치를 쓴다.

  **배치만 담당한다.** 컬럼 정의나 데이터 바인딩은 여기 없다 — 화면마다 컬럼이
  다르고, 아직 어떤 형태가 반복되는지 모른다. 한 화면만 보고 그 API를 정하면
  두 번째 화면에서 틀린다. 표 자체는 각 화면이 <table>로 직접 쓴다.

  배치는 팀 규약으로 확정돼 있어 추측이 아니다.

    ┌ 툴바 — 검색·필터·정렬. 전부 왼쪽, 오른쪽은 비운다 ─────────────┐
    │ 표                                                            │
    └ 푸터 — 범위 개수(왼쪽) · 페이지 이동(가운데) · 오른쪽 비움 ────┘

  오른쪽을 비우는 이유: 주 액션은 화면 제목 줄(PageHeader)에 있다. 툴바 오른쪽에도
  버튼을 두면 주 액션이 둘로 보인다.
*/

export function TableFrame({ children, className }: { children: ReactNode; className?: string }) {
  // Card 기본 여백(gap·py)을 지운다 — 표는 행이 끝까지 닿아야 한다.
  return <Card className={cn('gap-0 py-0', className)}>{children}</Card>
}

/**
 * 검색·필터·정렬을 담는 줄. 행을 선택해도 이 줄은 그대로 둔다 —
 * 선택했다고 필터가 사라지면 화면이 흔들리고, 필터를 다시 만지려면 선택을 풀어야 한다.
 */
export function TableToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('border-border flex flex-wrap items-center gap-2 border-b p-3', className)}>
      {children}
    </div>
  )
}

/**
 * 범위 개수와 페이지 이동.
 *
 * 페이지 이동 자체(번호 계산·이전/다음)는 여기서 만들지 않고 받기만 한다.
 * 페이지를 서버가 나눌지 화면이 나눌지 아직 정해지지 않았고, 그걸 정하기 전에
 * 만들면 둘 중 하나에 맞춰진 것이 공용이 된다.
 */
export function TableFooter({
  range,
  children,
  className,
}: {
  /** 지금 보고 있는 범위. 예: "1–20 / 48명" */
  range: string
  /** 페이지 이동. 가운데 놓인다 */
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('border-border grid grid-cols-3 items-center border-t p-3', className)}>
      <p className="text-fg-subtle text-xs">{range}</p>
      <div className="flex justify-center">{children}</div>
      {/* 오른쪽은 의도적으로 비운다. 가운데 정렬을 유지하려면 자리가 필요하다 */}
      <div />
    </div>
  )
}
