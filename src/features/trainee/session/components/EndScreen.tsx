import { CheckIcon, HourglassIcon, LockIcon } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import StatusMessageCard from '@/components/common/StatusMessageCard'
import type { EndReason, SessionMode } from '../types'

type Props = { mode: SessionMode; reason: EndReason }

/** 세션 종료 — 정상 종료·70분 초과·다시 보기 종료가 같은 자리에서 문구만 갈린다(H+) */
export default function EndScreen({ mode, reason }: Props) {
  if (mode === 'REVIEW') {
    return (
      <Center>
        <StatusMessageCard
          variant="success"
          icon={<LockIcon className="size-6" />}
          title="다시 보기가 끝났어요"
          description={
            <>
              리포트에 <b className="text-fg">자세한 해설이 열렸습니다.</b> 지난번 답변과 나란히 볼
              수 있어요.
            </>
          }
          aux="이번 결과는 기록에만 남아요 · 성적은 그대로입니다"
          actions={
            <Button nativeButton={false} render={<Link to="/trainee/report" />}>
              리포트 보기
            </Button>
          }
        />
      </Center>
    )
  }

  if (reason === 'TIMEOUT') {
    return (
      <Center>
        <StatusMessageCard
          variant="default"
          icon={<HourglassIcon className="size-6" />}
          title="시간이 다 되어 여기까지 저장했어요"
          description={
            <>
              <b className="text-fg">답한 문제까지는 그대로 저장</b>됐어요. 남은 문제는{' '}
              <b className="text-fg">답하지 않은 것</b>으로 기록됩니다.
            </>
          }
          aux="리포트는 회차 마감 후 발행됩니다 · 사정이 있었다면 매니저에게 알려 주세요"
          actions={
            <Button nativeButton={false} render={<Link to="/trainee/home" />}>
              홈으로
            </Button>
          }
        />
      </Center>
    )
  }

  return (
    <Center>
      <StatusMessageCard
        variant="success"
        icon={<CheckIcon className="size-6" />}
        title="끝났어요. 수고했어요"
        /*
          🔴 「회차 마감 후 한꺼번에」에서 바꿨다 — **발행이 응시 직후로 옮겨졌다**
          (백엔드 2026-08-20 머지: 세션 종료 뒤 곧 리포트 생성을 건다). 마감까지
          기다리라고 하면 학생이 홈을 안 열어 본다.

          **몇 분이라고 못박지 않는다.** 생성은 큐를 타므로 밀릴 수 있고, 숫자를
          말했다가 그보다 늦으면 화면이 거짓말이 된다.
        */
        description="리포트는 곧 만들어져요. 다 되면 홈에서 볼 수 있어요."
        aux="막힌 부분은 리포트에서 자세히 설명해드려요 · 교안에서 어디를 보면 되는지도 함께"
        actions={
          <Button nativeButton={false} render={<Link to="/trainee/home" />}>
            홈으로
          </Button>
        }
      />
    </Center>
  )
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <Card className="mx-auto w-full max-w-[580px] gap-0 p-8 shadow-card">{children}</Card>
    </div>
  )
}
