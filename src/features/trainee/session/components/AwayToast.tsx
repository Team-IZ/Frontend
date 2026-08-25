import { ZapIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils/cn'
import StatusMessageCard from '@/components/common/StatusMessageCard'

/*
  창 이탈 복귀 — 알리되 막지 않는다(정의서 §6). 액션이 없어 토스트로 뜬다.
  목업 `.toast`는 코드 패널과 같은 다크 톤(--c-code)을 쓴다 — 우연이 아니라 "이
  화면의 어두운 강조색은 하나"라는 뜻이라 같은 토큰을 그대로 가져온다.

  화면 아래쪽 끝(bottom-6)은 코드 패널이나 답변창과 너무 붙어 눈에 잘 안 띄었다
  (실사용 피드백으로 발견) — 정중앙보다 살짝 아래로 옮겨 화면 중심 시야에 들어오게
  한다. 사라질 때도 즉시 언마운트하면 뚝 끊겨 보여, leaving 동안 opacity를 0으로
  트랜지션한 뒤(useSessionEffects.ts의 TOAST_FADE_MS만큼 더 붙어 있다가) 사라진다.
*/
/*
  🔴 **`z-50`이 없으면 리사이즈 손잡이에 가린다.**

  코드 패널과 대화 패널 사이 손잡이의 thumb이 `z-10`이다(`ui/Resizable.tsx`). 토스트는
  화면 한가운데 뜨는데 그 손잡이가 세로로 가로지르므로 정확히 겹치고, 쌓임 순서가
  없으면 **나중에 그려진 손잡이가 위로 온다**(실사용 피드백으로 발견).

  **언제나 최상단이다.** 이 화면에서 토스트보다 위에 와야 하는 것은 없으므로 다른 층과
  경쟁하지 않게 넉넉히 올려 둔다 — 나중에 무엇이 추가돼도 이 판단이 안 흔들린다.
*/
const TOAST_POSITION =
  'pointer-events-none absolute top-1/2 left-1/2 z-[1000] -translate-x-1/2 -translate-y-[45%]'
const TOAST_BODY =
  'rounded-full bg-code px-4 py-2.5 text-sm text-code-fg shadow-card transition-opacity duration-300'

export function AwayToast({ seconds, leaving }: { seconds: number; leaving: boolean }) {
  return (
    <div className={TOAST_POSITION}>
      <div className={cn(TOAST_BODY, leaving ? 'opacity-0' : 'opacity-100')}>
        화면을 벗어났다 돌아왔어요 · {seconds}초 · 기록에 남습니다
      </div>
    </div>
  )
}

/** 60분 경과 시 1회 — 카운트다운 없이 진행하다 예고 없이 끊기지 않도록 딱 한 번만 알린다 */
export function TimeWarningToast({ leaving }: { leaving: boolean }) {
  return (
    <div className={TOAST_POSITION}>
      <div className={cn(TOAST_BODY, leaving ? 'opacity-0' : 'opacity-100')}>
        슬슬 마무리할 시간이에요 · 10분 후 자동으로 마무리됩니다
      </div>
    </div>
  )
}

/** 네트워크 끊김 — 뒤 화면은 그대로 두고 오버레이만(H+ "오버레이는 진행이 막혔을 때") */
export function OfflineOverlay({ onDismiss }: { onDismiss: () => void }) {
  return (
    // 손잡이(z-10)보다 위 — 진행을 막는 오버레이가 그 아래 깔리면 안 된다
    <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-fg/55 p-6">
      {/* 오버레이는 목업에서 border-color:transparent만 다르고 나머지 카드 모양은 같다 */}
      <Card className="mx-auto w-full max-w-[460px] gap-0 border-transparent p-6 shadow-card">
        <StatusMessageCard
          variant="danger"
          icon={<ZapIcon className="size-6" />}
          title="연결이 끊겼어요"
          description={
            <>
              쓰던 답변은 이 기기에 남아 있어요. 연결되면 <b className="text-fg">마지막 질문부터</b>{' '}
              이어서 진행합니다.
            </>
          }
          aux="경과 시간은 멈추지 않아요 · 서두르지 않아도 돼요"
          actions={
            <Button variant="ghost" onClick={onDismiss}>
              다시 연결
            </Button>
          }
        />
      </Card>
    </div>
  )
}
