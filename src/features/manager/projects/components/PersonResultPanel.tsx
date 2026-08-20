import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { REACH_STYLE } from '@/components/common/reach'
import { useTraineeEvaluation } from '../_/api/api'
import {
  AXIS_LABEL,
  RESULT_STATUS_LABEL,
  type EvaluationStep,
  type ResultStatus,
  type TraineeEvaluation,
} from '../_/api/types'

/*
  MG-08 개인 결과 — A안(점수 비노출, 정의서 §6 "둘 다 그려서 렌더로 고른다").
  개념마다 도달 단계 카드 + 4단 사다리(코드이해→설계논리→대안비교→반례대응),
  멈춘 뒤는 칸만 남기고 채점 근거는 펼쳐야 보인다(대화 전문은 없다, 정의서 §3).

  판정 4범주 — 합격 · 합격(도움 1회) · 합격(도움 2회) · 불합격. 서버 스펙도 같은
  말을 한다: 「`passed`와 `helpCount`를 **따로** 읽어야 합니다」.

  ⚠ **사람을 고른 뒤에 부른다.** 목록 응답에 축별 단계가 없고, 스펙이 「사람 수 ×
  개념 수 × 4배라 목록만 보는 기본 진입에 함께 실을 값이 아니다」라고 명시했다.

  ⚠ **멈춘 단계는 배열에서 빠져 온다.** 목은 `steps`가 키 없는 객체였고 서버는
  배열인데, 뜻은 같다 — 없는 자리를 '미도달' 빈 칸으로 그린다. 0점·불합격과
  구분해야 한다.

  ⚠ **채점 근거(`note`)는 발행 전에 null이다.** 그때는 근거 줄 자체가 없다 —
  펼쳐도 빈 상자가 나오지 않게 `note`가 있는 단계만 센다.

  B안(축별 점수 병기)은 데이터에 이미 있다(`EvaluationStep.score`, 발행 전 null).
*/

