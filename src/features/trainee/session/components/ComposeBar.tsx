import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Textarea } from '@/components/ui/Textarea'

const SHORT_ANSWER_THRESHOLD = 15

type Props = {
  draftKey: string
  /** 남은 힌트 — **서버가 센 값**이다. 요청분·지급분 합산이라 화면이 세면 지급분이 빠진다 */
  hintsLeft: number
  isLastTurnOfSession: boolean
  submitting: boolean
  /** 채점·다음 질문 대기 중 — 입력은 잠그되 **영역은 그대로 둔다** */
  waiting: boolean
  onRequestHint: () => void
  /** 힌트를 여는 중 — **두 번 누르면 두 개가 소진된다**(되돌릴 수 없다) */
  hintPending: boolean
  onSubmit: (answer: string) => void
  /** 질문이 보인 뒤 첫 글자까지 걸린 시간(ms) — 관찰 신호로 남는다 */
  onFirstKeystroke?: (delayMs: number) => void
}

/*
  답변 입력 — 규칙(3~5문장·붙여넣기 막힘·힌트는 불이익 없음)은 인트로에서 한 번만
  말한다(IntroScreen.tsx). 여기서 매 턴마다 같은 문장을 반복하면 "인트로를 읽었는데
  또 나온다"가 되어 정보가 아니라 잡음이 된다(실사용 피드백). 이 화면에 남기는 것은
  **지금 이 순간에만 유효한, 매번 달라지는 값**뿐이다 — 글자 수, 짧은 답변 여부,
  남은 힌트 횟수, 힌트 소진 여부, 그리고 "이번이 마지막 턴"이라는 사실(인트로가
  알 수 없는 정보라 유일하게 반복 대상이 아니다).
*/
export default function ComposeBar({
  draftKey,
  hintsLeft,
  isLastTurnOfSession,
  submitting,
  waiting,
  onRequestHint,
  hintPending,
  onSubmit,
  onFirstKeystroke,
}: Props) {
  const [answer, setAnswer] = useState(() => localStorage.getItem(draftKey) ?? '')

  /*
    **질문이 보인 뒤 첫 글자까지 걸린 시간.** 질문이 바뀌면(=`draftKey`가 바뀌면) 다시
    잰다 — 서버는 슬롯당 첫 값만 남기므로 중복 전송이 안전하다(스펙).

    이어서 쓰는 경우(초안이 이미 있음)는 재지 않는다. 그 시간은 "질문을 보고 얼마나
    망설였나"가 아니라 "새로고침을 언제 했나"라 뜻이 다르다.
  */
  const shownAtRef = useRef(Date.now())
  const typedRef = useRef(false)

  useEffect(() => {
    const draft = localStorage.getItem(draftKey) ?? ''
    setAnswer(draft)
    shownAtRef.current = Date.now()
    typedRef.current = draft.length > 0
  }, [draftKey])

  const handleChange = (value: string) => {
    if (!typedRef.current && value.length > 0) {
      typedRef.current = true
      onFirstKeystroke?.(Date.now() - shownAtRef.current)
    }
    setAnswer(value)
    localStorage.setItem(draftKey, value)
  }

  const handleSubmit = () => {
    if (!answer.trim() || submitting) return
    localStorage.removeItem(draftKey)
    onSubmit(answer.trim())
  }

  const isShort = answer.length > 0 && answer.length < SHORT_ANSWER_THRESHOLD
  /*
    제출 중이거나 다음 질문을 기다리는 동안은 잠근다. **감추지는 않는다** — 입력
    영역이 통째로 사라지면 대화 패널 높이가 튀고, 답을 낸 직후 화면이 무너지는 것처럼
    보인다(실사용 피드백으로 발견). 자리를 지키고 상태만 바꾼다.
  */
  const busy = submitting || waiting

  return (
    <div className="flex flex-col gap-2 border-t border-border p-4">
      <Textarea
        value={answer}
        onChange={(e) => handleChange(e.target.value)}
        onPaste={(e) => e.preventDefault()}
        placeholder={waiting ? '' : '답을 입력해 주세요'}
        rows={3}
        disabled={busy}
      />
      <div className="flex items-center justify-between text-xs text-fg-subtle">
        <span>{answer.length}자</span>
        {isShort && !busy && (
          <span className="font-medium text-warning">조금 더 써 볼까요? 지금은 짧아요</span>
        )}
      </div>

      {/* 좁은 화면에서 한 글자씩 세로로 쌓이는 문제를 막는다(실측 확인됨) — 왼쪽/오른쪽
          묶음을 각각 flex-wrap으로 둬서, 안 맞으면 문장 단위로 다음 줄로 내려간다. */}
      <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-3">
        <div className="flex flex-wrap items-center gap-2">
          {/*
            **남은 횟수는 서버가 센다** — `mode`로 가르지 않는다. 다시 보기에 힌트를
            줄지는 서버 정책이고, 화면이 그것을 또 판단하면 두 곳이 갈린다.
          */}
          {hintsLeft > 0 ? (
            <>
              {/* Button은 shrink-0 + whitespace-nowrap이 기본값(공용 컴포넌트, 전역
                    변경 안 함) — 남은 횟수는 버튼 밖 형제 요소로 뺀다 */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onRequestHint}
                disabled={busy || hintPending}
              >
                {hintPending && <Spinner className="size-3.5" />}
                {hintPending ? '설명을 찾는 중' : '다시 설명해 주세요'}
              </Button>
              <span className="text-fg-subtle">{hintsLeft}번 남음</span>
            </>
          ) : (
            // ponytail: 힌트 소진은 인트로가 예고하지 못하는 상태 변화라 유일하게 남긴다
            <p className="text-xs text-fg-subtle">
              더 이상 설명해 드릴 수 없어요. 아는 만큼만 써 주세요.
            </p>
          )}
        </div>

        {isLastTurnOfSession && (
          <p className="text-xs font-medium text-fg">마지막 답변이에요 · 제출하면 끝납니다</p>
        )}

        <Button onClick={handleSubmit} disabled={!answer.trim() || busy}>
          {waiting ? '채점하는 중' : isLastTurnOfSession ? '답변 제출하고 마치기' : '답변 제출'}
        </Button>
      </div>
    </div>
  )
}
