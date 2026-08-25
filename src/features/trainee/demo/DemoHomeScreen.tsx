import { Link } from 'react-router'
import PageHeader from '@/components/common/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import StepTracker from '../home/components/StepTracker'
import type { StepState } from '../home/labels'
import DemoShell from './components/DemoShell'
import { PROBLEMS } from './data/fixture.ts'
import { hasStarted } from './engine.ts'
import { useDemoSession } from './useDemoSession.ts'

/*
  데모 홈 — **제출·분석은 끝난 것으로 고정**하고, 여기서 세션으로 들어간다.

  실제 `HomeScreen`의 `StatusCard`를 못 쓴다. 그 카드의 CTA 주소가 `labels.ts`의
  `buildStatusContent`에서 나오고 밖에서 바꿀 수가 없다 — 시연 중에 누르면
  `/trainee/session`으로 가서 로그인 화면을 만난다.

  `StepTracker`는 그대로 쓴다. 링크가 없고 `steps` 배열만 받는 순수 컴포넌트다.
*/

/** 제출·분석 완료 · 이해도 확인이 지금 할 일 · 리포트는 아직 */
const STEPS: StepState[] = ['done', 'done', 'now', 'pending']
const DONE_STEPS: StepState[] = ['done', 'done', 'done', 'now']

export default function DemoHomeScreen() {
  const { state, reset } = useDemoSession()
  const started = hasStarted(state)
  const ended = state.phase === 'ENDED'

  return (
    <DemoShell>
      <PageHeader title="홈" breadcrumb="미니프로젝트 3차 · 2026-08-25 마감" />

      <div className="flex flex-col gap-3">
        <StepTracker steps={ended ? DONE_STEPS : STEPS} />

        <Card className="gap-0 py-0">
          <div className="flex items-center justify-between border-b border-border px-5 py-2.5 text-sm font-medium">
            <span>{ended ? '이해도 확인을 마쳤어요' : '이해도 확인을 시작할 차례예요'}</span>
            <span className="text-fg-subtle">응시 창 오늘 23:59까지</span>
          </div>

          <div className="flex flex-col gap-4 p-5">
            <div>
              <p className="text-sm leading-relaxed text-fg">
                제출하신 코드를 분석해 <b>검증 개념 {PROBLEMS.length}개</b>를 뽑았어요. 한 개념마다
                질문 4개까지 이어지고, 막히면 다시 설명해 드려요.
              </p>
              <p className="mt-1 text-xs text-fg-subtle">
                전체 60분 · 개념당 20분 · 시작하면 되돌릴 수 없어요
              </p>
            </div>

            {/*
              어떤 개념을 묻는지 미리 보여준다 — 실제 홈에는 없는 것이지만, 시연에서
              "무엇을 검증하는가"가 먼저 서야 그다음 화면이 설명된다.
            */}
            <ul className="flex flex-col gap-1.5">
              {PROBLEMS.map((p) => (
                <li key={p.problemId} className="flex items-baseline gap-2 text-sm">
                  <span className="text-fg-subtle">·</span>
                  <span className="font-medium text-fg">{p.title}</span>
                  <span className="truncate font-mono text-[11px] text-fg-subtle">
                    {p.path.split('/').pop()}
                  </span>
                </li>
              ))}
            </ul>

            {/*
              끝났으면 세션으로 보내지 않는다 — 그 화면은 종료 화면만 다시 그린다.
              「다시 보기」는 실제 제품에 있는 별개 기능(REVIEW 모드)이라, 여기서 같은
              이름을 붙여 놓고 아무 일도 안 일어나면 그것부터 설명해야 한다.
            */}
            <div className="flex flex-wrap items-center gap-2">
              {ended ? (
                <Button nativeButton={false} render={<Link to="/demo/report" />}>
                  리포트 보기
                </Button>
              ) : (
                <Button nativeButton={false} render={<Link to="/demo/session" />}>
                  {started ? '이어서 하기' : '이해도 확인 시작하기'}
                </Button>
              )}
              {/*
                시연을 한 번 더 돌릴 때 쓴다. 실제 홈에는 없는 버튼이라 눈에 안 띄게 둔다 —
                시연 중에 실수로 누르면 진행이 통째로 날아간다.
              */}
              {started && (
                <button
                  type="button"
                  onClick={reset}
                  className="ml-auto text-xs text-fg-subtle underline underline-offset-2 hover:text-fg"
                >
                  처음부터 다시(시연용)
                </button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </DemoShell>
  )
}
