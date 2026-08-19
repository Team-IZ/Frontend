import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'

/*
  홈이 오는 동안 **도착할 화면 모양으로** 자리를 잡는다.

  ─── 왜 스피너를 안 쓰나 ────────────────────────────────────────
  스피너는 "무언가 돌고 있다"만 말하고 **무엇이 올지는 안 말한다.** 그리고 도착하는
  순간 빈 화면이 통째로 채워져 화면이 튄다(CLS). 교육생 화면은 진입할 때마다 서버를
  다시 묻기 때문에(`traineeFreshness`) 이 순간을 매번 본다.

  **높이는 실제 화면에서 잰 값이다** — 지금 할 일 카드 308px · 지난 회차 246px.
  눈대중으로 넣으면 도착할 때 그만큼 밀린다(OP-01에서 CLS가 0.0001 → 0.0082로 올랐다).

  ▸ 진행바 네 칸은 **상태와 무관하게 늘 있다** — 그려 두면 도착해도 안 움직인다.
  ▸ 지난 회차는 **다섯 줄**로 둔다. 실제로는 회차 수만큼인데, 그보다 적게 그리면
    아래가 밀리고 많이 그리면 위로 당겨진다 — 6차 기준 다섯이 가장 잦다.
  ▸ `aria-hidden` — 자리표시자라 읽어 줄 것이 없다.
*/
export default function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      {/* 지금 할 일 카드 — 실측 308px */}
      <div>
        <Skeleton className="mb-2 h-4 w-20" />
        <Card className="h-[276px] gap-0 p-5">
          {/* 진행바 네 칸 */}
          <div className="mb-5 flex items-center gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-7 w-24 rounded-full" />
                {i < 3 && <Skeleton className="h-px w-4" />}
              </div>
            ))}
          </div>
          <Skeleton className="h-3 w-72" />
          <Skeleton className="mt-3 h-6 w-56" />
          <Skeleton className="mt-4 h-3 w-full max-w-[520px]" />
          <Skeleton className="mt-2 h-3 w-full max-w-[440px]" />
          {/* CTA는 오른쪽 끝이다(StatusCard와 같은 자리) */}
          <div className="mt-5 flex justify-end">
            <Skeleton className="h-9 w-36" />
          </div>
        </Card>
      </div>

      {/* 지난 회차 — 실측 246px */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Card className="gap-0 divide-y divide-border py-0">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <Skeleton className="h-4 w-52" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
