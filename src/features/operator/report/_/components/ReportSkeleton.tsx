import { Skeleton } from '@/components/ui/Skeleton'
import { REPORT_SECTIONS } from '../sections'

/*
  리포트가 오는 동안 **문서 모양으로** 자리를 잡는다.

  ─── 왜 스피너를 안 썼나 ────────────────────────────────────────
  OP-01~04를 전부 스켈레톤으로 옮겼는데 여기만 스피너였다. 게다가 그 앞에 **아무것도
  없는 2.25초**가 있었다 — 기수가 정해지기 전에는 `enabled: false`라 `isLoading`이
  `false`이고, 그러면 어느 분기도 안 탄다(OP-03에서 6초 백지를 만든 것과 같은 뿌리).

  ```
  0ms      진입 — 제목만
  2250ms   기수 도착 → 그제서야 스피너
  4350ms   본문
  ```

  **높이는 실제 화면에서 잰 값이다** — 표지 58 · 진행 중 배너 54 · 탭 줄 + 첫 섹션
  482.2(요약). 처음에 눈대중으로 78·46을 넣었다가 **CLS가 0.0001 → 0.0082로 올랐다**.

  ▸ 섹션 탭 자리는 **실제 개수(5)로** 그린다 — `REPORT_SECTIONS`에서 가져오므로
    섹션이 늘면 같이 는다.
  ▸ **배너를 그린다.** 진행 중 기수가 기본이고(전 회차가 끝나야 확정), 안 그리면
    확정 전 리포트에서 46px이 도착할 때 생긴다.
  ▸ `aria-hidden` — 자리표시자라 읽어 줄 것이 없다.
*/
export default function ReportSkeleton() {
  return (
    <div aria-hidden>
      {/* 표지 — 제목 + 얼린 시점 + 내보내기 둘 (실측 58px) */}
      <div className="mb-5 flex h-[58px] items-start justify-between">
        <div>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-2 h-3 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      {/* 확정 전 안내 배너 (실측 54px) */}
      <Skeleton className="mb-5 h-[54px] w-full" />

      {/*
        섹션 탭 줄 + 첫 섹션(요약) — **합쳐서 높이를 박는다.** 안쪽 조각의 여백을
        하나씩 맞추려다 33px이 어긋나 CLS가 오히려 올랐다(0.0082 → 0.0094).
        바깥에서 한 번 고정하면 안쪽이 조금 달라도 밀리지 않는다.
      */}
      <div className="h-[482.2px] overflow-hidden">
        <div className="border-border mb-5 flex h-[45px] items-center gap-6 border-b">
          {REPORT_SECTIONS.map((s) => (
            <Skeleton key={s.key} className="h-4 w-16" />
          ))}
        </div>

        <Skeleton className="h-4 w-52" />
        <Skeleton className="mt-2 h-3 w-64" />
        <div className="mt-4 grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="border-border bg-surface h-[98px] rounded-lg border p-4">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="mt-2 h-6 w-20" />
              <Skeleton className="mt-2 h-2.5 w-14" />
            </div>
          ))}
        </div>
        <div className="border-border bg-surface mt-4 h-[92px] rounded-lg border p-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-2.5 h-4 w-96" />
          <Skeleton className="mt-4 h-3 w-64" />
        </div>
      </div>
    </div>
  )
}
