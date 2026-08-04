import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/Pagination'
import { getPageRange } from '@/components/ui/paginationRange'
import { cn } from '@/lib/utils/cn'

/*
  표 푸터 — **범위 개수(좌) + 페이저(중앙), 오른쪽은 비운다**(E3).
  오른쪽을 비우는 이유: 주 액션은 제목 줄에 있다. 푸터 오른쪽에도 버튼을 두면 주 액션이
  둘로 보인다. 가운데 정렬을 유지하려면 빈 칸이 실제로 있어야 한다.

  **페이지가 하나면 `1`만 둔다**(E7). 화살표는 2쪽 이상일 때만 — 누를 수 없는 컨트롤은
  컨트롤이 아니라 장식이다.
*/
type Props = {
  /** 지금 보고 있는 범위 문구. 예: `1–25 / 250명` */
  range: string
  page: number
  /** 전체 쪽 수. 1이면 화살표를 그리지 않는다 */
  totalPages: number
  onPageChange: (page: number) => void
  /** 표가 폭 상한을 가질 때 같은 값을 준다 — 푸터가 표 밖으로 나가면 페이저가 안 맞는다 */
  className?: string
}

export default function TableFooterBar({
  range,
  page,
  totalPages,
  onPageChange,
  className,
}: Props) {
  const pages = getPageRange(page, totalPages)
  const multi = totalPages > 1

  return (
    <div className={cn('mt-3 grid grid-cols-3 items-center', className)}>
      <p className="text-fg-subtle text-xs">{range}</p>

      <Pagination>
        <PaginationContent>
          {multi && (
            <PaginationItem>
              <PaginationPrevious
                text="이전"
                href="#"
                aria-disabled={page === 1}
                className={page === 1 ? 'pointer-events-none opacity-40' : undefined}
                onClick={(e) => {
                  e.preventDefault()
                  if (page > 1) onPageChange(page - 1)
                }}
              />
            </PaginationItem>
          )}

          {pages.map((p, i) =>
            p === '…' ? (
              <PaginationItem key={`gap-${i}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={p}>
                <PaginationLink
                  href="#"
                  isActive={p === page}
                  onClick={(e) => {
                    e.preventDefault()
                    onPageChange(p)
                  }}
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            ),
          )}

          {multi && (
            <PaginationItem>
              <PaginationNext
                text="다음"
                href="#"
                aria-disabled={page === totalPages}
                className={page === totalPages ? 'pointer-events-none opacity-40' : undefined}
                onClick={(e) => {
                  e.preventDefault()
                  if (page < totalPages) onPageChange(page + 1)
                }}
              />
            </PaginationItem>
          )}
        </PaginationContent>
      </Pagination>

      {/* 오른쪽은 의도적으로 비운다 */}
      <div />
    </div>
  )
}
