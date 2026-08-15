import { Skeleton } from '@/components/ui/Skeleton'

/*
  비용 탭이 오는 동안 **그 탭 모양으로** 자리를 잡는다.

  ─── 여기만 스피너였다 ──────────────────────────────────────────
  운영 관리 여섯 탭 중 **다섯은 스켈레톤인데 비용만 `Loading`(스피너)** 이었다(실측 —
  탭 전환 0.5초 시점에 다른 탭은 스켈레톤 4~8개, 비용은 스피너 1개). 같은 화면 안에서
  탭마다 기다리는 모양이 다를 이유가 없다(async-states §1-2).

  **높이는 실제 화면에서 잰 값이다** — 요약 카드 · 월별 표 289 · 반별 표 414.
  눈대중으로 잡으면 도착할 때 그만큼 튄다.

  ▸ **경고 배너 자리는 안 그린다.** 단가 미설정일 때만 뜨는 것이라 늘 있는 자리가
    아니다 — 자리표시자가 「올 것이다」라고 말해 놓고 안 오면 그게 더 나쁘다.
  ▸ `aria-hidden` — 자리표시자라 읽어 줄 것이 없다.
*/
export default function CostSkeleton() {
  return (
    <div aria-hidden>
      {/* 섹션 머리 */}
      <div className="mb-4">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="mt-2 h-3 w-48" />
      </div>

      {/* 요약 카드 — 기수 누적 · 이번 달 · 세션 */}
      <div className="border-border bg-surface mb-6 flex flex-wrap gap-x-12 gap-y-6 rounded-md border p-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="w-56 shrink-0">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-2 h-7 w-28" />
            <Skeleton className="mt-2.5 h-2.5 w-40" />
          </div>
        ))}
      </div>

      {/* 월별 — 머리 21px + 표 289px */}
      <Skeleton className="h-[21px] w-56" />
      <div className="border-border bg-surface mt-2 mb-6 h-[289px] rounded-md border">
        <div className="border-border flex h-[38.5px] items-center gap-4 border-b px-3">
          {['w-16', 'w-40', 'w-14', null].map((w, i) => (
            <Skeleton key={i} className={`h-3 ${w ?? 'flex-1'}`} />
          ))}
        </div>
        {[0, 1, 2, 3, 4].map((r) => (
          <div key={r} className="border-border flex h-[50px] items-center gap-4 border-b px-3">
            {['w-16', 'w-40', 'w-14', null].map((w, i) => (
              <Skeleton key={i} className={`h-4 ${w ?? 'flex-1'}`} />
            ))}
          </div>
        ))}
      </div>

      {/* 반별 — 머리 21 + 정렬 36 + 표 414 */}
      <Skeleton className="h-[21px] w-56" />
      <Skeleton className="mt-2 mb-3 h-9 w-40" />
      <div className="border-border bg-surface h-[414px] rounded-md border">
        <div className="border-border flex h-[38.5px] items-center gap-3 border-b px-3">
          {['w-12', 'w-16', null, null, null, null, null, null, 'w-16', 'w-16'].map((w, i) => (
            <Skeleton key={i} className={`h-3 ${w ?? 'flex-1'}`} />
          ))}
        </div>
        {Array.from({ length: 9 }, (_, r) => (
          <div key={r} className="border-border flex h-[41px] items-center gap-3 border-b px-3">
            {['w-12', 'w-16', null, null, null, null, null, null, 'w-16', 'w-16'].map((w, i) => (
              <Skeleton key={i} className={`h-4 ${w ?? 'flex-1'}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
