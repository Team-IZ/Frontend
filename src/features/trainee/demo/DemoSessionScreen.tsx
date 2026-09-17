import { useEffect, useRef, useState } from 'react'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/Resizable'
import CodePane from '../session/components/CodePane'
import IntroScreen from '../session/components/IntroScreen'
import QuestionThread from '../session/components/QuestionThread'
import TransitionScreen from '../session/components/TransitionScreen'
import { AwayToast } from '../session/components/AwayToast'
import { useAwayToast } from '../session/useSessionEffects'
import DemoEndScreen from './components/DemoEndScreen'
import DemoTopBar from './components/DemoTopBar'
import ScoreBar from './components/ScoreBar'
import type { Score } from './data/rubric.ts'
import { currentAxis, currentProblem, PROBLEM_TOTAL } from './engine.ts'
import { useDemoSession } from './useDemoSession.ts'

/*
  시연용 검증 세션 — **실제 TR-03과 같은 화면이고 뒤만 바뀐 것**이다.

  `CodePane`·`QuestionThread`·`IntroScreen`·`TransitionScreen`을 실제 화면에서 그대로
  가져다 쓴다(같은 feature 안이라 상대경로로 참조한다). 그래서 코드 패널의 하이라이트,
  말풍선 색, 질문 라벨, 스크롤 따라가기가 전부 실제와 같다.

  다른 것은 셋이다.

  ```
  ComposeBar → ScoreBar       답을 쓰는 대신 채점 결과를 고른다
  서버 훅    → engine.ts      진행 판정을 순수 함수가 한다 (네트워크 0회)
  EndScreen  → DemoEndScreen  실제 것은 /trainee/home으로 하드코딩돼 있다
  ```

  ## 시계는 왜 종료시키지 않나

  실제로는 문제당 20분이 지나면 서버가 접는다. 그대로 두면 시연 도중 설명이 길어졌을
  때 화면이 혼자 넘어간다 — 말하던 사람이 무엇을 보여주고 있었는지 잃는다. 그래서
  시계는 **돌기만 하고**, 종료는 `ScoreBar`의 「시간 초과시키기」만 일으킨다.
*/

/** 문제당 20분 — 실제 값(`session.problem-time-limit-minutes`)과 같다 */
const PROBLEM_LIMIT_MS = 20 * 60_000

/** 관찰 신호를 보낼 서버가 없다 — 토스트만 띄우면 되므로 콜백은 비운다 */
const noop = () => {}

