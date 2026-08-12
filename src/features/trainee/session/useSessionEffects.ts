import { useCallback, useEffect, useRef, useState } from 'react'

/*
  세션 화면의 브라우저 이벤트 3개 — 전부 목이 아니라 실제로 붙인다. 흉내내는 것보다
  진짜로 듣는 게 코드가 더 짧고, `visibilitychange`·`online`/`offline`은 어디서나 되는
  표준 API라 목으로 바꿔치기할 이유가 없다.
*/

const TOAST_FADE_MS = 300

/*
  일정 시간 떠 있다가 스스로 닫히는 토스트 — 즉시 언마운트하면 뚝 끊겨 보인다
  (실사용 피드백으로 발견). `leaving: true`가 뜨는 동안 소비자는 opacity를
  0으로 트랜지션하고, 그 트랜지션 시간(TOAST_FADE_MS)만큼 더 붙어 있다가
  실제로 사라진다. AwayToast·TimeWarningToast 둘 다 같은 생명주기라 여기 하나로 묶는다.
*/
function useDismissingToast<T>(holdMs: number) {
  const [state, setState] = useState<{ data: T; leaving: boolean } | null>(null)
  const show = useCallback((data: T) => setState({ data, leaving: false }), [])

  useEffect(() => {
    if (!state || state.leaving) return
    const id = setTimeout(() => setState((s) => (s ? { ...s, leaving: true } : s)), holdMs)
    return () => clearTimeout(id)
  }, [state, holdMs])

  useEffect(() => {
    if (!state?.leaving) return
    const id = setTimeout(() => setState(null), TOAST_FADE_MS)
    return () => clearTimeout(id)
  }, [state])

  return [state, show] as const
}

/**
 * 다른 창에 다녀온 시간을 잰다. 돌아왔을 때 1회만 토스트가 뜨고, 몇 초 뒤 스스로 닫힌다.
 * 막지 않는다 — 세션 정의서 §6 "창 이탈은 차단하지 않는다, 기록만 한다".
 */
export function useAwayToast(onAway: (seconds: number) => void, enabled: boolean) {
  const hiddenAtRef = useRef<number | null>(null)
  const [toast, show] = useDismissingToast<{ seconds: number }>(3500)

  useEffect(() => {
    if (!enabled) return
    const handleVisibility = () => {
      if (document.hidden) {
        hiddenAtRef.current = Date.now()
        return
      }
      if (hiddenAtRef.current == null) return
      const seconds = Math.round((Date.now() - hiddenAtRef.current) / 1000)
      hiddenAtRef.current = null
      if (seconds < 1) return
      onAway(seconds)
      show({ seconds })
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [enabled, onAway, show])

  return toast
}

/** 60분 경과 예고 토스트 — 트리거는 useSessionTimer의 onNearLimit이 한 번만 부른다 */
export function useTimeWarningToast() {
  const [toast, show] = useDismissingToast<true>(5000)
  return [toast, useCallback(() => show(true), [show])] as const
}

/** 네트워크 연결 여부 — 끊기면 화면이 오버레이로 알린다(답변은 로컬에 남아 있다) */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const setTrue = () => setOnline(true)
    const setFalse = () => setOnline(false)
    window.addEventListener('online', setTrue)
    window.addEventListener('offline', setFalse)
    return () => {
      window.removeEventListener('online', setTrue)
      window.removeEventListener('offline', setFalse)
    }
  }, [])
  return online
}

/** 세션 전체 상한 — 개념 3개 × 20분과 맞물린다(tr-03-session.md §2-4) */
const HARD_LIMIT_MS = 60 * 60_000
const WARN_THRESHOLD_MS = 50 * 60_000
/** 개념(문제) 하나에 주어지는 시간 */
export const CONCEPT_LIMIT_MS = 20 * 60_000

/**
 * 개념 하나에 남은 시간. 0에 닿으면 `onTimeout`을 **한 번만** 부른다 —
 * 그 개념은 거기서 닫히고 도달 단계가 그때까지 통과한 만큼으로 확정된다.
 *
 * `startedAt`이 바뀌면(다음 개념으로 넘어가면) 처음부터 다시 센다.
 */
export function useConceptTimer(startedAt: number, onTimeout: () => void, enabled: boolean) {
  const [remainingMs, setRemainingMs] = useState(() => CONCEPT_LIMIT_MS - (Date.now() - startedAt))
  const firedRef = useRef(false)
  const onTimeoutRef = useRef(onTimeout)
  onTimeoutRef.current = onTimeout

  useEffect(() => {
    if (!enabled) return
    firedRef.current = false
    const tick = () => {
      const next = CONCEPT_LIMIT_MS - (Date.now() - startedAt)
      setRemainingMs(next)
      if (next <= 0 && !firedRef.current) {
        firedRef.current = true
        onTimeoutRef.current()
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startedAt, enabled])

  return Math.max(0, remainingMs)
}

/*
  세션 시작부터 60분 하드 상한. 경과 시간은 안내만 하고 강제로 끊지 않다가, 60분에 딱
  한 번 종료시킨다. 50분을 넘기면 onNearLimit을 딱 한 번 더 불러 "곧 마무리된다"는
  조용한 예고를 준다 — 카운트다운 없이 진행하다가 아무 예고 없이 강제종료되는 것도
  나쁜 UX라, AwayToast와 같은 1회성 토스트 패턴으로 균형을 맞춘다.
*/
export function useSessionTimer(
  startedAt: number,
  onTimeout: () => void,
  onNearLimit: () => void,
  enabled: boolean,
) {
  const [elapsedMs, setElapsedMs] = useState(() => Date.now() - startedAt)
  const firedRef = useRef(false)
  const warnedRef = useRef(false)

  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => {
      const next = Date.now() - startedAt
      setElapsedMs(next)
      if (next >= WARN_THRESHOLD_MS && !warnedRef.current) {
        warnedRef.current = true
        onNearLimit()
      }
      if (next >= HARD_LIMIT_MS && !firedRef.current) {
        firedRef.current = true
        onTimeout()
      }
    }, 1000)
    return () => clearInterval(id)
  }, [startedAt, onTimeout, onNearLimit, enabled])

  return elapsedMs
}
