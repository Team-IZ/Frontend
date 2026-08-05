import { CheckIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { STEP_LABELS, type StepState } from '../labels'

/*
  4단계 진행 바 — 제출·분석·이해도 확인·리포트. 상태 9종 중 진행 중인 5종에서만 쓴다.

  이전 버전은 16px 원 안의 숫자/체크 하나로만 "지금 단계"를 표시해 4개가 한 줄에
  늘어서면 눈에 잘 안 띄었다(실사용 피드백으로 발견). 지금 단계는 원이 아니라
  세그먼트 전체를 진하게 채워 크기·색 모두로 확실히 튀게 하고, 지난 단계는 연한
  성공색 배지, 남은 단계는 테두리만 있는 pill로 세 상태가 한눈에 구분되게 한다.

  now는 검정(bg-fg) 채움이었다가 다시 손봤다 — CTA와 겹치는 문제는 피했지만, 무채색
  채움은 "비활성·닫힘"으로 읽혀 done(연초록)보다 오히려 무겁고 꺼져 보였다(실사용
  피드백으로 발견, 20년차 UX 재검토). 색이 아니라 **형태**로 CTA와 구분한다 — CTA는
  항상 꽉 찬 도형이니, now는 primary색을 다시 쓰되 꽉 채우지 않고 **링 + 연한 배경**
  으로 그린다. 채움 vs 테두리는 "버튼"과 "상태 표시"를 형태만으로도 가르는 흔한
  관용구라(GitHub PR 스테퍼 등) 같은 색이어도 헷갈리지 않는다.
*/
export default function StepTracker({ steps }: { steps: StepState[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {STEP_LABELS.map((label, i) => (
        <div key={label} className="flex shrink-0 items-center gap-1.5">
          {i > 0 && (
            <span aria-hidden="true" className="text-fg-subtle">
              →
            </span>
          )}
          <span
            className={cn(
              'flex items-center gap-1 whitespace-nowrap rounded-full',
              steps[i] === 'done' && 'bg-success-soft px-2.5 py-1 text-xs font-medium text-success',
              steps[i] === 'now' &&
                'border-1 border-primary bg-primary-soft px-2.5 py-1 text-sm font-bold text-primary',
              steps[i] === 'pending' && 'border border-border px-2.5 py-1 text-xs text-fg-subtle',
            )}
          >
            {steps[i] === 'done' && <CheckIcon className="size-3" />}
            {label}
          </span>
        </div>
      ))}
    </div>
  )
}
