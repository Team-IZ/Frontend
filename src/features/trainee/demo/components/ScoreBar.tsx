import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'
import { AXIS_NAME, PASS_SCORE, RUBRIC, SCORES, type AxisCode, type Score } from '../data/rubric.ts'

type Props = {
  axisCode: AxisCode
  hintsLeft: number
  onScore: (score: Score) => void
  onTimeOut: () => void
}

/*
  시연자가 채점 결과를 정하는 자리 — 실제 화면의 `ComposeBar`가 있던 곳이다.

  ## 왜 텍스트 입력이 아닌가

  실제로는 학생이 답을 쓰고 AI가 0~5점을 매긴다. AI가 죽었을 때 대신할 것은
  **타이핑이 아니라 그 점수**다. 시연자가 답변을 지어내 봐야 채점할 것이 없다.

  ## 왜 숫자만 두지 않는가

  「3점」이라고만 적힌 버튼을 누르면 시연자 자신도 무엇을 흉내 내는지 모른다. 그러면
  옆에서 보는 사람에게 "왜 여기서 힌트가 열리죠"를 설명할 수 없다. 그래서 버튼마다
  **그 축의 루브릭 문장**을 그대로 붙인다(`docs/plan/v2/14-verification-design.md` 부록).
  축이 바뀌면 여섯 문장이 통째로 바뀐다 — 같은 3점이라도 L1과 L3은 다른 것을 요구한다.

  ## 「시간 초과」

  실제로는 문제당 20분이 지나면 서버가 그 문제를 접는다. 시계로 재현하면 시연 도중
  예상 못 한 순간에 화면이 넘어가므로 **시연자가 원할 때** 누른다.
*/
export default function ScoreBar({ axisCode, hintsLeft, onScore, onTimeOut }: Props) {
  const rubric = RUBRIC[axisCode]

  return (
    <div className="flex flex-col gap-3 border-t border-border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs text-fg-subtle">
          지금 묻는 축 <span className="font-bold text-fg">{axisCode}</span>{' '}
          <span className="text-fg-muted">{AXIS_NAME[axisCode]}</span> · 채점 결과를 고르면 그대로
          진행됩니다
        </p>
        {hintsLeft > 0 ? (
          <span className="text-xs text-fg-subtle">설명 {hintsLeft}번 남음</span>
        ) : (
          <span className="text-xs font-medium text-warning">
            설명을 다 썼어요 · 여기서 또 미달이면 이 문제가 끝납니다
          </span>
        )}
      </div>

      {/*
        여섯 칸을 그리드로 둔다 — 문장 길이가 제각각이라 flex로 두면 칸이 들쭉날쭉하고,
        시연자가 누르려던 것 옆을 누른다. 좁은 화면에서는 두 줄로 접는다.
      */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {SCORES.map((score) => {
          const passes = score >= PASS_SCORE
          return (
            <button
              key={score}
              type="button"
              onClick={() => onScore(score)}
              className={cn(
                'flex flex-col gap-1 rounded-md border p-2.5 text-left transition-colors',
                'hover:bg-canvas focus-visible:bg-canvas',
                passes ? 'border-primary-border bg-primary-soft/40' : 'border-border bg-surface',
              )}
            >
              {/*
                **어느 점수에도 「이게 정답」 표를 달지 않는다.** 데모 세션은 시연자가
                만드는 것이라 맞는 점수라는 게 없고, 표가 붙으면 그 점수를 눌러야 하는
                것처럼 읽힌다.
              */}
              <span className={cn('text-sm font-bold', passes ? 'text-primary' : 'text-fg-muted')}>
                {score}점
              </span>
              <span className="text-[11px] leading-snug text-fg-subtle">{rubric[score]}</span>
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-fg-subtle">
          {PASS_SCORE}점 이상이면 다음 질문으로 · 미만이면 같은 질문을 다시 설명해 줍니다
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={onTimeOut}>
          시간 초과시키기
        </Button>
      </div>
    </div>
  )
}