export default function DemoSessionScreen() {
  const { state, send } = useDemoSession()
  const [callersExpanded, setCallersExpanded] = useState(true)

  /*
    문제별 시계의 기산점. **문제가 바뀔 때만 다시 찍는다** — 세션 시작에서 재면
    두 번째 문제부터 전부 틀린다(실제 화면이 예전에 겪은 것과 같은 함정이다).
  */
  const problemStartedAt = useRef(Date.now())
  useEffect(() => {
    problemStartedAt.current = Date.now()
  }, [state.problemIdx])

  /*
    창 이탈 감지 — 실제 화면의 훅을 그대로 쓴다. 데모는 기록을 서버로 보내지 않으므로
    콜백은 비어 있고, 토스트만 뜬다.
  */
  const awayToast = useAwayToast(noop, state.phase !== 'ENDED')

  const elapsedMs = useTicker(state.phase === 'IN_PROBLEM')
  const problemRemainingMs =
    state.phase === 'IN_PROBLEM'
      ? Math.max(0, PROBLEM_LIMIT_MS - (Date.now() - problemStartedAt.current))
      : null

  const problem = currentProblem(state)

  if (state.phase === 'INTRO') {
    return (
      <div className="h-svh">
        <IntroScreen
          mode={state.mode}
          problemTotal={PROBLEM_TOTAL}
          onStart={() => send({ type: 'START' })}
          starting={false}
        />
      </div>
    )
  }

  if (state.phase === 'ENDED') {
    return (
      <div className="flex h-svh flex-col">
        <DemoTopBar
          mode={state.mode}
          problemNo={problem.problemNo}
          problemTotal={PROBLEM_TOTAL}
          elapsedMs={elapsedMs}
          problemRemainingMs={null}
          ended
        />
        <div className="flex-1">
          <DemoEndScreen />
        </div>
      </div>
    )
  }

  if (state.phase === 'TRANSITION') {
    return (
      <div className="flex h-svh flex-col">
        <DemoTopBar
          mode={state.mode}
          problemNo={problem.problemNo}
          problemTotal={PROBLEM_TOTAL}
          elapsedMs={elapsedMs}
          problemRemainingMs={null}
        />
        <div className="flex-1">
          <TransitionScreen
            reason={state.transitionReason ?? 'NEXT'}
            mode={state.mode}
            nextTitle={problem.title}
            nextPath={problem.code.path}
            isNextLast={problem.problemNo === PROBLEM_TOTAL}
            onContinue={() => {
              send({ type: 'CONTINUE' })
              setCallersExpanded(true)
            }}
          />
        </div>
      </div>
    )
  }

  const axisCode = currentAxis(state)

  return (
    <div className="relative flex h-svh flex-col">
      <DemoTopBar
        mode={state.mode}
        problemNo={problem.problemNo}
        problemTotal={PROBLEM_TOTAL}
        title={problem.title}
        elapsedMs={elapsedMs}
        problemRemainingMs={problemRemainingMs}
      />
      {/* 폭 기본값 428px·최소 320·최대 700은 실제 화면과 같은 값이다 */}
      <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
        <ResizablePanel
          defaultSize={428}
          minSize={320}
          maxSize={700}
          className="border-r border-border"
        >
          <CodePane
            title={problem.title}
            code={problem.code}
            highlight={problem.current?.highlight ?? null}
            dimmed={false}
            callersExpanded={callersExpanded}
            onToggleCallers={() => setCallersExpanded((v) => !v)}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel minSize={320} className="flex flex-col">
          <QuestionThread
            mode={state.mode}
            turns={problem.turns}
            current={problem.current}
            pendingAnswer={null}
            waiting={false}
            waitingLabel=""
          />
          <ScoreBar
            axisCode={axisCode}
            hintsLeft={problem.current?.hintsLeft ?? 0}
            onScore={(score: Score, answerText: string) =>
              send({ type: 'ANSWER', score, answerText })
            }
            onTimeOut={() => send({ type: 'TIME_OUT' })}
            onRequestHint={() => send({ type: 'OPEN_HINT' })}
          />
        </ResizablePanel>
      </ResizablePanelGroup>

      {/*
        창을 벗어났다 돌아오면 뜨는 토스트 — 실제 화면 것을 그대로 쓴다.

        데모는 기록을 서버로 보내지 않지만 **토스트는 보여준다.** 시연에서 설명해야 하는
        것이 "다른 창을 열면 남는다"는 사실 자체이고, 그것을 말로만 하면 안 믿는다.
        다른 탭으로 갔다 돌아오면 그 자리에서 뜬다.
      */}
      {awayToast && <AwayToast seconds={awayToast.data.seconds} leaving={awayToast.leaving} />}
    </div>
  )
}

/**
 * 초 단위로 다시 그리게 만드는 것 말고는 하는 일이 없다.
 *
 * 실제 화면은 `useSessionTimer`를 쓰는데 그것은 60분에 세션을 **끊는다.** 시연에서는
 * 끊으면 안 되므로 상한 없는 시계를 따로 둔다 — 상한을 무력화하려고 빈 콜백을
 * 넘기는 것보다 이쪽이 읽기 쉽다.
 */
function useTicker(running: boolean) {
  const startedAt = useRef(Date.now())
  const [elapsedMs, setElapsedMs] = useState(0)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setElapsedMs(Date.now() - startedAt.current), 1000)
    return () => clearInterval(id)
  }, [running])

  return elapsedMs
}
