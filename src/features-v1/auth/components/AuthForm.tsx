import type { ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: string
  /**
   * 폼 박스 최소 높이 고정 (AU-01 §6).
   * 세로 중앙 정렬이라 알림이 뜨면 박스가 커져 중앙이 다시 계산되고 제목·입력 필드가 올라간다.
   * 높이를 박아 두면 알림 유무와 무관하게 시작 위치가 같다 — 남는 공간은 카드 맨 아래로 간다.
   * form 엘리먼트가 아니라 **이 컨테이너**에 걸어야 버튼 아래에 빈 칸이 생기지 않는다.
   */
  stableHeight?: boolean
  children: ReactNode
}

/** SC-A01 §3 · 우 폼 패널 컨테이너 (SC-A02·A03에서도 재사용) */
export default function AuthForm({ title, subtitle, stableHeight, children }: Props) {
  return (
    <div className="flex w-full flex-col justify-center p-8 sm:p-10 md:w-1/2">
      <div className={`mx-auto w-full max-w-sm ${stableHeight ? 'min-h-[440px]' : ''}`}>
        <h2 className="text-xl font-bold text-fg">{title}</h2>
        {subtitle && <p className="mt-1 text-[13px] text-fg-subtle">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  )
}
