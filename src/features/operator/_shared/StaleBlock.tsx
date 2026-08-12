import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils/cn'

/*
  조건을 바꾼 뒤 **새 결과가 오기 전까지** 옛 표를 덮는 것.

  ─── 왜 흐리게만 두지 않나 ──────────────────────────────────────
  처음엔 `opacity-60`만 입혔다(`staleProps`). 그런데 실측에서 조건 하나를 바꾸면
  **5~9초**가 걸린다 — 그동안 화면은 이렇게 보인다.

      상태 필터: 「종료 (5)」        ← 내가 방금 고른 것
      표:        1행                ← 직전 조건의 결과
      그 사이:   흐림만             ← 이게 무슨 뜻인지 아무도 안 말한다

  **개수와 표가 서로 다른 말을 하는 화면**이고, 흐림은 그것을 설명하지 못한다.
  사용자는 「필터가 잘못 걸렸나」로 읽는다.

  그래서 셋을 같이 한다.
  ▸ **덮는다** — 옛 값은 참고용으로 남기되(비우면 깜빡인다) 위를 가려 *"지금 이 값이
    아니다"* 를 분명히 한다.
  ▸ **못 누르게 한다** — 옛 행을 눌러 다른 회차의 상세로 가는 사고를 막는다.
  ▸ **말한다** — 「불러오는 중」. 흐림은 눈으로만 보이는 신호라 `aria-busy`도 같이 단다.

  ─── 스켈레톤과 갈리는 지점 ─────────────────────────────────────
  **처음 오는 것은 스켈레톤**(보여줄 옛 값이 없다), **바뀌는 것은 이것**(옛 값이 있다).
  둘을 바꿔 쓰면 조건을 바꿀 때마다 표가 통째로 사라졌다 다시 생긴다.
*/
export default function StaleBlock({
  stale,
  label = '불러오는 중',
  children,
  className,
}: {
  /** 지금 그리는 값이 **옛 조건의 결과**인가 — 대개 `query.isPlaceholderData` */
  stale: boolean
  /** 무엇을 기다리는지. 화면마다 다르다 — 「목록을 불러오는 중」 */
  label?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('relative', className)} aria-busy={stale}>
      <div className={cn('transition-opacity', stale && 'opacity-40')}>{children}</div>
      {stale && (
        /*
          `inset-0`으로 덮되 **배경을 거의 안 칠한다** — 옛 값의 모양(행 수·열 폭)은
          계속 보여야 다음 값이 올 자리를 사용자가 안다.
          `role="status"`는 `Spinner`가 이미 갖는다 — 여기 또 달면 라이브 리전이 겹친다.
        */
        <div className="bg-surface/30 absolute inset-0 z-10 flex items-start justify-center pt-16">
          <span className="border-border bg-surface text-fg-muted shadow-card flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm">
            <Spinner className="size-4" aria-label={label} />
            {label}
          </span>
        </div>
      )}
    </div>
  )
}
