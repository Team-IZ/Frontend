import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Badge } from '@/components/ui/Badge'
import { REACH_STYLE } from '@/components/common/reach'
import {
  AXIS_STEP_LABEL,
  AXIS_STEP_ORDER,
  type AxisStepId,
  type AxisStepResult,
  type PersonResult,
} from '../mockData'

/*
  MG-08 개인 결과 — A안(점수 비노출, 정의서 §6 "둘 다 그려서 렌더로 고른다").
  와이어 `#page-result-person`을 그대로 옮겼다: 개념마다 도달 단계 카드 +
  4단 사다리(코드이해→설계논리→대안비교→반례대응), 멈춘 뒤는 칸만 남기고
  채점 근거는 펼쳐야 보인다(대화 전문은 없다, 정의서 §3).

  ⚠ 사용자 피드백으로 라벨 수정(렌더 확인 후, 두 차례):
  · 1차 — 도움 0회 "혼자"→"도움 없이", 못 물은 단계 "안 물음"→"미도달".
  · 2차 — **판정 자체를 4범주로 명시**: 합격 · 합격(도움 1회) · 합격(도움
    2회) · 불합격. "도움 2회까지는 통과할 수 있지만, 2회 받고도 기준을
    못 넘으면 불합격"이라는 판정 로직(`AxisStepResult.passed`가 최종
    합격 여부, `help`는 그 과정에서 쓴 도움 횟수)을 라벨이 그대로 따라가게
    했다 — 전엔 "1회 도움"이 합격/불합격 어느 쪽에도 똑같이 붙어서(색만
    다르고 글자가 같음) 헷갈렸다. `stepStatusLabel()`이 이 4범주를 만든다.

  B안(축별 점수 병기)은 데이터에 이미 있다(`AxisStepResult.score`) — 확정되면
  각 스텝에 `<span>{step.score}</span>`만 더 그리면 된다. 지금은 A안만 그린다.

  ⚠ `REACH_STYLE`은 예전엔 여기 복제해 뒀었다(decision-log D14 "두 번은 기록,
  세 번째에 올린다" — trainees·projects 두 도메인만 쓰는 "두 번째 사용" 단계라
  안 올렸었다). heatmap(MG-02)이 세 번째로 필요해지면서 `@/components/common/
  reach`로 승격됐고, D14가 예고한 대로 이 복제본은 지우고 거기서 가져오는
  쪽으로 바꿨다.
*/

export default function PersonResultPanel({ result }: { result: PersonResult }) {
  return (
    <div className="p-5">
      <div className="border-border mb-3 border-b pb-3">
        <h3 className="text-sm font-bold">{result.person.name}</h3>
      </div>

      <div className="flex flex-col gap-4">
        {result.concepts.map((c) => (
          <ConceptBlock key={c.concept} concept={c} />
        ))}
      </div>

      <p className="text-fg-subtle mt-4 text-xs leading-relaxed">
        <b className="text-fg-muted">도달 단계가 주 판정값이에요.</b> 축별 점수는 내부 값이라 화면에
        없습니다 — 매니저가 읽는 것은 <b className="text-fg-muted">어디까지 갔는지</b>와{' '}
        <b className="text-fg-muted">혼자 했는지</b>입니다.
        <br />
        주고받은 대화 전문은 열지 않아요.{' '}
        <b className="text-fg-muted">학생 리포트에는 전문이 있습니다.</b>
      </p>
    </div>
  )
}

