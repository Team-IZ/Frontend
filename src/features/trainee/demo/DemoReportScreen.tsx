import { Link } from 'react-router'
import PageHeader from '@/components/common/PageHeader'
import StatusMessageCard from '@/components/common/StatusMessageCard'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils/cn'
import { InboxIcon } from 'lucide-react'
import ConceptCard from '../report/components/ConceptCard'
import RoundRail from '../report/components/RoundRail'
import { askedConcepts } from '../report/_/api/types'
import { buildConcepts } from './buildReport.ts'
import DemoShell from './components/DemoShell'
import { useDemoSession } from './useDemoSession.ts'

/*
  데모 리포트 — **시연자가 누른 점수로 만든다.**

  `ConceptCard`·`RoundRail`을 실제 화면에서 그대로 가져다 쓴다. 도달 단계 배지 색,
  레일 핀, 잠금 문구, 문답 접기까지 전부 실제와 같다 — `buildReport.ts`가 서버가 주는
  모양(`ConceptReport`)을 그대로 만들기 때문이다.

  회차 레일은 한 칸뿐이다. 실제 화면은 과거 회차가 쌓여 있지만 시연에서는 지금 회차
  하나만 보면 되고, 없는 과거를 지어내면 그것부터 설명해야 한다.
*/
export default function DemoReportScreen() {
  const { state } = useDemoSession()

  if (state.phase !== 'ENDED') {
    return (
      <DemoShell>
        <PageHeader title="내 리포트" />
        <Card className="flex min-h-[360px] items-center justify-center p-10">
          <StatusMessageCard
            className="max-w-[560px]"
            variant="default"
            icon={<InboxIcon className="size-5" />}
            title="아직 받은 리포트가 없어요"
            description="이해도 확인을 마치면 여기에 쌓입니다."
            actions={
              <Button nativeButton={false} render={<Link to="/demo/session" />}>
                이해도 확인 하러 가기
              </Button>
            }
          />
        </Card>
      </DemoShell>
    )
  }

  const concepts = buildConcepts(state)
  const asked = askedConcepts(concepts)
  const retryCount = asked.filter((c) => c.isRetryTarget).length

  return (
    <DemoShell>
      <PageHeader title="내 리포트" breadcrumb="미니프로젝트 3차" />

      <div className="flex flex-col gap-4 md:flex-row md:gap-8">
        <RoundRail
          items={[
            {
              id: 'demo',
              label: '미니프로젝트 3차',
              note: retryCount > 0 ? `다시 볼 개념 ${retryCount}개` : '전부 통과',
              hasDot: retryCount > 0,
            },
          ]}
          selectedId="demo"
          onSelect={() => {}}
        />

        <div className="min-w-0 flex-1">
          <Card className="p-6">
            <div className="mb-5">
              <p className="text-sm text-fg-muted">
                검증 개념 {asked.length}개 중{' '}
                <b className="text-fg">{asked.length - retryCount}개</b>를 통과했어요.
                {retryCount > 0 && ` ${retryCount}개는 다시 보기 대상이에요.`}
              </p>
              <p className="mt-1 text-xs text-fg-subtle">
                교안 spring_backend_v1.pdf · 2026-08-25 발행
              </p>
            </div>

            <ReachLadder />

            {concepts.map((c, i) => (
              <ConceptCard key={c.name} concept={c} isLast={i === concepts.length - 1} />
            ))}
          </Card>
        </div>
      </div>
    </DemoShell>
  )
}

/*
  도달 단계 사다리 — **시연에만 있는 줄이다.**

  실제 리포트에는 없다. 학생은 회차를 거치며 이 사다리를 이미 알고 오지만, 시연을
  보는 사람은 오늘 처음 본다. 카드 배지(`언제 문제가 되는지까지`)만 던져 두면
  "그래서 이게 잘한 건가"를 알 수 없다 — 5칸 중 어디인지가 안 보이기 때문이다.

  **배지를 길게 만드는 대신 사다리를 위에 한 번만 그린다.** 배지마다 `4단 ·`을 붙이면
  카드 셋이 전부 길어지고, 정작 중요한 개념 이름이 밀린다.

  0단은 뺐다. 사다리는 "어디까지 올라가는가"를 보여주는 자리이고 0단은 그 사다리에
  발을 못 붙인 상태라, 칸으로 그리면 "0단도 한 단계"로 읽힌다.
*/
const LADDER = [
  { step: 1, label: '무엇을 하는지' },
  { step: 2, label: '왜 그렇게 했는지' },
  { step: 3, label: '가능한 다른 방법' },
  { step: 4, label: '언제 문제가 되는지' },
]

function ReachLadder() {
  return (
    <div className="mb-6 rounded-md bg-canvas px-4 py-3">
      <p className="mb-2 text-[11px] font-medium text-fg-muted">
        도달 단계 — 질문은 아래 순서로 깊어지고, 답한 만큼 올라갑니다
      </p>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1.5">
        {LADDER.map(({ step, label }, i) => (
          <li key={step} className="flex items-center gap-1.5">
            {i > 0 && (
              <span aria-hidden="true" className="text-fg-subtle">
                ›
              </span>
            )}
            <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-surface px-2.5 py-1">
              {/* 핀 색은 카드 배지와 같은 --color-reach-N을 쓴다 — 같은 단계면 같은 색이어야 한다 */}
              <span className={cn('size-2 rounded-full', REACH_PIN[step])} />
              <span className="text-xs text-fg-muted">
                <b className="font-bold text-fg">{step}단</b> {label}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

const REACH_PIN: Record<number, string> = {
  1: 'bg-reach-1',
  2: 'bg-reach-2',
  3: 'bg-reach-3',
  4: 'bg-reach-4',
}
