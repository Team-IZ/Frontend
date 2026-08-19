import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'

/*
  제출 화면이 오는 동안 **도착할 모양으로** 자리를 잡는다.

  이 화면은 조회 하나(`GET /my-submission`)의 `status` 6종으로 통째로 갈린다 — 폼일
  수도, 제출한 내용 카드일 수도 있다. 그래서 스켈레톤은 **둘의 공통 뼈대**만 그린다:
  머리 줄과 그 아래 카드 하나.

  **높이는 실측이다** — 뒤로 19px · 머리 28px · 카드 371px(제출 폼 기준).

  ▸ 탭 두 개를 그린다 — `GitHub 저장소` / `ZIP 업로드`. 어느 쪽이 열릴지는 서버가
    정하지만(`availableSubmissionMethods`) **탭 줄 자체는 늘 있다.**
  ▸ 제출한 내용 카드가 오면 폼보다 짧다 — 그때는 위로 당겨진다. 폼이 더 잦은 첫
    진입(미제출)을 기준으로 잡았다.
  ▸ `aria-hidden` — 자리표시자라 읽어 줄 것이 없다.
*/
export default function SubmissionSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      {/* 뒤로 — 실측 19px */}
      <Skeleton className="h-4 w-12" />

      {/* 머리 줄: 제목 + 마감 — 실측 28px */}
      <div className="flex items-baseline justify-between">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-4 w-36" />
      </div>

      {/* 폼 카드 — 실측 371px */}
      <Card className="gap-0 p-5">
        {/* 수단 탭 둘 */}
        <div className="mb-4 flex gap-1">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-2 h-9 w-full" />
        <Skeleton className="mt-2 h-3 w-72" />
        <Skeleton className="mt-5 h-3 w-24" />
        <Skeleton className="mt-2 h-9 w-full" />
        <Skeleton className="mt-2 h-3 w-56" />
        <div className="mt-5 flex items-center justify-between">
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-9 w-20" />
        </div>
      </Card>
    </div>
  )
}
