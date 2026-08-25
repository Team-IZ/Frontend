import { formatClock } from '@/lib/format'

type Props = {
  /** `REVIEW`면 「기록에만 남아요」 배지가 붙는다 — 실제 화면과 같다 */
  mode?: 'FIRST' | 'REVIEW'
  problemNo: number
  problemTotal: number
  title?: string
  elapsedMs: number
  /** 이 문제에 남은 시간. 전환·종료처럼 문제가 없는 국면에서는 `null` */
  problemRemainingMs: number | null
  ended?: boolean
}

/*
  상단 진행·시계 — 실제 화면(`SessionScreen.tsx`)의 `TopBar`를 그대로 옮겼다.

  **왜 import하지 않았나.** 그 `TopBar`는 `SessionScreen.tsx` 안의 로컬 함수라
  export가 없다. 그것을 export로 바꾸는 것은 기존 파일을 고치는 일이라, 시연용
  대역을 만들려다 실제 화면에 손대는 것이 된다 — 시연이 내일이라 그 위험을 안 진다.

  ⚠️ **사본이라 드리프트한다.** 실제 화면의 상단이 바뀌면 여기는 안 따라온다. 그래도
  괜찮은 이유는 이 폴더가 **시연이 끝나면 지울 것**이기 때문이다.
*/
export default function DemoTopBar({
  mode = 'FIRST',
  problemNo,
  problemTotal,
  title,
  elapsedMs,
  problemRemainingMs,
  ended,
}: Props) {
  const index = problemNo - 1
  const minutes = Math.floor(elapsedMs / 60_000)

  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-fg">
          {title ? `${title} · ` : ''}
          {index + 1} / {problemTotal}
        </span>
        <span className="flex gap-1">
          {Array.from({ length: problemTotal }, (_, i) => (
            <span
              key={i}
              className={
                i < index
                  ? 'size-1.5 rounded-full bg-success'
                  : i === index
                    ? 'size-1.5 rounded-full bg-primary'
                    : 'size-1.5 rounded-full bg-border'
              }
            />
          ))}
        </span>
        {mode === 'REVIEW' && (
          <span className="rounded-full bg-info-soft px-2 py-0.5 text-xs font-medium text-info">
            기록에만 남아요
          </span>
        )}
      </div>
      <span className="flex items-baseline gap-3 text-sm text-fg-subtle">
        {ended ? (
          `${minutes}분 걸렸어요`
        ) : problemRemainingMs != null ? (
          // 3분 아래면 경고색. 평소엔 차분하게 둔다(정의서 §2 "상시 경고 = 불안 누적")
          <span className={problemRemainingMs < 3 * 60_000 ? 'text-warning' : undefined}>
            이 문제 <b className="font-bold">{formatClock(problemRemainingMs)}</b> 남음
          </span>
        ) : null}
      </span>
    </div>
  )
}
