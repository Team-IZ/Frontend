import { Spinner } from '@/components/ui/Spinner'

/*
  **모양을 모르는 것**의 로딩. 표·목록처럼 형태가 정해진 것은 `TableSkeleton`을 쓴다 —
  스피너는 "기다려"만 말하고 스켈레톤은 "이런 것이 올 것이다"까지 말한다(async-states §1-2).

  남는 자리는 응답에 따라 구조가 갈리는 것(모달 안 목록·비용 매트릭스)과 화면 전체 조회다.

  `admin/_/components/AsyncState.tsx`와 `report/_/components/AsyncState.tsx`가 같은 것을
  두 벌 갖고 있었고 화면 넷이 또 인라인으로 적고 있었다 — 세 번째를 넘겼으므로 올린다(D14).
*/
export default function Loading({ label }: { label: string }) {
  return (
    <div className="flex justify-center py-16">
      {/*
        Spinner가 이미 `role="status"`를 갖는다 — 래퍼에 또 붙이면 라이브 리전이 중첩된다.
        기본 aria-label이 영문("Loading")이라 화면 언어에 맞춰 덮어쓴다.
      */}
      <Spinner className="size-6" aria-label={label} />
    </div>
  )
}
