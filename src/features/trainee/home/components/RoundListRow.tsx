import { Link } from 'react-router'

/** "예정" 회차 한 줄 또는 "지난 회차" 한 줄 — 둘 다 같은 배치(이름+설명 좌 · 태그/링크 우)를 쓴다 */
type Props =
  | { kind: 'upcoming'; label: string; detail: string }
  | { kind: 'past'; label: string; detail: string; to: string }

export default function RoundListRow(props: Props) {
  return (
    // 높이를 padding(py-2.5)이 아니라 고정값(h-11)으로 준다 — divide-y의 1px 선은
    // 어느 행이 갖든(border-top 또는 border-bottom) border-box 계산에 실제로 더해져
    // 그 행만 1px 커진다(실측 확인). 높이를 고정하면 선이 있는 행도 없는 행도 똑같은
    // 바깥 높이를 갖는다 — 44px는 터치 타깃 권장값과도 맞아떨어진다.
    <div className="flex h-11 items-center justify-between gap-3 px-4 text-sm">
      <div className="min-w-0">
        <span className="font-medium text-fg">{props.label}</span>
        <span className="ml-2 text-fg-subtle">{props.detail}</span>
      </div>
      {props.kind === 'upcoming' ? (
        <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-xs whitespace-nowrap text-fg-subtle">
          예정
        </span>
      ) : (
        <Link
          to={props.to}
          className="shrink-0 text-xs font-medium whitespace-nowrap text-primary hover:underline"
        >
          리포트 보기 →
        </Link>
      )}
    </div>
  )
}
