import { Link, useNavigate } from 'react-router'
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
import { PROBLEMS } from './data/fixture.ts'
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
/** 개념 이름 → 문제 번호. 리포트 카드는 이름만 들고 있다 */
const problemNoOf = (name: string) => PROBLEMS.find((p) => p.title === name)?.problemNo ?? 1

export default function DemoReportScreen() {
  const { state, send } = useDemoSession()
  const navigate = useNavigate()

  /** 그 개념 하나로 세션을 다시 열고 세션 화면으로 보낸다 */
  const startReview = (problemNo: number) => {
    send({ type: 'START_REVIEW', problemNo })
    navigate('/demo/session')
  }

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
  /*
    **다시 보기는 개념마다 한 번씩이다.** 대상이 셋이면 셋 다 볼 수 있고, 본 개념만
    빠진다 — 좌측 레일이 말하는 것도 «아직 남은 개수»다.
  */
  const pendingRetry = asked.filter((c) => c.isRetryTarget && !c.comparedReach).length
  const reviewedCount = asked.filter((c) => c.comparedReach).length

  return (
    <DemoShell>
      <PageHeader title="내 리포트" />

      <div className="flex flex-col gap-4 md:flex-row md:gap-8">
        <RoundRail
          items={[
            {
              id: 'demo',
              label: '미니프로젝트 3차',
              /*
                실제 레일은 회차마다 상태를 한 줄로 말한다(`시작 전`·`중단`·
                `다시 보기 1개 완료`). 데모는 회차가 하나라 그 한 줄에 지금 상태를 쓴다.
              */
              note:
                pendingRetry > 0
                  ? `다시 볼 개념 ${pendingRetry}개`
                  : reviewedCount > 0
                    ? `다시 보기 ${reviewedCount}개 완료`
                    : '전부 통과',
              hasDot: pendingRetry > 0,
            },
          ]}
          selectedId="demo"
          onSelect={() => {}}
        />

        <div className="min-w-0 flex-1">
          <Card className="p-6">
            {/*
              헤더 — **실제 리포트와 같은 모양**이다(`MyReportScreen`의 `PublishedBody`):
              회차 이름을 `h2`로, 그 아래 발행일·교안을 한 줄로. 다시 보기를 마쳤으면
              그 날짜도 같은 줄에 붙는다.
            */}
            <div className="mb-4">
              <h2 className="text-xl font-bold text-fg">미니프로젝트 3차</h2>
              <p className="text-sm text-fg-subtle">
                발행 08-25
                {reviewedCount > 0 && ` · 다시 보기 ${reviewedCount}개`} · 교안
                spring_backend_v1.pdf
              </p>
            </div>

            {/*
              배너를 두지 않는다. 「다시 볼 수 있는 문제 N개」·「다시 보기를 마쳤어요」를
              맨 위에 뒀었는데, 정작 할 일은 **개념 카드 안의 버튼**이라 배너는 같은 말을
              한 번 더 하면서 위쪽 공간만 먹었다(실사용 피드백). 남은 개수는 좌측 회차
              레일의 한 줄이 이미 말한다.
            */}
            <ReachLadder />

            {concepts.map((c, i) => (
              <ConceptCard
                key={c.name}
                concept={c}
                isLast={i === concepts.length - 1}
                /*
                  🔴 **카드 안에 넣는다.** 밖에서 형제로 그렸더니 좌측 타임라인 선·핀과
                  어긋나 버튼이 카드 밖으로 튀어나왔다(실측 — 레이아웃이 깨졌다).
                  카드가 자기 `pl-5` 안에 품어야 선이 그 아래로 이어진다.

                  다시 볼 수 있는 개념(2단 미만)이면서 **아직 안 본 것**에만 붙는다.
                */
                footer={
                  c.asked && c.isRetryTarget && !c.comparedReach ? (
                    <div className="mt-3">
                      {/*
                        색은 「리포트 보기」와 같은 primary — 둘 다 앞으로 나아가는 주 액션.

                        옆에 설명을 붙이지 않는다 — 바로 위 잠금 안내가 이미 「마치면
                        열린다」를 말한다. 같은 말이 두 줄에 걸치면 버튼이 그만큼 밀린다.
                      */}
                      <Button size="sm" onClick={() => startReview(problemNoOf(c.name))}>
                        이 개념 다시 보기
                      </Button>
                    </div>
                  ) : null
                }
              />
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

  **0단도 넣는다.** 처음엔 뺐는데, 리포트에 `코드 설명까지 가지 못했어요` 배지가 뜨는데
  사다리에는 그 칸이 없어 **그게 몇 단인지 알 수 없었다.** 0단은 "사다리에 발을 못
  붙인 상태"라는 뜻이고, 그것도 다섯 칸 중 하나로 보여야 위치가 잡힌다.
*/
const LADDER = [
  { step: 0, label: '설명까지 못 감' },
  { step: 1, label: '무엇을 하는지' },
  { step: 2, label: '왜 그렇게 했는지' },
  { step: 3, label: '가능한 다른 방법' },
  { step: 4, label: '언제 문제가 되는지' },
]

function ReachLadder() {
  return (
    <div className="mb-4 rounded-md bg-canvas px-3 py-2">
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
  0: 'bg-reach-0',
  1: 'bg-reach-1',
  2: 'bg-reach-2',
  3: 'bg-reach-3',
  4: 'bg-reach-4',
}
