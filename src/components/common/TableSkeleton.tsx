import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils/cn'

/*
  표가 처음 뜨기 전 자리를 잡아 두는 것. **스피너를 쓰지 않는 이유는 높이다.**

  스피너 자리(`py-16`)와 표 높이가 달라 도착 순간 본문이 튄다 — 실측: 명단 탭에서
  `808 → 869px`(61px). 표가 클수록 커진다. 스켈레톤은 *"이런 것이 올 것이다"* 까지
  말하므로 그 점프가 없다(async-states §1-2).

  ─── 왜 컬럼 정의에서 자동 생성하지 않나 ───────────────────────
  이 레포는 표를 **각 화면이 `<table>`로 직접 쓴다** — `TableFrame`이 컬럼 정의를 갖지
  않는 것은 의도된 결정이다(그 파일 주석). 컬럼 추상화를 새로 들이면 구조를 뒤집게 되므로,
  화면이 **이미 갖고 있는 폭 토큰을 그대로 넘기게** 한다(async-states-plan §5).
*/
export default function TableSkeleton({
  rows,
  cols,
  className,
}: {
  /**
   * 행 수 — **그 화면의 페이지 크기와 맞춘다.** 10행짜리 목록에 3행을 그리면 도착할 때
   * 또 점프한다(스켈레톤을 쓰는 이유 자체가 없어진다).
   */
  rows: number
  /**
   * 열 폭 — 표 헤더에 쓴 폭 토큰을 그대로 넘긴다(`'w-[200px]'`). `null`은 남는 폭을
   * 가져가는 흡수 열이다.
   */
  cols: (string | null)[]
  className?: string
}) {
  return (
    <div className={cn('flex flex-col', className)} aria-hidden>
      {/*
        **높이를 실제 표에서 재서 박는다.** 눈대중으로 맞추면 도착할 때 그만큼 튀고,
        그러면 스켈레톤을 쓴 이유가 없어진다 — 처음 만들었을 때 실측 133px이 어긋났다.
        (헤더 38.5px · 본문 53px — `admin/roster` 표에서 잰 값. 표 구성은 전부 같다)
      */}
      <div className="border-border flex h-[38.5px] items-center gap-4 border-b px-3">
        {cols.map((w, i) => (
          <Skeleton key={i} className={cn('h-3', w ?? 'flex-1')} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="border-border flex h-[53px] items-center gap-4 border-b px-3">
          {cols.map((w, i) => (
            <Skeleton key={i} className={cn('h-4', w ?? 'flex-1')} />
          ))}
        </div>
      ))}
      {/* 푸터(범위 개수 + 페이저) 자리 — 빼면 그만큼 도착할 때 아래가 밀린다 */}
      <div className="h-[57px]" />
    </div>
  )
}
