import { useCallback, useEffect, useReducer, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/Empty'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/Resizable'
import { Spinner } from '@/components/ui/Spinner'
import { useAsync } from '@/lib/useAsync'
import { getSession, submitAnswer } from './api'
import { sessionReducer } from './sessionReducer'
import CodePane from './components/CodePane'
import ComposeBar from './components/ComposeBar'
import EndScreen from './components/EndScreen'
import IntroScreen from './components/IntroScreen'
import QuestionThread from './components/QuestionThread'
import TransitionScreen from './components/TransitionScreen'
import { AwayToast, OfflineOverlay, TimeWarningToast } from './components/AwayToast'
import {
  useAwayToast,
  useOnlineStatus,
  useSessionTimer,
  useTimeWarningToast,
} from './useSessionEffects'
import type { SessionMode, SessionState } from './types'

/*
  TR-03 검증 세션 — 전체화면 · 네비 없음 · 나가는 경로 없음(정의서 §2). ConsoleShell을
  두르지 않는다 — 화면이 다르게 생긴 것 자체가 "지금 작업 중" 신호다(체크리스트 H4).

  뒤로가기 트래핑(popstate 하이재킹)은 만들지 않는다 — 나가는 UI가 이미 없고, 화면이
  다르게 생긴 것만으로 신호는 충분하다. 필요해지면 그때 추가한다(YAGNI).
*/
export default function SessionScreen() {
  const [searchParams] = useSearchParams()
  const mode: SessionMode = searchParams.get('retry') === '1' ? 'RETRY' : 'FIRST'
  const previewKey = searchParams.get('state') ?? undefined

  const load = useCallback(() => getSession(mode, previewKey), [mode, previewKey])
  const page = useAsync(load)

  if (page.loading) {
    return (
      <div className="flex h-svh items-center justify-center">
        <Spinner className="size-6" aria-label="세션을 불러오는 중" />
      </div>
    )
  }

  if (page.failed || !page.data) {
    return (
      <div className="flex h-svh items-center justify-center">
        <Empty className="max-w-[460px] border-solid bg-danger-soft border-danger-border">
          <EmptyHeader>
            <EmptyTitle>세션을 불러오지 못했습니다</EmptyTitle>
            <EmptyDescription>잠시 후 다시 시도해 주세요.</EmptyDescription>
          </EmptyHeader>
          <Button variant="ghost" onClick={page.reload}>
            다시 시도
          </Button>
        </Empty>
      </div>
    )
  }

  // h-svh가 실제 뷰포트 기준이다 — #root(main.tsx)에 높이가 없어 자식들의 h-full이
  // 기댈 조상이 없으면 콘텐츠 높이로 무너진다(실측: 900px 뷰포트에서 body가 566px).
  // 이 화면 하나가 최초로 전체화면을 쓰는 화면이라 지금까지 드러나지 않았다.
  return (
    <div className="h-svh">
      <SessionRunner initial={page.data} />
    </div>
  )
}

function SessionRunner({ initial }: { initial: SessionState }) {
  const [state, dispatch] = useReducer(sessionReducer, initial)
  const [submitting, setSubmitting] = useState(false)
  const [offlineDismissed, setOfflineDismissed] = useState(false)

  const running = state.phase !== 'ENDED'
  const online = useOnlineStatus()
  const awayToast = useAwayToast(() => {}, running)
  const [timeWarning, showTimeWarning] = useTimeWarningToast()
  const elapsedMs = useSessionTimer(
    state.sessionStartedAt,
    () => dispatch({ type: 'TIMEOUT' }),
    showTimeWarning,
    running,
  )

  // 제출 후 "다음 질문 준비 중" 대기를 흉내낸다 — 실제로는 AI 응답 지연이다
  useEffect(() => {
    if (state.phase !== 'WAITING_NEXT') return
    const id = setTimeout(() => dispatch({ type: 'RECEIVE_NEXT_TURN' }), 1100)
    return () => clearTimeout(id)
  }, [state.phase])

  useEffect(() => {
    setOfflineDismissed(false)
  }, [online])

  if (state.phase === 'INTRO') {
    return <IntroScreen mode={state.mode} onStart={() => dispatch({ type: 'START' })} />
  }

  if (state.phase === 'ENDED') {
    return (
      <div className="flex h-full flex-col">
        <TopBar state={state} elapsedMs={elapsedMs} />
        <div className="flex-1">
          <EndScreen mode={state.mode} reason={state.endReason!} />
        </div>
      </div>
    )
  }

  const problem = state.problems[state.problemIndex]

  if (state.phase === 'TRANSITION') {
    const nextIndex =
      state.transitionReason === 'NEXT' ? state.problemIndex + 1 : state.problemIndex
    return (
      <div className="flex h-full flex-col">
        <TopBar state={state} elapsedMs={elapsedMs} displayProblemIndex={nextIndex} />
        <div className="flex-1">
          <TransitionScreen
            reason={state.transitionReason!}
            mode={state.mode}
            nextProblem={state.problems[nextIndex]}
            isNextLast={nextIndex === state.problems.length - 1}
            onContinue={() =>
              dispatch({
                type:
                  state.transitionReason === 'STOP' ? 'CONTINUE_AFTER_STOP' : 'START_NEXT_PROBLEM',
              })
            }
          />
        </div>
      </div>
    )
  }

  // IN_PROBLEM · WAITING_NEXT
  const turnIndex = state.answeredTurns.length
  const currentTurn = state.phase === 'IN_PROBLEM' ? problem.turns[turnIndex] : null
  const highlightRef =
    currentTurn?.ref ??
    state.answeredTurns[state.answeredTurns.length - 1]?.ref ??
    problem.turns[0].ref
  const isLastTurnOfSession =
    state.phase === 'IN_PROBLEM' &&
    state.problemIndex === state.problems.length - 1 &&
    turnIndex === problem.turns.length - 1

  const handleSubmit = async (answer: string) => {
    setSubmitting(true)
    const result = await submitAnswer(problem.turns[turnIndex], state.currentHintUsed)
    setSubmitting(false)
    dispatch({ type: 'APPLY_SUBMIT_RESULT', answer, outcome: result.outcome })
  }

  return (
    <div className="relative flex h-full flex-col">
      <TopBar state={state} elapsedMs={elapsedMs} />
      {/*
        목업은 코드 패널을 428px 고정폭으로 그렸다 — 실제로는 코드 길이가 문제마다
        다르니 고정하면 안 맞는 문제가 반드시 나온다. 기본값은 428px(목업 그대로)로
        시작하고, 사용자가 직접 끌어 조절한다. min 320은 코드 한 줄+줄번호가 잘리지
        않는 최소, max 700은 대화 패널이 답변칸 없이 눌리지 않는 상한이다.
      */}
      <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
        <ResizablePanel
          defaultSize={428}
          minSize={320}
          maxSize={700}
          className="border-r border-border"
        >
          <CodePane
            problem={problem}
            highlightRef={highlightRef}
            dimmed={state.phase === 'WAITING_NEXT'}
            callersExpanded={state.callersExpanded}
            onToggleCallers={() => dispatch({ type: 'TOGGLE_CALLERS' })}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel minSize={320} className="flex flex-col">
          <QuestionThread
            mode={state.mode}
            answeredTurns={state.answeredTurns}
            currentTurn={currentTurn}
            waiting={state.phase === 'WAITING_NEXT'}
            hintUsed={state.currentHintUsed}
          />
          {currentTurn && (
            <ComposeBar
              draftKey={`tr03-draft-${state.mode}-${state.problemIndex}-${turnIndex}`}
              mode={state.mode}
              hintUsed={state.currentHintUsed}
              isLastTurnOfSession={isLastTurnOfSession}
              submitting={submitting}
              onRequestHint={() => dispatch({ type: 'REQUEST_HINT' })}
              onSubmit={handleSubmit}
            />
          )}
        </ResizablePanel>
      </ResizablePanelGroup>

      {awayToast && <AwayToast seconds={awayToast.data.seconds} leaving={awayToast.leaving} />}
      {!awayToast && timeWarning && <TimeWarningToast leaving={timeWarning.leaving} />}
      {!online && !offlineDismissed && (
        <OfflineOverlay onDismiss={() => setOfflineDismissed(true)} />
      )}
    </div>
  )
}

function TopBar({
  state,
  elapsedMs,
  displayProblemIndex,
}: {
  state: SessionState
  elapsedMs: number
  displayProblemIndex?: number
}) {
  const index = displayProblemIndex ?? state.problemIndex
  const total = state.problems.length
  const minutes = Math.floor(elapsedMs / 60_000)

  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-fg">
          문제 {index + 1} / {total}
        </span>
        <span className="flex gap-1">
          {Array.from({ length: total }, (_, i) => (
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
        {state.mode === 'RETRY' && (
          <span className="rounded-full bg-info-soft px-2 py-0.5 text-xs font-medium text-info">
            기록에만 남아요
          </span>
        )}
      </div>
      <span className="text-sm text-fg-subtle">
        {state.phase === 'ENDED' ? (
          `${minutes}분 걸렸어요`
        ) : (
          <>
            <b className="text-fg">{minutes}분</b> 경과
          </>
        )}
      </span>
    </div>
  )
}
