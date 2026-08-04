/**
 * 필수 표시. 라벨 옆에 붙는다.
 *
 * `*` 하나로 쓰지 않는다 — 무엇이 필수인지 색과 기호로만 말하면 색을 구분하기 어려운
 * 사용자에게 전달되지 않는다(F4와 같은 결). 글자가 그대로 말한다.
 */
export default function RequiredMark({ children = '필수' }: { children?: string }) {
  return <span className="text-danger text-2xs font-semibold">{children}</span>
}
