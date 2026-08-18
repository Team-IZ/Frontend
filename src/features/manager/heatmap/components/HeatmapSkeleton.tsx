import { Skeleton } from '@/components/ui/Skeleton'

/*
  히트맵 격자가 처음 오기 전 자리를 잡아 둔다.

  **스피너를 안 쓰는 이유는 높이다**(async-states §1-2 · `common/TableSkeleton`과 같은
  근거). 스피너 자리(`py-16` = 128px)와 실제 격자(범례 17 + 표 148 + 주석 16 = 181px)가
  달라 도착하는 순간 본문이 튄다.

  ⚠ **높이·폭은 실제 화면에서 잰 값이다**(9기 · 개념 3열 · 반 격자).

      범례      17px
      표 머리   20px
      행        56px   (합계 행 + 데이터 행)
      주석      16px
      y축 열   220px · 셀 184px   (`HeatmapTable`의 `Y_COL_W`·`CELL_COL_W`와 같은 값)

  ⚠ **`common/TableSkeleton`을 안 쓴다.** 그쪽은 목록 표(행 53px · 좌측 정렬 · 푸터
  페이저)를 위한 것이라 셀이 정사각에 가까운 이 격자와 모양이 다르다. 행 수·열 수만
  같고 나머지가 전부 달라, 억지로 맞추면 두 화면이 서로를 못 바꾸게 된다.
*/

/** 화면이 아직 열 수를 모를 때 — 지금 기수의 검증 개념 수(3)를 기본으로 둔다 */
const DEFAULT_COLS = 3

export default function HeatmapSkeleton({
  cols = DEFAULT_COLS,
  rows = 2,
}: {
  /** 검증 개념 수. 직전에 그린 격자가 있으면 그 수를 넘긴다 */
  cols?: number
  /** 합계 행 + 데이터 행. 계층마다 다르다(반 1~3 · 팀 5~7 · 팀원 4~6) */
  rows?: number
}) {
  return (
    <div aria-hidden>
      {/* 범례 자리 */}
      <div className="mb-2 flex h-[17px] items-center justify-end gap-2">
        <Skeleton className="h-2.5 w-56" />
      </div>

      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-1">
          <colgroup>
            <col style={{ width: 220 }} />
            {Array.from({ length: cols }, (_, i) => (
              <col key={i} style={{ width: 184 }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="h-5 pr-3">
                <Skeleton className="h-2.5 w-8" />
              </th>
              {Array.from({ length: cols }, (_, i) => (
                <th key={i} className="h-5 px-1 pb-1">
                  <Skeleton className="mx-auto h-2.5 w-28" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, r) => (
              <tr key={r}>
                <td className="py-1 pr-3">
                  <Skeleton className="h-3 w-20" />
                </td>
                {Array.from({ length: cols }, (_, c) => (
                  <td key={c}>
                    <Skeleton className="h-14 w-full rounded" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 집계 시각 주석 자리 */}
      <Skeleton className="mt-4 h-3 w-96" />
    </div>
  )
}
