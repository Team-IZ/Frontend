import { ArrowRightIcon, PlayIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import StatusMessageCard from '@/components/common/StatusMessageCard'
import type { ProblemScript, SessionMode } from '../types'

type Props = {
  reason: 'STOP' | 'NEXT'
  mode: SessionMode
  nextProblem: ProblemScript
  isNextLast: boolean
  onContinue: () => void
}

/*
  문제 경계의 센터 메시지 — STOP은 "설명이 안 닿아 접힌 경우"에만 거치고, 정상 완료는
  곧장 NEXT로 간다(sessionReducer.ts 머리 주석). 목업 `.msg`는 흰 카드다(H+) — 공용
  StatusMessageCard로 아이콘·제목·설명·보조·액션 배치를 그대로 물려받는다.
*/
export default function TransitionScreen({
  reason,
  mode,
  nextProblem,
  isNextLast,
  onContinue,
}: Props) {
  if (reason === 'STOP') {
    return (
      <Center>
        <StatusMessageCard
          variant="default"
          icon={<ArrowRightIcon className="size-6" />}
          title="이 문제는 여기까지 볼게요"
          description={
            <>
              이 부분은 <b className="text-fg">리포트에서 자세히 설명해드릴게요.</b> <br />
              교안에서 어디를 다시 보면 되는지도 같이 알려드립니다.
            </>
          }
          aux="남은 문제는 계속 진행됩니다."
          actions={<Button onClick={onContinue}>다음 문제로</Button>}
        />
      </Center>
    )
  }

  const title =
    mode === 'RETRY' ? '다음 문제로 갈게요' : isNextLast ? '마지막 문제예요' : '다음 문제로 갈게요'
  const sub =
    mode === 'RETRY'
      ? '지난번에 막혔던 질문 하나씩만 봐요 · 더 깊은 질문으로 이어지지 않아요'
      : '앞 문제는 닫혔어요 · 다시 열 수 없습니다'

  return (
    <Center>
      <StatusMessageCard
        variant="default"
        icon={<PlayIcon className="size-6" />}
        title={title}
        description={
          <>
            <b className="text-fg">{nextProblem.title}</b>에 대해 이야기해요.{' '}
            <span className="text-fg-subtle">{nextProblem.file}</span>
          </>
        }
        aux={sub}
        actions={<Button onClick={onContinue}>시작하기</Button>}
      />
    </Center>
  )
}

/*
  목업 `.msg`는 흰 배경+테두리+그림자를 스스로 갖는 카드다 — StatusMessageCard는
  auth에서 이미 흰 패널 위에 얹혀 쓰이던 컴포넌트라 카드 배경이 없다. 여기 캔버스
  위에서는 Card로 한 번 더 감싸야 목업의 실제 모양이 된다.
*/
function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <Card className="mx-auto w-full max-w-[580px] gap-0 p-8 shadow-card">{children}</Card>
    </div>
  )
}
