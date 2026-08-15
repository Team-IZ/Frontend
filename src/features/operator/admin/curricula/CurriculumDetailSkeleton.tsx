import { Skeleton } from '@/components/ui/Skeleton'

/*
  교안 상세가 오는 동안 **그 화면 모양으로** 자리를 잡는다.

  ─── 여기만 스피너였다 ──────────────────────────────────────────
  운영 관리의 표는 전부 스켈레톤인데, 교안 상세만 진입과 섹션 조회 **두 곳이 스피너**
  였다. 같은 콘솔 안에서 기다리는 모양이 화면마다 다를 이유가 없다(async-states §1-2).

  **높이는 실제 화면에서 잰 값이다** — 제목 28px(top 114) · 탭줄 37px(top 161) ·
  본문 434px(top 214) · 섹션 행 80px. 눈대중으로 잡으면 도착할 때 그만큼 튄다.

  ▸ **경고·실패 배너 자리는 안 그린다.** 분석 실패일 때만 뜨는 것이라 늘 있는 자리가
    아니다 — 자리표시자가 「올 것이다」라고 말해 놓고 안 오면 그게 더 나쁘다.
  ▸ `aria-hidden` — 자리표시자라 읽어 줄 것이 없다.
*/
export default function CurriculumDetailSkeleton() {
  return (
    <div aria-hidden>
      {/* 목록으로 돌아가는 줄 */}
      <Skeleton className="h-4 w-20" />

      {/* 제목 줄 — 이름 + 버전 + 상태 배지 + 다시 분석 */}
      <div className="mt-4 flex items-center gap-3">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-8" />
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="ml-auto h-8 w-20" />
      </div>

      {/* 탭줄 — 섹션 n · 연결된 프로젝트 n */}
      <div className="mt-5 flex gap-2">
        <Skeleton className="h-[37px] w-28" />
        <Skeleton className="h-[37px] w-36" />
      </div>

      {/* 본문 — `7개 섹션 · 120쪽` 한 줄 뒤에 섹션 행이 쌓인다 */}
      <Skeleton className="mt-5 h-4 w-40" />
      <div className="mt-3 space-y-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="border-border bg-surface h-20 rounded-md border p-4">
            <Skeleton className="h-4 w-72" />
            <Skeleton className="mt-2.5 h-3 w-40" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** 섹션 탭 안쪽만 — 상세는 이미 그려졌고 섹션 목록만 기다린다 */
export function SectionListSkeleton() {
  return (
    <div aria-hidden>
      <Skeleton className="h-4 w-40" />
      <div className="mt-3 space-y-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="border-border bg-surface h-20 rounded-md border p-4">
            <Skeleton className="h-4 w-72" />
            <Skeleton className="mt-2.5 h-3 w-40" />
          </div>
        ))}
      </div>
    </div>
  )
}
