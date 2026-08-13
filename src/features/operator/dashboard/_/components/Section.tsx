import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Card } from '@/components/ui/Card'
import { errorCopy } from '@/lib/errorCopy'
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
 * 블록 한 줄 자리의 「없는 것」. **화면 전체를 비우지 않는다**(F2 · 목업 `#partial`).
 *
 * 나머지 블록이 정상인데 한 줄만 붉은 면이 되면 그 블록이 이 화면의 주인공처럼 보인다 —
 * 카드 한 줄이라 danger 배경을 깔지 않고 톤으로만 가른다.
 */
function BlockNote({
  icon,
  children,
  action,
}: {
  icon: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="text-fg-subtle flex items-center gap-3 px-6 py-3 text-sm">
      <span aria-hidden>{icon}</span>
      <span>{children}</span>
      {action && <span className="ml-auto">{action}</span>}
    </div>
  )
}

/**
 * 값이 왔으면 그리고, 아니면 그 줄만 「없는 것」으로 — 네 블록이 같은 분기를 반복하지 않게.
 *
 * ▸ `undefined` — 아직 조회 중. **자리만 잡는다**(스켈레톤) — 없으면 도착할 때 카드가 튄다.
 * ▸ `pending`   — 조회는 됐는데 그릴 것이 아직 없다. **재시도를 붙이지 않는다** — 눌러도
 *   회차가 돌기 전엔 영영 같다(async-states §3-2 · op-01-situations §2-3).
 * ▸ `failed`    — 못 가져왔다. 문구는 `errorCopy`가 `status`·코드를 보고 정한다.
 */
export function BlockBody<T>({
  block,
  skeleton,
  subject,
  onRetry,
  retrying,
  children,
}: {
  block: Block<T> | undefined
  /**
   * 조회 중에 그릴 자리표시자. **회색 막대 하나를 기본값으로 두지 않는다** — 기본값이
   * 있으면 새 블록이 그걸 그대로 쓰고 다시 레이아웃이 밀린다. 모양을 정하게 강제한다.
   */
  skeleton: ReactNode
  /** 실패 문구에 들어갈 대상 — `errorCopy`가 조사와 함께 쓴다 */
  subject: string
  onRetry: () => void
  retrying?: boolean
  children: (value: T) => ReactNode
}) {
  // 아직 조회 중 — **그 블록 모양으로** 자리를 잡는다(`BlockSkeleton`)
  if (block === undefined) return <>{skeleton}</>

  if (block.state === 'pending') return <BlockNote icon="·">{block.reason}</BlockNote>

  if (block.state === 'failed') {
    const copy = errorCopy(block.error, { subject })
    return (
      <BlockNote
        icon="⚠"
        action={
          copy.retry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={retrying}
              className="text-primary text-xs hover:underline disabled:opacity-50"
            >
              {retrying ? '불러오는 중…' : '다시 시도'}
            </button>
          )
        }
      >
        {copy.title}
      </BlockNote>
    )
  }

  return <>{children(block.value)}</>
}
