import { Skeleton } from '@/components/ui/Skeleton'
import { Card } from '@/components/ui/Card'

/*
  격자가 오기 전 자리를 잡는다. **툴바만 남고 본문이 통째로 비던 2.5초**를 메운다
  (op-02-situations §2-10).

  ─── 왜 열을 안 그리나 ────────────────────────────────────────
  이 격자는 **열이 가변**이다 — 회차가 6개인 기수도 10개인 기수도 있고, 그 수는 이 조회의
  응답에만 있다. 열까지 그리면 도착할 때 **반드시 어긋난다.**

  반면 **행 높이는 고정**이라 세로는 맞출 수 있다. 실측(9반 기수):

  ```
  헤더      42px
  기준선 행 50px   ← «기수 전체». 「아래 색의 기준」 한 줄이 더 있어 다른 행보다 높다
  반 행     35px × 8
  마지막 행 32px   ← 아래 테두리가 없다
  ─────────────
  표 400px + 카드 패딩(16px × 2) = 432px
  ```

  ⚠ **행 높이를 한 값으로 잡으면 안 된다.** 처음에 전부 50px로 잡았다가 **142px 부풀었다**
  (스켈레톤 576px vs 실제 434px). 기준선 행만 높다.

  ⚠ **행 수는 반 수 + 1이다** — 맨 위 기준선 행 때문에 9반이면 10행이다.

  반 목록을 따로 조회해 행 수를 정확히 맞추는 안은 버렸다. 그 조회가 1.5초라
  **스켈레톤 때문에 실제 데이터가 늦어진다** — 본말전도다.

  `TableSkeleton`을 쓰지 않는 이유도 같다. 그것은 **열 폭 배열**을 받는 표 전용이고,
  격자는 열이 균등 분할이라 모양이 다르다.
*/
export default function GridSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <>
      <Card className="px-5 py-4">
        <div aria-hidden className="flex flex-col">
          {/* 헤더 줄 — 실제 표에도 있으므로 빼면 그만큼 어긋난다(42px) */}
          <div className="flex h-[42px] items-end gap-4 pb-2">
            <Skeleton className="h-3 w-[172px] shrink-0" />
            <Skeleton className="h-3 flex-1" />
          </div>
          {/* 기준선 행 — 「아래 색의 기준」 줄이 있어 혼자 50px다 */}
          <div className="flex h-[50px] items-center gap-4">
            <Skeleton className="h-4 w-[172px] shrink-0" />
            <Skeleton className="h-4 flex-1" />
          </div>
          {Array.from({ length: rows - 1 }, (_, i) => (
            <div key={i} className="flex h-[35px] items-center gap-4">
              {/* 행 이름 열은 실제 폭이 172px로 고정돼 있다(sticky 열) */}
              <Skeleton className="h-3.5 w-[172px] shrink-0" />
              <Skeleton className="h-3.5 flex-1" />
            </div>
          ))}
        </div>
      </Card>
      {/* 범례 자리 — 표 아래에 늘 붙는다(16px + 위 여백). 빼면 그만큼 아래가 밀린다 */}
      <div aria-hidden className="mt-3 h-4" />
    </>
  )
}

/*
  기수 간 비교 표 — 회차 격자와 **모양이 다르다.** 여기는 열이 5개로 고정이고(검증 개념 ·
  지난 기수 · 이번 기수 · 변화 · 교안 버전) 행 높이도 47px로 균일하다. 그래서 격자보다
  정직하게 그릴 수 있다.

  실측(9기 ↔ 8기): 헤더 40px · 행 47px × 7 · 카드 패딩 16px×2 = 404px · 범례 45px.

  **행 수는 개념 수라 모른다.** 7이 기본값이고, 어긋나도 이 표는 화면 맨 아래라 아무것도
  밀지 않는다.
*/
export function CompareSkeleton({ rows = 7 }: { rows?: number }) {
  return (
    <>
      <Card className="px-5 py-4">
        <div aria-hidden className="flex flex-col">
          <div className="flex h-10 items-end gap-4 pb-2">
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="h-3 w-24 shrink-0" />
            <Skeleton className="h-3 w-24 shrink-0" />
            <Skeleton className="h-3 w-20 shrink-0" />
            <Skeleton className="h-3 w-20 shrink-0" />
          </div>
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="flex h-[47px] items-center gap-4">
              {/* 왼쪽은 개념 이름 + 출처 두 줄이라 폭이 넓다 */}
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-6 w-24 shrink-0" />
              <Skeleton className="h-6 w-24 shrink-0" />
              <Skeleton className="h-4 w-20 shrink-0" />
              <Skeleton className="h-4 w-20 shrink-0" />
            </div>
          ))}
        </div>
      </Card>
      {/* 도달 단계 범례 자리(45px + 위 여백) */}
      <div aria-hidden className="mt-3 h-[45px]" />
    </>
  )
}
