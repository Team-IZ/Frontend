import type { ReactNode } from 'react'
import PageHeader from '@/components/common/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table'
import { cn } from '@/lib/utils/cn'
import type { Col } from './data'

/*
  **실제 화면 한 벌을 그대로 재현하는 틀.** 컴포넌트만 따로 놓고 보면 *"화면에서 이게
  어떻게 보이나"* 에 답하지 못한다 — 제목 줄·툴바·표·푸터가 같이 있어야 도착 전후로
  무엇이 움직이는지가 보인다.

  실물(`PageHeader` · `Table` · `Card`)을 그대로 쓴다. 여기서 새로 만드는 것은 **툴바
  자리표시자뿐**이고, 그건 컨트롤이 아니라 그림이라 진짜 `Select`를 넣을 이유가 없다.
*/

/** 화면 하나. 좌우 비교에 쓰므로 폭을 스스로 정하지 않는다 */
export function Screen({
  title,
  breadcrumb,
  count,
  breakdown,
  action,
  toolbar,
  children,
  label,
  tone,
}: {
  title: string
  breadcrumb?: string
  count?: string
  breakdown?: ReactNode
  action?: ReactNode
  /** 검색·필터 자리. 문자열 배열을 넘기면 자리표시자로 그린다 */
  toolbar?: (string | null)[]
  children: ReactNode
  /** 이 화면이 무엇을 보여주는 순간인지 — 비교할 때만 붙인다 */
  label?: string
  tone?: 'bad' | 'good'
}) {
  return (
    <div>
      {label && (
        <p
          className={cn(
            'mb-1.5 text-2xs font-medium',
            tone === 'bad' ? 'text-danger' : tone === 'good' ? 'text-primary' : 'text-fg-subtle',
          )}
        >
          {label}
        </p>
      )}
      {/* 실제 화면과 같은 배경 위에 올린다 — 카드 위에 그리면 대비가 달라 보인다 */}
      <div className="bg-canvas border-border rounded-lg border p-4">
        <PageHeader
          title={title}
          breadcrumb={breadcrumb}
          count={count}
          breakdown={breakdown}
          action={action}
        />
        {toolbar && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {toolbar.map((t, i) =>
              t === null ? (
                <span key={i} className="bg-border mx-1 h-5 w-px" />
              ) : (
                <span
                  key={i}
                  className="border-border bg-surface text-fg-subtle flex h-9 items-center rounded-md border px-3 text-xs"
                >
                  {t}
                </span>
              ),
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

/** 실제 표 — 열 폭·행 높이가 앱과 같아야 스켈레톤이 맞는지 눈으로 판정된다 */
export function DataTable({
  cols,
  rows,
  urgentAt,
}: {
  cols: Col[]
  rows: (() => ReactNode)[][]
  /** 행 배경으로 경고하는 자리(마감 임박 + 준비 중) */
  urgentAt?: number
}) {
  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {cols.map((c) => (
            <TableHead key={c.head} className={cn(c.w, c.align === 'right' && 'text-right')}>
              {c.head}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((cells, r) => (
          <TableRow key={r} className={cn(r === urgentAt && 'bg-warning-soft')}>
            {cells.map((cell, i) => (
              <TableCell key={i}>{cell()}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/** 푸터 — 범위 개수(좌) + 페이저(중앙). 실제 화면과 같은 자리라 높이가 맞는다 */
export function Footer({
  range,
  pages,
  current = 1,
}: {
  range: string
  pages?: number
  current?: number
}) {
  return (
    <div className="mt-3 grid grid-cols-3 items-center">
      <p className="text-fg-subtle text-xs">{range}</p>
      <div className="flex justify-center gap-1">
        {pages &&
          Array.from({ length: pages }, (_, i) => (
            <span
              key={i}
              className={cn(
                'flex size-7 items-center justify-center rounded-md text-xs',
                i + 1 === current ? 'bg-primary text-on-primary font-semibold' : 'text-fg-subtle',
              )}
            >
              {i + 1}
            </span>
          ))}
      </div>
      <div />
    </div>
  )
}

/** 표를 담는 카드 — 목록 화면이 쓰는 것과 같다 */
export const Framed = ({ children }: { children: ReactNode }) => (
  <Card className="gap-0 overflow-hidden p-0">{children}</Card>
)

/*
  화면 둘을 비교한다. **표가 있으면 세로로 쌓는다** — 좌우로 나누면 폭이 절반이라
  마지막 열이 잘리고, 그러면 *"실제로 이렇게 보이나"* 에 답하지 못한다(실제로 명단
  7열 중 둘이 잘렸다). 빈 상태·에러처럼 폭이 안 필요한 것만 좌우로 둔다.
*/
export const Pair = ({ children, wide }: { children: ReactNode; wide?: boolean }) => (
  <div className={cn('grid gap-4', !wide && 'xl:grid-cols-2')}>{children}</div>
)

/** 예시 하나 — 제목과 왜 그런지 */
export function Case({
  title,
  note,
  children,
}: {
  title: string
  note?: string
  children: ReactNode
}) {
  return (
    <section className="mb-8">
      <h3 className="text-fg mb-0.5 text-sm font-bold">{title}</h3>
      {note && <p className="text-fg-subtle mb-3 max-w-4xl text-xs leading-relaxed">{note}</p>}
      {children}
    </section>
  )
}

/** 실측값 한 줄 — 주장 옆에 숫자를 둔다 */
export function Measured({ items }: { items: (readonly [string, string, ('bad' | 'good')?])[] }) {
  return (
    <div className="text-fg-subtle mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs">
      {items.map(([k, v, tone]) => (
        <span key={k}>
          {k}:{' '}
          <b className={cn('font-semibold', tone === 'bad' ? 'text-danger' : 'text-fg')}>{v}</b>
        </span>
      ))}
    </div>
  )
}

export const Ghost = ({ children }: { children: ReactNode }) => (
  <Button variant="ghost" size="sm">
    {children}
  </Button>
)