export default function PersonResultPanel({
  projectId,
  userId,
}: {
  projectId: string
  userId: string
}) {
  const detail = useTraineeEvaluation(projectId, userId)

  if (!detail.data && !detail.isError) {
    /*
      오른쪽 칸만 채운다 — **왼쪽 목록은 그대로 있어야 한다.** 스피너를 쓰면 사람을
      바꿀 때마다 오른쪽이 통째로 사라졌다 생기고, 목록에서 방금 누른 사람이 어디였는지
      눈이 놓친다(마스터-디테일에서 디테일만 갈아 끼우는 것이 요점이다).
    */
    return (
      <div aria-hidden className="p-5">
        <Skeleton className="mb-3 h-4 w-32" />
        <Skeleton className="mb-2 h-3 w-56" />
        <Skeleton className="mb-2 h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    )
  }

  if (detail.isError || !detail.data) {
    return <p className="text-fg-subtle p-5 text-sm">결과를 불러오지 못했습니다.</p>
  }

  const d = detail.data
  const status = d.resultStatus as ResultStatus

  return (
    <div className="p-5">
      <div className="border-border mb-3 flex items-center gap-2 border-b pb-3">
        <h3 className="text-sm font-bold">{d.name}</h3>
        <span className="text-fg-subtle text-2xs">{d.className}</span>
        {status !== 'AVAILABLE' && <Badge variant="neutral">{RESULT_STATUS_LABEL[status]}</Badge>}
      </div>

      {/* 응시를 안 마쳤으면 도달 단계가 0이라 그리면 전부 불합격으로 보인다(스펙 🔴) */}
      {status !== 'AVAILABLE' ? (
        <p className="text-fg-subtle text-sm">
          {status === 'IN_PROGRESS'
            ? '아직 응시 중이라 결과가 없습니다.'
            : status === 'INCOMPLETE'
              ? '끝내지 못한 채 응시 창이 닫혔습니다.'
              : status === 'NOT_ATTENDED'
                ? '응시 창이 닫히도록 응시하지 않았습니다.'
                : '무효 확정된 수행이라 결과를 세지 않습니다.'}
        </p>
      ) : (
        <>
          {/*
            ⚠ **간격을 gap-4에서 키웠다**(사용자 지적). 축을 색 블록에서 텍스트로 내리면서
            개념 한 덩어리의 높이가 크게 줄었는데, 사이 간격은 그대로라 **셋이 다닥다닥
            붙어 보였다** — 블록이 클 때 넉넉하던 값이 작아진 뒤에는 부족해진다.
            구분선을 같이 둬서 어디서 개념이 갈리는지도 눈에 보이게 한다.
          */}
          <div className="divide-border flex flex-col divide-y">
            {d.concepts.map((c) => (
              <div key={c.conceptId} className="py-4 first:pt-0 last:pb-0">
                <ConceptBlock concept={c} />
              </div>
            ))}
          </div>

          <p className="border-border text-fg-subtle mt-6 border-t pt-4 text-xs leading-relaxed">
            <b className="text-fg-muted">도달 단계가 주 판정값이에요.</b> 축별 점수는 내부 값이라
            화면에 없습니다 — 매니저가 읽는 것은 <b className="text-fg-muted">어디까지 갔는지</b>와{' '}
            <b className="text-fg-muted">혼자 했는지</b>입니다.
            <br />
            주고받은 대화 전문은 열지 않아요.{' '}
            <b className="text-fg-muted">학생 리포트에는 전문이 있습니다.</b>
          </p>
        </>
      )}
    </div>
  )
}

function ConceptBlock({ concept }: { concept: TraineeEvaluation['concepts'][number] }) {
  const byStep = new Map(concept.steps.map((s) => [s.stepNo, s]))
  /* 발행 전에는 `note`가 null이라 펼칠 줄이 없다 */
  const evidence = concept.steps.filter((s) => s.note)

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
          {/*
            🔴 **색 면적이 신호를 죽이고 있었다.** 도달 배지가 64×45(2880px²)에 축 넷도
            같은 크기의 색 블록이라, 한 줄에 **색 다섯 덩어리**가 같은 무게로 경쟁했다 —
            그런데 이 화면은 바로 아래에서 *"도달 단계가 주 판정값이고 축별 점수는 내부
            값"* 이라고 말한다. **디자인이 그 문장을 배신하고 있었다.**

            같은 5색 스케일을 쓰는 MG-05 명부는 멀쩡한데(26×22 = 572px², 숫자만) 여기만
            투박했던 이유가 그것이다 — **채도 높은 색은 작을 때 신호가 되고 클 때 소음이
            된다.**

            그래서 **색은 도달 배지 하나만** 갖는다. 축은 「어디서 막혔나」만 답하면
            되므로 블록을 걷어내고 텍스트 + 기호로 내린다 — 색이 하나뿐이면 그것이
            주 판정값이라는 것이 형태로 읽힌다.

            ⚠ 「도달」 글자를 뺐다 — **모든 배지에 똑같이 붙어 정보량이 0인데** 배지를
            두 줄로 키우고 있었다. 그 뜻은 아래 안내 문구가 이미 말한다.
          */}
          <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span
              className={cn(
                'flex-none rounded-md px-2 py-0.5 text-sm font-bold tabular-nums',
                REACH_STYLE[reachLevel(concept.reachLevel)],
              )}
            >
              {concept.reachLevel}단
            </span>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              {[1, 2, 3, 4].map((no) => (
                <StepCell key={no} stepNo={no} step={byStep.get(no)} />
              ))}
            </div>
          </div>

          {evidence.length > 0 && (
            <details className="group/ev">
              <summary className="text-primary flex cursor-pointer list-none items-center gap-1 text-xs font-semibold marker:content-none">
                채점 근거 <span className="text-fg-subtle font-normal">{evidence.length}줄</span>
                <span className="group-open/ev:hidden">펼치기</span>
                <span className="hidden group-open/ev:inline">접기</span>
                <ChevronRight className="size-3 transition-transform group-open/ev:rotate-90" />
              </summary>
              <div className="border-border bg-surface-2 mt-1.5 flex flex-col gap-2 rounded-md border p-3">
                {evidence.map((step) => (
                  <p key={step.stepNo} className="text-xs">
                    <b className={cn('mr-1.5 font-bold', STEP_TEXT_CLASS[stepTone(step)])}>
                      {AXIS_LABEL[step.stepNo]} {stepStatusLabel(step)}
                    </b>
                    <span className="text-fg-muted">{step.note}</span>
                  </p>
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  )
}

/** 서버는 `number`로 준다 — 색 스케일은 0~4다 */
function reachLevel(v: number): 0 | 1 | 2 | 3 | 4 {
  return Math.min(4, Math.max(0, v)) as 0 | 1 | 2 | 3 | 4
}

/**
 * 판정 4범주 — 합격 · 합격(도움 1회) · 합격(도움 2회) · 불합격. 도움은 최대 2회까지
 * 받고 합격할 수 있지만, 2회 받고도 기준을 못 넘으면 불합격이다 — `passed`가 최종
 * 결과, `helpCount`는 그 안에서 몇 번 도왔는지다. 넷을 항상 다른 색으로 가른다 —
 * 전엔 "1회 도움"이 합격에도 불합격에도 똑같이 붙어 헷갈렸다(사용자 피드백).
 */
function stepTone(step: EvaluationStep): 'success' | 'info' | 'warning' | 'danger' {
  if (!step.passed) return 'danger'
  if (step.helpCount === 0) return 'success'
  if (step.helpCount === 1) return 'info'
  return 'warning'
}

function stepStatusLabel(step: EvaluationStep): string {
  if (!step.passed) return '불합격'
  if (step.helpCount === 0) return '합격'
  return `합격(도움 ${step.helpCount}회)`
}

const STEP_TEXT_CLASS: Record<'success' | 'info' | 'warning' | 'danger', string> = {
  success: 'text-success',
  info: 'text-info',
  warning: 'text-warning',
  danger: 'text-danger',
}

/**
 * 축 한 칸 — **색 블록이 아니라 텍스트다.**
 *
 * 도달 배지만 색을 갖게 하려고 내렸다(위 주석). 여기서 답할 질문은 *"어디서 막혔나"*
 * 하나라, **막힌 축만 눈에 띄면 된다** — 통과한 축은 옅게 두고 실패·도움만 색을 쓴다.
 *
 * ⚠ **색만으로 말하지 않는다.** 기호(`✓`·`✗`·`—`)를 같이 둬서 색을 못 가리는 사람도
 * 읽을 수 있게 한다. 도움 횟수는 색으로 접히므로 툴팁에 정확한 문구를 남긴다.
 */
function StepCell({ stepNo, step }: { stepNo: number; step: EvaluationStep | undefined }) {
  if (!step) {
    return (
      <span className="text-fg-subtle text-2xs" title={`${AXIS_LABEL[stepNo]} 미도달`}>
        <span aria-hidden>—</span> {AXIS_LABEL[stepNo]}
      </span>
    )
  }
  const tone = stepTone(step)
  return (
    <span
      className={cn(
        'text-2xs',
        tone === 'success' ? 'text-fg-subtle' : cn('font-semibold', STEP_TEXT_CLASS[tone]),
      )}
      title={`${AXIS_LABEL[stepNo]} ${stepStatusLabel(step)}`}
    >
      <span aria-hidden>{step.passed ? '✓' : '✗'}</span> {AXIS_LABEL[stepNo]}
      {/* 도움을 받은 것은 통과와 다른 사실이라 숫자를 남긴다 */}
      {step.passed && step.helpCount > 0 && (
        <span className="tabular-nums"> ·{step.helpCount}</span>
      )}
    </span>
  )
}
