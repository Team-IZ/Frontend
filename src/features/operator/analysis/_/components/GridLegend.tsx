import { CELL_STATE_LEGEND, RISK_DEFINITION, SIGN_SWATCH } from '../labels'

/*
  범례 — **표 바로 아래**(MG-02와 같은 자리).

  ▸ **기호 설명이 전부 여기 모인다.** 축 라벨은 *"이 축이 뭐냐"* 이고 범례는 *"이 기호가
    뭐냐"* 인데, `숫자 = 비율`·`색 = 부호`는 둘 다 기호 설명이라 여기 것이다. 좌상단에
    네 줄이 쌓여 있던 것을 이리로 내렸다.
  ▸ **칸이 셋이다.** 목업은 5칸 그라데이션을 뒀는데 **실제 셀은 세 종류**였다. 5칸을 보면
    *"중간값이 있다"* 고 읽고 없는 정밀도를 기대하게 된다 — PRODUCT.md가 anti-reference로
    적은 **가짜 정밀도**다.
  ▸ **용어 정의는 `ⓘ`로 접는다.** `위험자`가 무엇인지는 처음 한 번만 필요하고, 매번
    자리를 차지하면 아는 사람에게는 잔소리다. 호버·포커스 둘 다 열린다.
*/
export default function GridLegend({ baselineName }: { baselineName: string }) {
  const signs = [
    { key: 'BETTER', label: '좋음' },
    { key: 'SAME', label: '같음' },
    { key: 'WORSE', label: '나쁨' },
  ] as const

  return (
    <div className="text-fg-subtle mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-2xs">
      {/* 값이 무엇인가 — 정의는 접어 둔다 */}
      <span className="flex items-center gap-1">
        숫자 = 위험자 비율
        <span
          tabIndex={0}
          title={RISK_DEFINITION}
          aria-label={`위험자 — ${RISK_DEFINITION}`}
          className="border-border-strong text-fg-subtle focus-visible:ring-primary flex size-3.5 cursor-help items-center justify-center rounded-full border text-[9px] focus-visible:ring-2 focus-visible:outline-none pt-1"
        >
          ?
        </span>
      </span>

      {/*
        색이 무엇인가. 칩에 **테두리를 준다** — 셀 색이 연해서(큰 면이라 채도를 낮췄다)
        12px 칩은 흰 배경에서 거의 안 보인다.
      */}
      <span className="flex items-center gap-2">
        색 = {baselineName}보다
        {signs.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span
              className={`border-border-strong size-3.5 rounded-sm border ${SIGN_SWATCH[s.key]}`}
            />
            {s.label}
          </span>
        ))}
      </span>

      {/*
        **둘을 갈라 적는다.** `값이 아직 없음` 하나로 묶었더니 오퍼레이터가 할 일이 같아
        보였는데, `집계 전`은 기다리면 채워지고 `시작 전`은 아직 시작도 안 한 회차다.
      */}
      {CELL_STATE_LEGEND.map((s) => (
        <span key={s.label} className="flex items-center gap-1.5">
          <span className="text-fg-subtle/70 text-2xs">{s.label}</span>
          <span>{s.desc}</span>
        </span>
      ))}
    </div>
  )
}
