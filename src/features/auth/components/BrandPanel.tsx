import type { ReactNode } from 'react'
import Wordmark from '@/components/common/Wordmark'

interface Props {
  /** 마케팅 리드 — 화면마다 다름 */
  title?: ReactNode
  description?: string
  meta?: string
}

/**
 * AU-01 §3 · 좌 브랜드 패널 (AU-02·AU-03 등 인증 계열 화면에서 재사용)
 *
 * items-end + 이음선(오른쪽) 쪽 패딩 — 반쪽의 가운데에 두면 화면이 넓어질수록
 * 폼과 서로 멀어진다(1512에서 340px, 1920에서 540px). 양쪽을 이음선에 붙이면
 * 간격이 128px로 고정되어 어떤 폭에서도 한 덩어리로 읽힌다(01-design-checklist.md
 * "인증 이음선"). 배경은 계속 꽉 찬다.
 */
export default function BrandPanel({
  title = (
    <>
      코드 이해도를
      <br />
      검증합니다
    </>
  ),
  description = '제출한 코드의 특정 지점을 두고 왜 그렇게 했는지 묻습니다. 그 자리에서 설명할 수 있는지가 이해도입니다.',
  meta = '교육 운영기관 전용 · 초대 기반 계정',
}: Props) {
  return (
    <div className="hidden flex-col items-end justify-center bg-[linear-gradient(150deg,var(--color-brand-1),var(--color-brand-2))] p-10 text-white md:flex md:w-1/2 md:pr-16">
      <div className="w-full max-w-md">
        <div className="mb-10">
          <Wordmark light />
        </div>

        <h1 className="text-[26px] font-bold leading-snug">{title}</h1>

        <p className="mt-5 text-sm leading-relaxed text-white/70">{description}</p>

        <p className="mt-10 text-xs text-white/45">{meta}</p>

        {/*
          개인정보 처리방침 링크 — 감사 문서(pipa-secure-coding-audit.md ④) 대응, 이슈 168.
          별도 푸터를 새로 만들지 않고 기존 meta 줄 아래에 얹었다 — 로그인·초대·비밀번호
          재설정 3개 화면이 이 컴포넌트를 공유하므로 한 곳만 고치면 전부 적용된다.
        */}
        <button
          type="button"
          className="mt-2 text-xs text-white/45 underline decoration-white/30 underline-offset-2 hover:text-white/70"
          onClick={() =>
            window.open(
              '/shared/privacy-policy',
              'privacy-policy',
              'width=520,height=680,noopener,noreferrer',
            )
          }
        >
          개인정보 처리방침
        </button>
      </div>
    </div>
  )
}
