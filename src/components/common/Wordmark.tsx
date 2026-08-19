/*
  브랜드 마크 — "RZ" 배지 + "RealiZe" 워드마크. 인증 화면(BrandPanel)과 콘솔 셸(Topbar)
  양쪽에서 같은 로고를 쓰므로 공용으로 둔다. 한 군데서만 고치면 둘 다 바뀐다.

  "RealiZe"는 R·Z만 대문자 크기(text-[15px], 부모에서 상속) 그대로 두고 나머지
  소문자(eali·e)는 text-[12px]로 살짝 줄여 R과 Z가 도드라지게 한다.
*/
export default function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 text-[15px] font-bold ${light ? 'text-white' : 'text-fg'}`}
    >
      <span className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-sm bg-primary text-[13px] text-white">
        RZ
      </span>
      <span className="relative top-[0.75px]">
        R<span className="text-[12px]">eali</span>Z<span className="text-[12px]">e</span>
      </span>
    </div>
  )
}
