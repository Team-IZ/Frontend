import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'

/*
  리포트가 오는 동안 **마스터-디테일 모양으로** 자리를 잡는다.

  이 화면은 좌측 회차 목록과 우측 본문이 **한 요청으로 함께** 온다(`GET /reports`).
  그래서 도착 전에는 양쪽이 다 비는데, 스피너 하나만 돌리면 화면 폭이 어떻게 갈릴지
  안 보이다가 갑자기 두 칸으로 쪼개진다.

  **높이는 실측이다** — 좌 360px · 우 360px(둘이 같은 높이로 맞춰져 있다).

  ▸ 회차는 **여섯 줄**로 둔다 — 6차까지 진행된 지금 기준이고, `rounds`가 그만큼 온다.
  ▸ 우측은 **본문이 무엇이 될지 모른다.** 발행됐으면 개념 카드가, 아니면 안내 한 장이
    온다 — 둘 중 작은 쪽(안내)으로 그린다. 큰 쪽으로 그리면 안내가 올 때 위로 당겨진다.
  ▸ `aria-hidden` — 자리표시자라 읽어 줄 것이 없다.
*/
export default function ReportSkeleton() {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:gap-8" aria-hidden>
      {/* 좌: 회차 레일 — 실측 360px */}
      <div className="w-full shrink-0 md:w-[220px]">
        <Skeleton className="mb-2 h-3 w-10" />
        <div className="flex flex-col gap-1">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="rounded-md px-3 py-2.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-1.5 h-3 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* 우: 본문 — 실측 360px */}
      <div className="min-w-0 flex-1">
        <Card className="h-[360px] items-center justify-center gap-0 p-8">
          <Skeleton className="size-10 rounded-full" />
          <Skeleton className="mt-4 h-5 w-56" />
          <Skeleton className="mt-3 h-3 w-72" />
          <Skeleton className="mt-2 h-3 w-64" />
        </Card>
      </div>
    </div>
  )
}
