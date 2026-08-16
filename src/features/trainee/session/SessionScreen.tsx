import { useCallback, useEffect, useReducer, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/Empty'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/Resizable'
import { Spinner } from '@/components/ui/Spinner'
import { formatClock } from '@/lib/format'
import { useAsync } from '@/lib/useAsync'
import { useCurrentSession, useNoSessionReason } from './_/api/api'
import { getSession, requestHint, submitAnswer } from './api'
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
  useConceptTimer,
  useOnlineStatus,
  useSessionTimer,
  useTimeWarningToast,
} from './useSessionEffects'
import { MAX_HINTS, hintsUsed, type SessionMode, type SessionState } from './types'

/*
  TR-03 검증 세션 — 전체화면 · 네비 없음 · 나가는 경로 없음(정의서 §2). ConsoleShell을
  두르지 않는다 — 화면이 다르게 생긴 것 자체가 "지금 작업 중" 신호다(체크리스트 H4).

  뒤로가기 트래핑(popstate 하이재킹)은 만들지 않는다 — 나가는 UI가 이미 없고, 화면이
  다르게 생긴 것만으로 신호는 충분하다. 필요해지면 그때 추가한다(YAGNI).
*/
export default function SessionScreen() {
  const [searchParams] = useSearchParams()
  const previewKey = searchParams.get('state') ?? undefined

  /*
    **실서버 세션이 먼저다.** 시작 전 안내(`READY`)와 진행 중 복귀(`IN_PROGRESS`)를
    이 조회 하나가 가른다 — 새로고침 복원도 여기서 끝난다(별도 복구 API가 없다).

    🔴 **이 조회는 읽기만 하지 않는다.** 상한을 넘긴 세션·문제를 그 자리에서 닫는다
    (스펙 명시·실측 확인). 진입만 해도 상태가 바뀔 수 있다.
  */
  const session = useCurrentSession()

  // `204`의 사유는 홈 대표 상태가 갖고 있다 — 목에는 없던 의존이다
  const noSessionReason = useNoSessionReason()

  const mode: SessionMode = session.data?.mode ?? 'FIRST'

  /*
    아직 목으로 도는 구간(문제·답변·힌트)이 남아 있다. `POST /start` 이후를 붙이면서
    이 목을 지운다 — 그때까지 실서버 값으로 그리는 것은 시작 전 안내까지다.
    훅은 조건부로 부를 수 없어 세션 판정보다 위에 둔다.
  */
  const load = useCallback(() => getSession(mode, previewKey), [mode, previewKey])
  const page = useAsync(load)

  // 세션이 없으면 사유를 홈에서 읽어야 하므로 그 조회까지 기다린다
  if (session.isPending || (session.noSession && noSessionReason.isPending)) {
    return (
      <div className="flex h-svh items-center justify-center">
        <Spinner className="size-6" aria-label="세션을 불러오는 중" />
      </div>
    )
  }

  if (session.noSession) {
    return <NoSessionScreen status={noSessionReason.status} />
  }

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
      <SessionRunner initial={page.data} problemTotal={session.data?.problemTotal ?? null} />
    </div>
  )
}

function SessionRunner({
  initial,
  problemTotal,
}: {
  initial: SessionState
  /** 서버가 준 실제 출제 수. 목이 쓰던 `3` 고정을 대신한다 */
  problemTotal: number | null
}) {
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
  // 개념마다 20분. 다 쓰면 그 개념이 닫히고 도달 단계가 확정된다
  const conceptRemainingMs = useConceptTimer(
    state.conceptStartedAt,
    () => dispatch({ type: 'CONCEPT_TIMEOUT' }),
    running && state.phase !== 'TRANSITION',
  )

  // 제출 후 "다음 질문 준비 중" 대기를 흉내낸다 — 실제로는 AI 응답 지연이다
  useEffect(() => {
    if (state.phase !== 'WAITING_NEXT') return
    const id = setTimeout(() => dispatch({ type: 'RECEIVE_NEXT_QUESTION' }), 1100)
    return () => clearTimeout(id)
  }, [state.phase])

  useEffect(() => {
    setOfflineDismissed(false)
  }, [online])

  if (state.phase === 'INTRO') {
    return (
      <IntroScreen
        mode={state.mode}
        problemTotal={problemTotal}
        onStart={() => dispatch({ type: 'START' })}
      />
    )
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

  const concept = state.concepts[state.conceptIndex]

  if (state.phase === 'TRANSITION') {
    const nextIndex =
      state.transitionReason === 'NEXT' ? state.conceptIndex + 1 : state.conceptIndex
    return (
      <div className="flex h-full flex-col">
        <TopBar state={state} elapsedMs={elapsedMs} displayConceptIndex={nextIndex} />
        <div className="flex-1">
          <TransitionScreen
            reason={state.transitionReason!}
            mode={state.mode}
            nextProblem={state.concepts[nextIndex]}
            isNextLast={nextIndex === state.concepts.length - 1}
            onContinue={() =>
              dispatch(
                state.transitionReason === 'STOP'
                  ? { type: 'CONTINUE_AFTER_STOP' }
                  : { type: 'START_NEXT_CONCEPT', now: Date.now() },
              )
            }
          />
        </div>
      </div>
    )
  }

  // IN_PROBLEM · WAITING_NEXT
  const questionIndex = state.answered.length
  const currentQuestion = state.phase === 'IN_PROBLEM' ? concept.questions[questionIndex] : null
  const highlightRef =
    currentQuestion?.ref ??
    state.answered[state.answered.length - 1]?.ref ??
    concept.questions[0].ref
  const isLastQuestion = questionIndex === concept.questions.length - 1
  const isLastOfSession =
    state.phase === 'IN_PROBLEM' &&
    state.conceptIndex === state.concepts.length - 1 &&
    isLastQuestion

  const handleSubmit = async (answer: string) => {
    if (!currentQuestion) return
    setSubmitting(true)
    const result = await submitAnswer({
      question: currentQuestion,
      current: state.current,
      isLastQuestion,
      answer,
    })
    setSubmitting(false)
    dispatch({ type: 'APPLY_SUBMIT_RESULT', answer, ...result })
  }

  /** 버튼으로 받는 힌트 — 지급분과 같은 주머니를 쓴다(합산 2개) */
  const handleRequestHint = async () => {
    if (!currentQuestion) return
    const hint = await requestHint({ question: currentQuestion, current: state.current })
    if (hint) dispatch({ type: 'SHOW_HINT', hint })
  }

  return (
    <div className="relative flex h-full flex-col">
      <TopBar state={state} elapsedMs={elapsedMs} conceptRemainingMs={conceptRemainingMs} />
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
            problem={concept}
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
            answered={state.answered}
            currentQuestion={currentQuestion}
            current={state.current}
            waiting={state.phase === 'WAITING_NEXT'}
          />
          {/*
            **대기 중에도 입력 영역을 남긴다.** 예전에는 `currentQuestion &&`으로 감싸서
            채점 중에 통째로 사라졌는데, 그러면 대화 패널 높이가 튀어 답을 낸 직후
            화면이 무너지는 것처럼 보였다(실사용 피드백). 잠그기만 한다.
          */}
          <ComposeBar
            draftKey={`tr03-draft-${state.mode}-${state.conceptIndex}-${questionIndex}`}
            mode={state.mode}
            hintsLeft={MAX_HINTS - hintsUsed(state.current)}
            isLastTurnOfSession={isLastOfSession}
            submitting={submitting}
            waiting={state.phase === 'WAITING_NEXT'}
            onRequestHint={handleRequestHint}
            onSubmit={handleSubmit}
          />
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
  conceptRemainingMs,
  displayConceptIndex,
}: {
  state: SessionState
  elapsedMs: number
  /** 전환 화면에서는 다음 개념 시간이 아직 안 시작해서 안 그린다 */
  conceptRemainingMs?: number
  displayConceptIndex?: number
}) {
  const index = displayConceptIndex ?? state.conceptIndex
  const total = state.concepts.length
  const minutes = Math.floor(elapsedMs / 60_000)

  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-fg">
          {state.concepts[index]?.name} · {index + 1} / {total}
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
        {state.mode === 'REVIEW' && (
          <span className="rounded-full bg-info-soft px-2 py-0.5 text-xs font-medium text-info">
            기록에만 남아요
          </span>
        )}
      </div>
      {/*
        **문제당 남은 시간이 실제로 판정에 쓰이는 값이라 앞에 둔다.** 세션 경과는 참고용이라
        뒤로 물러난다 — 학생이 지금 관리해야 하는 것은 이 문제에 남은 20분이다.
        3분 아래로 내려가면 경고색. 평소엔 차분하게(정의서 §2 "상시 경고 = 불안 누적").
      */}
      <span className="flex items-baseline gap-3 text-sm text-fg-subtle">
        {state.phase === 'ENDED' ? (
          `${minutes}분 걸렸어요`
        ) : (
          <>
            {conceptRemainingMs !== undefined && (
              <span className={conceptRemainingMs < 3 * 60_000 ? 'text-warning' : undefined}>
                이 문제 <b className="font-bold">{formatClock(conceptRemainingMs)}</b> 남음
              </span>
            )}
            <span className="text-xs">{minutes}분 경과</span>
          </>
        )}
      </span>
    </div>
  )
}

/*
  세션이 없다(`204`). **사유가 여섯 가지인데 본문이 없다** — 완료·방금 상한 초과·
  응시 창 닫힘·분석 전·분석 실패·팀 배정 끊김. 스펙이 *"204를 응시 완료로 읽지 말 것"*
  이라고 못박았고, 가르는 값은 홈의 대표 상태다.

  여기서 화면이 다시 판정하지 않는다 — 상태 하나를 문장으로 옮기기만 한다.
*/
function NoSessionScreen({ status }: { status: string | null }) {
  const { title, description } = noSessionMessage(status)
  return (
    <div className="flex h-svh items-center justify-center p-6">
      <Empty className="max-w-[460px] border-solid">
        <EmptyHeader>
          <EmptyTitle>{title}</EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
        </EmptyHeader>
        <Button variant="ghost" nativeButton={false} render={<Link to="/trainee/home" />}>
          홈으로
        </Button>
      </Empty>
    </div>
  )
}

function noSessionMessage(status: string | null) {
  switch (status) {
    case 'ASSESSMENT_COMPLETED':
      return {
        title: '이해도 확인을 마쳤어요',
        description: '리포트는 회차 마감 후 한꺼번에 발행됩니다.',
      }
    case 'ASSESSMENT_WINDOW_CLOSED':
      return {
        title: '응시 기한이 지났어요',
        description: '이번 회차는 미응시로 기록됩니다. 사정이 있었다면 매니저에게 알려 주세요.',
      }
    case 'ANALYZING':
      return {
        title: '아직 분석이 끝나지 않았어요',
        description: '분석이 끝나면 홈에서 시작할 수 있어요.',
      }
    case 'ANALYSIS_FAILED':
      return {
        title: '코드를 분석하지 못했어요',
        description: '제출 화면에서 이유를 확인하고 다시 제출해 주세요.',
      }
    case 'SUBMISSION_REQUIRED':
    case 'SUBMISSION_MISSED':
      return {
        title: '아직 코드를 제출하지 않았어요',
        description: '제출하고 분석이 끝나야 이해도 확인이 열려요.',
      }
    default:
      // 팀 배정이 끊긴 경우 등 — 지어내지 않고 홈으로 보낸다
      return { title: '지금 진행할 이해도 확인이 없어요', description: '홈에서 확인해 주세요.' }
  }
}