function ConceptBlock({ concept }: { concept: PersonResult['concepts'][number] }) {
  const evidenceCount = AXIS_STEP_ORDER.filter((id) => concept.steps[id]).length

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-sm font-bold">{concept.concept}</span>
        {concept.retryTarget && <Badge variant="warning">다시 보기 대상</Badge>}
      </div>

      {!concept.inCode ? (
        <p className="text-fg-subtle text-xs italic">
          코드에 이 개념이 없어 묻지 못했습니다 — 못한 것이 아닙니다.
        </p>
      ) : (
        <>
          <div className="mb-2 flex items-stretch gap-3">
            <div
              className={cn(
                'flex w-16 flex-none flex-col items-center justify-center rounded-md',
                REACH_STYLE[concept.reachLevel],
              )}
            >
              <span className="text-xl leading-none font-bold">{concept.reachLevel}단</span>
              <span className="text-2xs opacity-80">도달</span>
            </div>
            <div className="grid flex-1 grid-cols-4 gap-1.5">
              {AXIS_STEP_ORDER.map((id) => (
                <StepCell key={id} id={id} step={concept.steps[id]} />
              ))}
            </div>
          </div>

          {evidenceCount > 0 && (
            <details className="group/ev">
              <summary className="text-primary flex cursor-pointer list-none items-center gap-1 text-xs font-semibold marker:content-none">
                채점 근거 <span className="text-fg-subtle font-normal">{evidenceCount}줄</span>
                <span className="group-open/ev:hidden">펼치기</span>
                <span className="hidden group-open/ev:inline">접기</span>
                <ChevronRight className="size-3 transition-transform group-open/ev:rotate-90" />
              </summary>
              <div className="border-border bg-surface-2 mt-1.5 flex flex-col gap-2 rounded-md border p-3">
                {AXIS_STEP_ORDER.filter((id) => concept.steps[id]).map((id) => {
                  const step = concept.steps[id]!
                  return (
                    <p key={id} className="text-xs">
                      <b className={cn('mr-1.5 font-bold', STEP_TEXT_CLASS[stepTone(step)])}>
                        {AXIS_STEP_LABEL[id]} {stepStatusLabel(step)}
                      </b>
                      <span className="text-fg-muted">{step.note}</span>
                    </p>
                  )
                })}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  )
}

/**
 * 판정 4범주 — 합격 · 합격(도움 1회) · 합격(도움 2회) · 불합격. 도움은 최대 2회까지
 * 받고 합격할 수 있지만, 2회 받고도 기준을 못 넘으면 불합격이다(사용자 설명) —
 * `passed`가 최종 결과, `help`는 그 안에서 몇 번 도왔는지다. 넷을 항상 다른 색으로
 * 가른다 — 전엔 "1회 도움"이 합격에도 불합격에도 똑같이 붙어(색만 다르고 글자가
 * 같음) 헷갈렸다(사용자 피드백, 렌더 확인 후).
 */
function stepTone(step: AxisStepResult): 'success' | 'info' | 'warning' | 'danger' {
  if (!step.passed) return 'danger'
  if (step.help === 0) return 'success'
  if (step.help === 1) return 'info'
  return 'warning'
}

function stepStatusLabel(step: AxisStepResult): string {
  if (!step.passed) return '불합격'
  if (step.help === 0) return '합격'
  return `합격(도움 ${step.help}회)`
}

const STEP_TONE_CLASS: Record<'success' | 'info' | 'warning' | 'danger', string> = {
  success: 'border-success-border bg-success-soft text-success',
  info: 'border-info-border bg-info-soft text-info',
  warning: 'border-warning-border bg-warning-soft text-warning',
  danger: 'border-danger-border bg-danger-soft text-danger',
}

const STEP_TEXT_CLASS: Record<'success' | 'info' | 'warning' | 'danger', string> = {
  success: 'text-success',
  info: 'text-info',
  warning: 'text-warning',
  danger: 'text-danger',
}

function StepCell({ id, step }: { id: AxisStepId; step: AxisStepResult | undefined }) {
  if (!step) {
    return (
      <div className="border-border bg-surface-2 text-fg-subtle rounded-md border border-dashed px-2 py-1.5 text-center">
        <p className="text-2xs font-semibold">{AXIS_STEP_LABEL[id]}</p>
        <p className="text-2xs">미도달</p>
      </div>
    )
  }
  return (
    <div
      className={cn('rounded-md border px-2 py-1.5 text-center', STEP_TONE_CLASS[stepTone(step)])}
    >
      <p className="text-2xs font-semibold">{AXIS_STEP_LABEL[id]}</p>
      <p className="text-2xs">{stepStatusLabel(step)}</p>
    </div>
  )
}
