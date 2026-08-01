/*
  브랜드 마크 — ◆ + "IZ-Get". 인증 화면(BrandPanel)과 콘솔 셸(Topbar) 양쪽에서
  같은 로고를 쓰므로 공용으로 둔다. 한 군데서만 고치면 둘 다 바뀐다.
*/
export default function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 text-[15px] font-bold ${light ? 'text-white' : 'text-fg'}`}
    >
      <span className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-sm bg-primary text-[13px] text-white">
        IZ
      </span>
      IZ-Get
    </div>
  )
}
