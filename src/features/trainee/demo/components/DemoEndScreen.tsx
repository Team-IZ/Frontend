import { CheckIcon } from 'lucide-react'
import { Link } from 'react-router'
import StatusMessageCard from '@/components/common/StatusMessageCard'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

/*
  세션 종료 — 실제 `EndScreen`을 못 쓰는 이유는 하나다. 그 화면의 버튼이
  `/trainee/home`으로 **하드코딩**돼 있어서, 시연 중에 누르면 로그인 화면으로 튄다.

  문구도 여기서는 달라야 한다. 실제 화면은 *"리포트는 곧 만들어져요"* 라고 말하는데
  (실제로 큐를 타므로 시간이 걸린다), 시연에서는 **바로 옆 화면에 이미 있다.**
  기다리라고 해 놓고 다음 순간 리포트를 여는 것이 시연에서 제일 이상해 보인다.
*/
export default function DemoEndScreen() {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <Card className="mx-auto w-full max-w-[580px] gap-0 p-8 shadow-card">
        <StatusMessageCard
          variant="success"
          icon={<CheckIcon className="size-6" />}
          title="끝났어요. 수고했어요"
          description="답한 내용을 바탕으로 리포트가 만들어졌어요."
          aux="막힌 부분은 리포트에서 자세히 설명해드려요 · 교안에서 어디를 보면 되는지도 함께"
          actions={
            <>
              <Button nativeButton={false} render={<Link to="/demo/report" />}>
                리포트 보기
              </Button>
              <Button variant="ghost" nativeButton={false} render={<Link to="/demo" />}>
                홈으로
              </Button>
            </>
          }
        />
      </Card>
    </div>
  )
}
