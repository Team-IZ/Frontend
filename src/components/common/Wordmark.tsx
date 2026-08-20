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
      {/*
        `items-center`만으로는 **글자가 가운데로 안 온다.** 그것이 가운데 맞추는 것은
        글리프가 아니라 **라인박스**이고, 라인박스에는 디센더(g·y가 내려가는) 자리가
        늘 들어 있다. "RZ"에는 내려가는 글자가 없어서 그 빈 자리만큼 위로 뜬다 —
        픽셀로 재서 **1.19px**이었다.

        `text-box: trim-both cap alphabetic`이 그 박스를 **대문자 윗선~베이스라인**으로
        깎아 준다. 남는 것이 글자 자체라 `items-center`가 그것을 가운데 놓는다.

        🔴 **안쪽 span에 걸어야 한다.** 배지에 직접 걸면 아무 일도 안 일어난다(실측 —
        1.19px 그대로). 트림은 **가운데 놓이는 그 박스 자신**에 적용돼야 하는데, 글자를
        배지에 바로 넣으면 그것은 이름 없는 익명 박스라 대상이 되지 못한다. span으로
        감싸 flex 항목으로 만들면 그때 걸린다 — 실측 1.19px → **0.44px**.

        남는 0.44px는 폰트가 선언한 캡 높이와 실제 잉크가 미세하게 다른 것이라 CSS로는
        여기가 바닥이다. px로 밀지 않는 이유는 그 값이 폰트마다 달라서다 — 폰트가 바뀌면
        또 어긋나는데, 이 방식은 폰트 지표를 따라간다.

        ⚠ 아직 못 받는 브라우저(파이어폭스)에서는 무시되고 예전처럼 그린다. 더 나빠지지는
        않는다.
      */}
      <span className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-sm bg-primary text-[14px] text-white">
        <span className="[text-box:trim-both_cap_alphabetic]">RZ</span>
      </span>
      <span className="relative top-[2.5px]">
        R<span className="text-[12px]">eali</span>Z<span className="text-[12px]">e</span>
      </span>
    </div>
  )
}
