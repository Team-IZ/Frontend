import * as React from 'react'
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from 'lucide-react'

import { cn } from '@/lib/utils/cn'

/*
  표는 **면 위에 올라간다.** 와이어 전부(`.card` 안의 `.tbl`)가 흰 면 + 얇은 테두리 +
  radius-md 위에 표를 그린다. 페이지 배경(canvas)에 표를 그대로 얹으면 헤더 셀의
  surface-2와 배경이 거의 같은 색이라 표의 경계가 사라진다(실제로 그렇게 보였다).

  그래서 감싸는 div가 면을 갖는다. 화면마다 `<Card>`로 한 번 더 감싸게 하지 않는
  이유는, 그러면 표를 쓰는 모든 화면이 같은 래퍼를 반복하고 한 곳이라도 빠지면
  그 화면만 배경에 붙어 보이기 때문이다.

  면이 필요 없는 표(카드 안에 이미 들어 있는 경우)는 `className`으로 지운다:
    <Table className="rounded-none border-0" />

  `overflow-hidden`은 radius가 헤더 셀 배경을 잘라내게 하려고 둔다. 없으면 모서리에서
  헤더의 사각 배경이 삐져나온다.
*/
function Table({
  className,
  maxHeight,
  ...props
}: React.ComponentProps<'table'> & {
  /**
   * 세로 스크롤 상한(예: `'28rem'`). 주면 헤더가 스크롤에도 붙어 있는다.
   * 행이 20개를 넘어가면 스크롤 중에 어느 열이 무엇인지 잊게 되므로 그때 준다.
   */
  maxHeight?: string
}) {
  return (
    <div
      data-slot="table-container"
      data-sticky={maxHeight ? '' : undefined}
      className={cn(
        'group/table-container relative w-full overflow-x-auto rounded-md border border-border bg-surface',
        maxHeight ? 'overflow-y-auto' : 'overflow-y-hidden',
        className,
      )}
      style={maxHeight ? { maxHeight } : undefined}
    >
      <table data-slot="table" className="w-full caption-bottom text-sm" {...props} />
    </div>
  )
}

/*
  헤더와 데이터 사이의 경계를 **border-strong(1px)**으로 준다. 나머지 행 구분선은
  border(연한 회색)라, 여기만 한 단계 진하면 "위는 이름표, 아래는 데이터"가 한눈에 갈린다.

  이게 헤더 가독성의 핵심이다. 헤더 배경(surface-2)은 행 배경(surface)과 명도 차이가
  1%밖에 안 나서 사실상 안 보인다 — 배경을 더 어둡게 만들면 데이터보다 헤더가 튀므로,
  면이 아니라 **선**으로 가른다.

  `maxHeight`가 있으면 헤더가 스크롤에 붙는다. 이때 배경이 반투명이면 아래 행이 비쳐
  글자가 겹쳐 보이므로 불투명 배경을 유지한다.
*/
function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        '[&_tr]:border-b [&_tr]:border-border-strong',
        'group-data-sticky/table-container:sticky group-data-sticky/table-container:top-0 group-data-sticky/table-container:z-10',
        className,
      )}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn('border-t bg-muted/50 font-medium [&>tr]:last:border-b-0', className)}
      {...props}
    />
  )
}

/*
  기본값엔 hover 배경을 넣지 않는다. 와이어프레임 8개가 공유하는 `.tbl` 규칙은
  `tr.click:hover`에서만 배경이 켜진다 — 읽기전용 표(로스터·기수 목록 등)에 hover를
  넣으면 누를 수 없는 행이 누를 수 있는 것처럼 보인다. 행이 실제로 클릭 가능할 때만
  `onClick`을 주는 화면에서 `hover:bg-surface-2`를 직접 붙인다.
*/
function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'border-b border-border transition-colors has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted',
        className,
      )}
      {...props}
    />
  )
}

export type SortDirection = 'asc' | 'desc' | false

/*
  헤더 셀. 배경·대문자·자간은 와이어 `.tbl th` 그대로지만 **글자색만 fg-subtle →
  fg-muted로 올렸다.** 12px 대문자 + 자간은 소문자보다 읽기 힘든 조합이라, 원본 색
  (fg-subtle, 흰 면에서 약 4.7:1)에서는 훑을 때 헤더가 먼저 눈에 들어오지 않았다.
  fg-muted(약 6.3:1)로 올리면 본문(fg)보다는 여전히 약해서 위계는 유지되면서 읽히기는 한다.

  ▸ `sortable`을 주면 정렬 컨트롤이 된다.
    정렬은 와이어 3개 화면(교육생 리스트·명단 배정·운영 관리)에 `th.sortable::after{"↕"}`로
    이미 있다. 여기서는 **표시와 접근성만** 담당한다 — 실제 정렬 계산은 화면이 한다
    (이미 설치된 `@tanstack/react-table`을 쓰면 된다. 프리뷰에 예시가 있다).

    `aria-sort`를 반드시 함께 낸다. 화살표는 눈으로 보는 사람에게만 상태를 알려주고,
    보조기술에는 이 속성이 유일한 신호다.
*/
function TableHead({
  className,
  children,
  sortable,
  sortDirection = false,
  onSort,
  ...props
}: React.ComponentProps<'th'> & {
  sortable?: boolean
  /** 현재 정렬 방향. `false`면 이 열로 정렬돼 있지 않다 */
  sortDirection?: SortDirection
  /**
   * 이벤트를 받는 시그니처다. `@tanstack/react-table`의
   * `column.getToggleSortingHandler()`를 그대로 꽂을 수 있게 맞췄다.
   */
  onSort?: React.MouseEventHandler<HTMLButtonElement>
}) {
  const SortIcon =
    sortDirection === 'asc'
      ? ArrowUpIcon
      : sortDirection === 'desc'
        ? ArrowDownIcon
        : ChevronsUpDownIcon

  return (
    <th
      data-slot="table-head"
      aria-sort={
        !sortable
          ? undefined
          : sortDirection === 'asc'
            ? 'ascending'
            : sortDirection === 'desc'
              ? 'descending'
              : 'none'
      }
      className={cn(
        'bg-surface-2 px-4 py-[11px] text-left align-middle text-xs font-semibold tracking-[.03em] text-fg-muted uppercase whitespace-nowrap [&:has([role=checkbox])]:pr-0',
        className,
      )}
      {...props}
    >
      {sortable ? (
        <button
          type="button"
          onClick={onSort}
          // 정렬 안 된 열의 화살표는 흐리게 둔다 — 켜져 있으면 모든 열이 정렬된 것처럼 보인다
          className="-mx-1 inline-flex cursor-pointer items-center gap-1 rounded-sm px-1 py-0.5 text-inherit uppercase transition-colors hover:text-fg data-[inactive]:[&_svg]:text-border-strong"
          data-inactive={sortDirection === false ? '' : undefined}
        >
          {children}
          <SortIcon className="size-3" aria-hidden="true" />
        </button>
      ) : (
        children
      )}
    </th>
  )
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        'px-4 py-[11px] align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0',
        className,
      )}
      {...props}
    />
  )
}

function TableCaption({ className, ...props }: React.ComponentProps<'caption'>) {
  return (
    <caption
      data-slot="table-caption"
      className={cn('mt-4 text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption }
