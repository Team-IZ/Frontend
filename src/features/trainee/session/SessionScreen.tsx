import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/Empty'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/Resizable'
import { Spinner } from '@/components/ui/Spinner'
import { isApiError } from '@/api/_contract'
import { formatClock } from '@/lib/format'
import {
  useCurrentSession,
  useNoSessionReason,
  useMarkSessionEnded,
  useOpenHint,
  useSessionActivity,
  useSessionProblem,
  useStart,
  useSubmitAnswer,
} from './_/api/api'
import type { ProblemView, SessionInfo } from './_/api/types'
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
import type { EndReason, SessionPhase, TransitionReason } from './types'

/*
  TR-03 검증 세션 — 전체화면 · 네비 없음 · 나가는 경로 없음(정의서 §2). ConsoleShell을
  두르지 않는다 — 화면이 다르게 생긴 것 자체가 "지금 작업 중" 신호다(체크리스트 H4).

  뒤로가기 트래핑(popstate 하이재킹)은 만들지 않는다 — 나가는 UI가 이미 없고, 화면이
  다르게 생긴 것만으로 신호는 충분하다. 필요해지면 그때 추가한다(YAGNI).
*/
export default function SessionScreen() {
  /*
    **실서버 세션이 먼저다.** 시작 전 안내(`READY`)와 진행 중 복귀(`IN_PROGRESS`)를
    이 조회 하나가 가른다 — 새로고침 복원도 여기서 끝난다(별도 복구 API가 없다).

    🔴 **이 조회는 읽기만 하지 않는다.** 상한을 넘긴 세션·문제를 그 자리에서 닫는다
    (스펙 명시·실측 확인). 진입만 해도 상태가 바뀔 수 있다.
  */
  const session = useCurrentSession()

  // `204`의 사유는 홈 대표 상태가 갖고 있다
  const noSessionReason = useNoSessionReason()

  // 세션이 없으면 사유를 홈에서 읽어야 하므로 그 조회까지 기다린다
  if (session.isPending || (session.noSession && noSessionReason.isPending)) {
    return <FullScreenSpinner />
  }

  if (session.noSession) {
    return <NoSessionScreen status={noSessionReason.status} />
  }

  if (session.isError || !session.data) {
    return (
      <div className="flex h-svh items-center justify-center">
        <Empty className="max-w-[460px] border-solid border-danger-border bg-danger-soft">
          <EmptyHeader>
            <EmptyTitle>세션을 불러오지 못했습니다</EmptyTitle>
            <EmptyDescription>잠시 후 다시 시도해 주세요.</EmptyDescription>
          </EmptyHeader>
          <Button variant="ghost" onClick={() => session.refetch()}>
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
      <SessionRunner session={session.data} reloadSession={session.reload} />
    </div>
  )
}

/*
  **서버가 「그 자리는 이미 지났다」고 말하는 코드들.**

  화면이 틀린 게 아니라 시간이 지난 것이라, 오류로 그리지 않고 **커서를 다시 물어본다.**
  `PROBLEM_TIME_LIMIT_EXCEEDED`·`SESSION_TIMEOUT`은 스펙이 답변 제출에서 올 수 있다고
  적어 둔 것이고, `PROBLEM_ALREADY_CLOSED`는 낡은 번호로 조회했을 때 실측으로 받았다.
*/
const STALE_CURSOR = ['PROBLEM_ALREADY_CLOSED', 'PROBLEM_TIME_LIMIT_EXCEEDED', 'SESSION_TIMEOUT']
const isStale = (e: unknown) => isApiError(e) && STALE_CURSOR.includes(e.code)
const isProblemClosed = (e: unknown) => isApiError(e) && e.code === 'PROBLEM_ALREADY_CLOSED'

/**
 * 답변이 접수되지 않았을 때 학생에게 할 말.
 *
 * **다시 보내면 되는가**를 기준으로 가른다. 채점이 실패한 것(`GRADING_FAILED`)은
 * 아무것도 저장되지 않아 같은 답을 그대로 다시 보내면 되고(스펙 명시), 연결이 끊긴
 * 것도 마찬가지다. 빈 답은 화면이 먼저 막으므로 여기까지 오지 않는다.
 */
function answerFailure(e: unknown): string {
  if (isApiError(e) && e.code === 'ANSWER_ALREADY_SUBMITTED') {
    return '이미 접수된 답변이에요. 화면을 새로고침하면 이어서 볼 수 있어요.'
  }
  return '답변을 보내지 못했어요. 쓰신 내용은 그대로 있으니 다시 제출해 주세요.'
}

/*
  ## 상태를 화면이 만들지 않는다

  예전에는 리듀서가 문제 목록·커서·답변 이력·도달 단계를 전부 들고 있었다. 그건 목이
  한 번에 다 내려주던 시절의 구조이고, **서버가 커서를 갖는 지금은 두 벌이 된다.**

  화면에 남은 상태는 셋뿐이다.

  ```
  phase          지금 어느 국면인가 (안내 · 문제 · 전환 · 종료)
  problemNo      지금 보는 문제 번호 — 서버가 준 값을 그대로 들고 있는다
  pendingAnswer  방금 보낸 답변 — 채점이 끝나 다시 읽힐 때까지의 자리
  ```

  나머지(질문·이미 낸 답·연 힌트·남은 힌트·마지막 턴인지)는 전부 `GET /problems/{no}`가
  준다. 답변이 성공하면 그 조회가 무효화돼 다시 읽히므로, **화면은 응답으로 상태를
  조립하지 않고 다시 물어본다.**
*/
function SessionRunner({
  session,
  reloadSession,
}: {
  session: SessionInfo
  /** 커서를 서버에게 다시 물어본다. 세션이 끝났으면 `null` */
  reloadSession: () => Promise<SessionInfo | null>
}) {
  const { sessionId, mode, problemTotal } = session

  const [phase, setPhase] = useState<SessionPhase>(
    session.status === 'IN_PROGRESS' ? 'IN_PROBLEM' : 'INTRO',
  )
  const [problemNo, setProblemNo] = useState<number | null>(session.currentProblemNo)
  const [transitionReason, setTransitionReason] = useState<TransitionReason | null>(null)
  const [endReason, setEndReason] = useState<EndReason | null>(null)
  const [pendingAnswer, setPendingAnswer] = useState<string | null>(null)
  const [submitFailed, setSubmitFailed] = useState<string | null>(null)
  const [callersExpanded, setCallersExpanded] = useState(true)
  const [offlineDismissed, setOfflineDismissed] = useState(false)

  const problem = useSessionProblem(sessionId, problemNo)
  const starter = useStart(sessionId)
  const answerer = useSubmitAnswer(sessionId)
  const hinter = useOpenHint(sessionId)

  const running = phase !== 'ENDED'
  const online = useOnlineStatus()

  /*
    관찰 신호 — **창을 떠났다 돌아온 시점에 한 번만** 보낸다. 이탈 중에 주기적으로
    보내면 한 번 나간 것이 열 번으로 기록되어 무효 응시 판정이 틀린다(스펙 경고).
  */
  const recordActivity = useSessionActivity(sessionId)
  const awayToast = useAwayToast(
    useCallback((seconds: number) => recordActivity({ awaySeconds: seconds }), [recordActivity]),
    running,
  )
  const [timeWarning, showTimeWarning] = useTimeWarningToast()

  const markEnded = useMarkSessionEnded()
  const endWith = useCallback(
    (reason: EndReason) => {
      setPhase('ENDED')
      setEndReason(reason)
      setPendingAnswer(null)
      // 홈이 낡은 카드를 그리지 않게 — 종료는 요청이 아니라 저절로 무효화되지 않는다
      markEnded()
    },
    [markEnded],
  )

  /*
    시계는 **서버 시각에서 잰다.** 화면이 스스로 시작 시각을 찍으면 새로고침할 때마다
    0분부터 다시 세고, 그러면 학생이 보는 남은 시간과 서버가 막는 시점이 갈린다.
  */
  const startedAtMs = session.startedAt ? Date.parse(session.startedAt) : Date.now()
  const elapsedMs = useSessionTimer(startedAtMs, () => endWith('TIMEOUT'), showTimeWarning, running)

  /*
    ⚠️ **문제당 남은 시간은 그리지 않는다.** 문제 상한은 20분인데 *그 문제가 언제
    시작됐는지*를 서버가 주지 않는다(`ProblemResponse`에 시각이 없다). 세션 시작에서
    재면 두 번째 문제부터 전부 틀리고 — 실제로 갓 시작한 문제에 `1:03 남음`이 떴다 —
    **틀린 카운트다운은 없는 것만 못하다.** 36차에 `problemTimeLimitAt`을 요청했다.

    대신 **세션 마감은 서버가 시각으로 준다**(`timeLimitAt`). 그건 정확하므로 그것을 쓴다.
  */
  const limitAtMs = session.timeLimitAt ? Date.parse(session.timeLimitAt) : null
  // `elapsedMs`가 1초마다 갱신되므로 이 값도 함께 다시 계산된다
  const sessionRemainingMs =
    limitAtMs == null ? null : Math.max(0, limitAtMs - (startedAtMs + elapsedMs))

  /*
    🔴 **커서를 서버에게 다시 묻는다.**

    문제당 20분이 지나면 서버가 그 문제를 접고 커서를 다음으로 옮긴다. 그때 화면이
    들고 있던 번호는 낡은 값이라 그 번호로 조회하면 `409 PROBLEM_ALREADY_CLOSED`다
    (실측). 화면이 시간을 재서 스스로 넘어가지 않고, **닫혔다는 말을 들으면 그때
    다시 묻는다** — 상한을 두 곳에서 세면 반드시 갈린다.
  */
  const followCursor = useCallback(async () => {
    const fresh = await reloadSession()
    if (!fresh || fresh.currentProblemNo == null) {
      endWith('COMPLETED')
      return
    }
    setProblemNo(fresh.currentProblemNo)
    setPhase('IN_PROBLEM')
  }, [reloadSession, endWith])

  /*
    문제가 바뀌면 실패 문구를 지운다. 앞 문제에서 답이 안 갔다는 안내가 새 문제 입력칸
    위에 그대로 남으면, 지금 낸 답이 실패한 것으로 읽힌다.
  */
  useEffect(() => setSubmitFailed(null), [problemNo])

  // 낡은 번호를 들고 있으면 조회가 409로 돌아온다 — 그 자리에서 따라간다
  useEffect(() => {
    if (phase !== 'IN_PROBLEM') return
    if (isProblemClosed(problem.error)) void followCursor()
  }, [phase, problem.error, followCursor])

  /*
    연결이 끊겼다 돌아온 시간도 같은 규칙이다 — **재연결 시점에 한 번만.** 끊긴 순간을
    ref에 찍어 두고 돌아왔을 때만 보낸다. 처음 마운트에서는 끊긴 적이 없으므로 안 보낸다.
  */
  const offlineSinceRef = useRef<number | null>(null)
  useEffect(() => {
    setOfflineDismissed(false)
    if (!online) {
      offlineSinceRef.current = Date.now()
      return
    }
    const since = offlineSinceRef.current
    offlineSinceRef.current = null
    if (since == null) return
    const seconds = Math.round((Date.now() - since) / 1000)
    if (seconds >= 1) recordActivity({ disconnectedSeconds: seconds })
  }, [online, recordActivity])

  const handleStart = useCallback(async () => {
    // 시작하면 서버가 커서를 세운다 — **어느 문제부터인지도 응답이 말해 준다**
    const started = await starter.start()
    setProblemNo(started?.currentProblemNo ?? 1)
    setPhase('IN_PROBLEM')
  }, [starter])

  /*
    답변 제출 — **다음 자리를 서버가 정한다.**

    `outcome` 다섯이 화면 넷으로 간다. 어디로 갈지를 화면이 세지 않는 것이 핵심이다:
    "힌트를 다 썼는데도 미달인가"를 여기서 판단하면 그 규칙이 서버와 두 곳에 생긴다.
  */
  const handleSubmit = useCallback(
    async (answer: string) => {
      setPendingAnswer(answer)
      setSubmitFailed(null)
      try {
        /*
          🔴 **실패를 삼키지 않는다.** 서버가 채점 도중 연결을 끊는 일이 실제로 있다
          (90초 뒤 `ERR_ABORTED` — 36차 R1). 그때 화면이 조용히 원래대로 돌아가면
          학생은 답이 접수된 줄 알고 기다린다. **안 갔다고 말하고 답은 남겨 둔다.**
        */
        const r = await answerer.submit(answer).catch(async (e: unknown) => {
          // 답하는 사이에 상한이 지났다 — 서버는 이미 커서를 옮겨 뒀다
          if (isStale(e)) await followCursor()
          else setSubmitFailed(answerFailure(e))
          return null
        })
        if (!r) return
        switch (r.outcome) {
          case 'RETRY_WITH_HINT':
          case 'NEXT_TURN':
            // 같은 문제에 머문다 — 다시 읽으면 열린 힌트나 다음 질문이 들어 있다
            await problem.refetch()
            break
          case 'NEXT_PROBLEM':
          case 'PROBLEM_CLOSED':
            // 다음 문제를 미리 읽어 둔다 — 전환 화면이 이름을 말할 수 있게
            setProblemNo(r.nextProblemNo)
            setTransitionReason(r.outcome === 'NEXT_PROBLEM' ? 'NEXT' : 'STOP')
            setPhase('TRANSITION')
            break
          case 'SESSION_ENDED':
            endWith('COMPLETED')
            break
        }
      } finally {
        setPendingAnswer(null)
      }
    },
    [answerer, problem, endWith, followCursor],
  )

  const handleFirstKeystroke = useCallback(
    (delayMs: number) => recordActivity({ firstKeystrokeDelayMs: delayMs }),
    [recordActivity],
  )

  /** 학생이 `다시 설명해 주세요`를 눌렀을 때 — 문구는 다시 읽어서 그린다 */
  const handleRequestHint = useCallback(async () => {
    const opened = await hinter.open()
    if (opened) await problem.refetch()
  }, [hinter, problem])

  if (phase === 'INTRO') {
    return (
      <IntroScreen
        mode={mode}
        problemTotal={problemTotal}
        onStart={handleStart}
        starting={starter.isPending}
      />
    )
  }

  if (phase === 'ENDED') {
    return (
      <div className="flex h-full flex-col">
        <TopBar
          mode={mode}
          problemNo={problemNo}
          problemTotal={problemTotal}
          elapsedMs={elapsedMs}
          ended
        />
        <div className="flex-1">
          <EndScreen mode={mode} reason={endReason ?? 'COMPLETED'} />
        </div>
      </div>
    )
  }

  if (phase === 'TRANSITION') {
    return (
      <div className="flex h-full flex-col">
        <TopBar
          mode={mode}
          problemNo={problemNo}
          problemTotal={problemTotal}
          elapsedMs={elapsedMs}
        />
        <div className="flex-1">
          <TransitionScreen
            reason={transitionReason ?? 'NEXT'}
            mode={mode}
            nextTitle={problem.data?.title ?? null}
            nextPath={problem.data?.code.path ?? null}
            isNextLast={problemNo != null && problemNo === problemTotal}
            onContinue={() => {
              setTransitionReason(null)
              setPhase('IN_PROBLEM')
              setCallersExpanded(true)
            }}
          />
        </div>
      </div>
    )
  }

  // IN_PROBLEM — 문제를 읽는 동안에도 상단은 그대로 둔다(자리가 튀지 않게)
  if (!problem.data) {
    return problem.isError ? (
      <ProblemLoadFailed onRetry={() => void problem.refetch()} />
    ) : (
      <FullScreenSpinner />
    )
  }

  return (
    <RunningView
      problem={problem.data}
      mode={mode}
      problemTotal={problemTotal}
      elapsedMs={elapsedMs}
      sessionRemainingMs={sessionRemainingMs}
      pendingAnswer={pendingAnswer}
      submitFailed={submitFailed}
      submitting={answerer.isPending}
      callersExpanded={callersExpanded}
      onToggleCallers={() => setCallersExpanded((v) => !v)}
      onSubmit={handleSubmit}
      onRequestHint={handleRequestHint}
      hintPending={hinter.isPending}
      onFirstKeystroke={handleFirstKeystroke}
      awayToast={awayToast}
      timeWarning={timeWarning}
      offline={!online && !offlineDismissed}
      onDismissOffline={() => setOfflineDismissed(true)}
    />
  )
}

function RunningView({
  problem,
  mode,
  problemTotal,
  elapsedMs,
  sessionRemainingMs,
  pendingAnswer,
  submitFailed,
  submitting,
  callersExpanded,
  onToggleCallers,
  onSubmit,
  onRequestHint,
  hintPending,
  onFirstKeystroke,
  awayToast,
  timeWarning,
  offline,
  onDismissOffline,
}: {
  problem: ProblemView
  mode: 'FIRST' | 'REVIEW'
  problemTotal: number
  elapsedMs: number
  sessionRemainingMs: number | null
  pendingAnswer: string | null
  /** 접수되지 않았을 때 할 말. 성공하면 `null` */
  submitFailed: string | null
  submitting: boolean
  callersExpanded: boolean
  onToggleCallers: () => void
  onSubmit: (answer: string) => void
  onRequestHint: () => void
  hintPending: boolean
  onFirstKeystroke: (delayMs: number) => void
  awayToast: { data: { seconds: number }; leaving: boolean } | null
  timeWarning: { leaving: boolean } | null
  offline: boolean
  onDismissOffline: () => void
}) {
  const current = problem.current
  const waiting = submitting

  return (
    <div className="relative flex h-full flex-col">
      <TopBar
        mode={mode}
        problemNo={problem.problemNo}
        problemTotal={problemTotal}
        title={problem.title}
        elapsedMs={elapsedMs}
        sessionRemainingMs={sessionRemainingMs}
      />
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
            title={problem.title}
            code={problem.code}
            highlight={current?.highlight ?? null}
            dimmed={waiting}
            callersExpanded={callersExpanded}
            onToggleCallers={onToggleCallers}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel minSize={320} className="flex flex-col">
          <QuestionThread
            mode={mode}
            turns={problem.turns}
            current={current}
            pendingAnswer={pendingAnswer}
            waiting={waiting}
          />
          {/*
            **대기 중에도 입력 영역을 남긴다.** 예전에는 질문이 없으면 통째로 사라졌는데,
            그러면 대화 패널 높이가 튀어 답을 낸 직후 화면이 무너지는 것처럼 보였다
            (실사용 피드백). 잠그기만 한다.
          */}
          {submitFailed && (
            <div className="mx-4 mb-2 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
              {submitFailed}
            </div>
          )}
          <ComposeBar
            draftKey={`tr03-draft-${mode}-${problem.problemNo}-${current?.sequenceNo ?? 0}`}
            /* 남은 힌트는 **서버가 센 값**이다 — 요청분·지급분 합산이라 화면이 세면 지급분이 빠진다 */
            hintsLeft={current?.hintsLeft ?? 0}
            isLastTurnOfSession={current?.lastTurnOfSession ?? false}
            submitting={submitting}
            waiting={waiting}
            onRequestHint={onRequestHint}
            hintPending={hintPending}
            onSubmit={onSubmit}
            onFirstKeystroke={onFirstKeystroke}
          />
        </ResizablePanel>
      </ResizablePanelGroup>

      {awayToast && <AwayToast seconds={awayToast.data.seconds} leaving={awayToast.leaving} />}
      {!awayToast && timeWarning && <TimeWarningToast leaving={timeWarning.leaving} />}
      {offline && <OfflineOverlay onDismiss={onDismissOffline} />}
    </div>
  )
}

function TopBar({
  mode,
  problemNo,
  problemTotal,
  title,
  elapsedMs,
  sessionRemainingMs,
  ended,
}: {
  mode: 'FIRST' | 'REVIEW'
  problemNo: number | null
  problemTotal: number
  title?: string
  elapsedMs: number
  /** 세션 마감까지 남은 시간. 서버가 준 `timeLimitAt` 기준이다 */
  sessionRemainingMs?: number | null
  ended?: boolean
}) {
  const index = (problemNo ?? 1) - 1
  const minutes = Math.floor(elapsedMs / 60_000)

  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-fg">
          {title ? `${title} · ` : ''}
          {index + 1} / {problemTotal}
        </span>
        <span className="flex gap-1">
          {Array.from({ length: problemTotal }, (_, i) => (
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
        {mode === 'REVIEW' && (
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
        {ended ? (
          `${minutes}분 걸렸어요`
        ) : (
          <>
            {sessionRemainingMs != null && (
              <span className={sessionRemainingMs < 5 * 60_000 ? 'text-warning' : undefined}>
                <b className="font-bold">{formatClock(sessionRemainingMs)}</b> 남음
              </span>
            )}
            <span className="text-xs">{minutes}분 경과</span>
          </>
        )}
      </span>
    </div>
  )
}

function FullScreenSpinner() {
  return (
    <div className="flex h-svh items-center justify-center">
      <Spinner className="size-6" aria-label="세션을 불러오는 중" />
    </div>
  )
}

function ProblemLoadFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex h-svh items-center justify-center p-6">
      <Empty className="max-w-[460px] border-solid border-danger-border bg-danger-soft">
        <EmptyHeader>
          <EmptyTitle>문제를 불러오지 못했어요</EmptyTitle>
          <EmptyDescription>
            답변은 저장돼 있어요. 다시 시도하면 이어서 볼 수 있습니다.
          </EmptyDescription>
        </EmptyHeader>
        <Button variant="ghost" onClick={onRetry}>
          다시 시도
        </Button>
      </Empty>
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
