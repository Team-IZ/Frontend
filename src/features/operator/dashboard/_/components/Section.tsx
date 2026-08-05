import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Card } from '@/components/ui/Card'
import type { Block } from '../api/types'

/*
  블록 하나의 껍데기 — 머리줄 + 카드. 네 블록이 같은 모양이라 여기서 한 번만 조립한다.

  **머리줄은 카드 밖이다**(목업 `.sh2` ↔ `.card2`). 그래서 실패·0건일 때 **카드가 그 자리를
  그대로 차지**한다 — 빈 상태를 카드 *안에* 또 넣으면 중첩이 된다(H7 · 02-layout §4-1).
  `Empty` 프리미티브를 여기 쓰지 않는 이유다. 그건 카드가 없는 자리에 쓰는 점선 박스다.

  간격은 목업 px 그대로다 — 토큰 이름이 아니라 값을 옮긴다(decision-log D21).
  `--sp-2`=8px(`gap-2`) · `--sp-5`=24px(**`px-6`**, `p-5`가 아니다).
*/

export function Section({
  title,
  /** 제목 옆 보조 문구. `· 미프 3차` · `· 4건`처럼 점을 포함해 넘긴다 */
  note,
  link,
  /**
   * **이 화면의 주인공인가.** 정의서가 *"`조치 필요` 네 줄이 이 화면의 존재 이유고
   * 나머지 세 블록은 그 네 줄을 읽기 위한 배경"* 이라 했는데, 네 블록의 머리줄이 전부
   * 같은 굵기·같은 크기라 **페이지가 "동등한 것 넷"으로 읽혔다.**
   *
   * 주인공만 굵게 두고 배경은 보통 굵기로 내린다 — 크기는 그대로다. 크기까지 키우면
   * 이번엔 그 블록이 페이지 제목과 경쟁한다.
   */
  lead = false,
  children,
}: {
  title: string
  note?: ReactNode
  link?: { to: string; label: string }
  lead?: boolean
  children: ReactNode
}) {
  return (
    <section className="mb-4">
      <div className="mb-2 flex items-baseline gap-2">
        <h2 className={`text-sm ${lead ? 'text-fg font-bold' : 'text-fg-muted font-medium'}`}>
          {title}
        </h2>
        {note && <span className="text-fg-subtle text-2xs">{note}</span>}
        {link && (
          <Link to={link.to} className="text-primary ml-auto text-xs hover:underline">
            {link.label} ↗
          </Link>
        )}
      </div>
      <Card className="gap-0 py-0">{children}</Card>
    </section>
  )
}

/**
 * 블록 하나가 실패했을 때. **화면 전체를 비우지 않는다**(F2 · 목업 `#partial`).
 *
 * 「없는 것」 3종 중 **유형 3 `실패`** 라서 `다시 시도`를 같이 둔다(02-layout §4).
 * 다만 여기서는 카드 한 줄이라 danger 배경을 깔지 않는다 — 나머지 블록이 정상인데
 * 한 줄만 붉은 면이 되면 그 블록이 이 화면의 주인공처럼 보인다.
 */
export function BlockFailed({ label, onRetry }: { label: string; onRetry: () => void }) {
  return (
    <div className="text-fg-subtle flex items-center gap-3 px-6 py-3 text-sm">
      <span aria-hidden>⚠</span>
      <span>{label}</span>
      <button
        type="button"
        onClick={onRetry}
        className="text-primary ml-auto text-xs hover:underline"
      >
        다시 시도
      </button>
    </div>
  )
}

/** 값이 왔으면 그리고, 실패했으면 그 줄만 실패로 — 네 블록이 같은 분기를 반복하지 않게 */
export function BlockBody<T>({
  block,
  failedLabel,
  onRetry,
  children,
}: {
  block: Block<T>
  failedLabel: string
  onRetry: () => void
  children: (value: T) => ReactNode
}) {
  if (!block.ok) return <BlockFailed label={failedLabel} onRetry={onRetry} />
  return <>{children(block.value)}</>
}
