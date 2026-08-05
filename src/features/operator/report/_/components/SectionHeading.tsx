/**
 * 섹션 제목줄 — **제목 · 이 섹션이 답하는 질문 · 사실 메타.**
 *
 * 제목을 각 섹션 컴포넌트에서 꺼내 이리로 모았다. 이유는 배치가 아니라 **문장이다** —
 * 다섯 섹션은 나열이 아니라 순서(회차 → 개념 → 반 → 사람)이고, 그 순서를 읽는
 * 사람에게 전달하는 건 각 섹션의 `question`이다. 질문들이 서로를 이어받아야 하는데
 * (회차별의 "어느 회차"를 개념별이 "그 회차의 어느 개념"으로 받는 식) 그 문장들이
 * 다섯 파일에 흩어져 있으면 같이 고쳐지지 않는다.
 */
export default function SectionHeading({
  title,
  question,
  meta,
}: {
  title: string
  /** 이 섹션이 답하는 질문. 앞 섹션이 남긴 물음을 받아야 한다 */
  question: string
  /** 개수·분모 같은 사실. 해석은 넣지 않는다(정의서 §4) */
  meta?: string
}) {
  return (
    /*
      인쇄에서는 섹션마다 쪽이 갈리므로(`break-after-page`) 이 줄이 **그 쪽의 머리글**이
      된다 — 화면처럼 작게 두면 표와 구분이 안 돼 다섯 쪽이 한 덩어리로 보인다.
      종이에서만 키우고 아래에 선을 긋는다.
    */
    <div className="border-border mb-4 print:mb-3 print:border-b print:pb-1.5">
      <div className="flex items-baseline gap-2">
        <h4 className="text-sm font-bold print:text-base">{title}</h4>
        {meta && <span className="text-fg-subtle text-xs">{meta}</span>}
      </div>
      <p className="text-fg-muted mt-1 text-xs print:mt-0.5">{question}</p>
    </div>
  )
}
