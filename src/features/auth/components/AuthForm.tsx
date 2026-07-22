import type { ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: string
  children: ReactNode
}

/** SC-A01 §3 · 우 폼 패널 컨테이너 (SC-A02·A03에서도 재사용) */
export default function AuthForm({ title, subtitle, children }: Props) {
  return (
    <div className="w-full p-8 sm:p-10 md:w-1/2">
      <h2 className="text-xl font-bold text-fg">{title}</h2>
      {subtitle && <p className="mt-1 text-[13px] text-fg-subtle">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </div>
  )
}
