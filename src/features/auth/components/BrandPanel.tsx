import type { ReactNode } from 'react'
import Wordmark from './Wordmark'

interface Props {
  /** 마케팅 리드 — 화면마다 다름 */
  title?: ReactNode
  description?: string
  meta?: string
}

/** SC-A01 §3 · 좌 브랜드 패널 (SC-A02 등 인증 계열 화면에서 재사용) */
export default function BrandPanel({
  title = (
    <>
      코드 이해도를
      <br />
      검증합니다
    </>
  ),
  description = '제출한 코드를 근거로 한 소크라틱 검증 세션과 5축 채점으로, 교육생의 실제 이해도를 측정하고 위험을 조기에 감지합니다.',
  meta = '교육 운영기관 전용 · 초대 기반 계정',
}: Props) {
  return (
    <div className="hidden flex-col items-center justify-center bg-[linear-gradient(150deg,var(--color-brand-1),var(--color-brand-2))] p-10 text-white md:flex md:w-1/2">
      <div className="w-full max-w-md">
        <div className="mb-10">
          <Wordmark light />
        </div>

        <h1 className="text-[26px] font-bold leading-snug">{title}</h1>

        <p className="mt-5 text-sm leading-relaxed text-white/70">{description}</p>

        <p className="mt-10 text-xs text-white/45">{meta}</p>
      </div>
    </div>
  )
}
