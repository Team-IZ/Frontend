import { AXIS_LABELS, type TraineeDetail } from '../mockData'
import { SignalHero } from './SignalHero'
import { ConfidenceBadge } from './ConfidenceBadge'
import { FocusAxisChart } from './FocusAxisChart'
import { AxisTable } from './AxisTable'
import { NarrativeSignal } from './NarrativeSignal'

/*
  종합 탭 = 컴포넌트 스택 고정, 값만 적응(D107). 어느 학생이든 같은 순서:
  ①상태배지 → ②신뢰도경고 → ③포커스축그래프 → ④진행중면담 → ⑤세션참여팩트 →
  ⑥5축표 → ⑦귀속신호. 상태에 따라 달라지는 건 "보이는지"와 "안의 값"뿐이다.
*/
export function OverviewTab({
  trainee,
  onGoToInterventions,
}: {
  trainee: TraineeDetail
  onGoToInterventions: () => void
}) {
  const activeMeeting = trainee.records.find((r) => r.kind === '면담' && r.status === 'progress')
  const focusAxis = trainee.signal && trainee.focusAxis ? trainee.axes[trainee.focusAxis] : null

  return (
    <div>
      {/* ① 상태 배지 — 위험/에이스만. 일반은 렌더 자체 생략(빈 카드 아님) */}
      {trainee.signal && (
        <SignalHero
          variant={trainee.signal}
          headline={trainee.signalHeadline ?? ''}
          sub={trainee.signalSub ?? ''}
          onCreateIntervention={trainee.signal === 'risk' ? onGoToInterventions : undefined}
        />
      )}
      {!trainee.signal && (
        <p className="mb-4 rounded-md border border-border bg-surface-2 px-4 py-3 text-sm text-fg-subtle">
          특이 신호 없음 — 위험·강점 판정 모두 미해당(DASH-03 낮은 우선순위). 아래는 모든 학생에게
          공통으로 보이는 기본 정보입니다.
        </p>
      )}

      {/* ② 데이터 신뢰도 경고 — 문제 있을 때만 */}
      {trainee.confidenceWarning && <ConfidenceBadge message={trainee.confidenceWarning} />}

      {/* ③ 포커스 축 그래프 — ①이 있을 때만, ①과 짝 */}
      {trainee.signal && trainee.focusAxis && focusAxis && (
        <div className="mb-4">
          <FocusAxisChart axisKey={trainee.focusAxis} axis={focusAxis} variant={trainee.signal} />
        </div>
      )}

      {/* ④ 진행 중 면담 컨텍스트 — 면담이 존재하면 상태 무관 항상 */}
      {activeMeeting && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-info-border bg-info-soft px-4 py-2 text-sm text-fg-muted">
          <span className="size-2 shrink-0 rounded-full bg-info" aria-hidden="true" />
          <b>진행 중인 면담:</b> {activeMeeting.kind}({activeMeeting.startedAt} 시작) · 효과는 다음
          회차 판정
          <button
            type="button"
            onClick={onGoToInterventions}
            className="ml-auto font-semibold text-info hover:underline"
          >
            면담 탭에서 보기 →
          </button>
        </div>
      )}

      {/* ⑤ 세션 참여 팩트 — 모든 학생 항상 */}
      <p className="mb-4 text-sm text-fg-muted">
        📋 이번 회차({trainee.round}회차){' '}
        <b className="text-fg">{trainee.sessionFact.attended ? '응시 완료' : '미응시'}</b> · 마지막
        세션 {trainee.sessionFact.lastSessionAt}
        {trainee.sessionFact.attended && ` · 소요 ${trainee.sessionFact.durationMin}분`}
      </p>

      {/* ⑥ 5축 통합표 — 유일한 4축 정보원(자기수정 축 제외 스코프, 이슈 #40) */}
      <div className="mb-4">
        <AxisTable round={trainee.round} axes={trainee.axes} headNote={trainee.axisHeadNote} />
      </div>

      {/* ⑦ 귀속 신호 카드 — 3조건 동시 충족 시만 */}
      {trainee.attribution && trainee.focusAxis && (
        <NarrativeSignal
          project={trainee.attribution.project}
          team={trainee.attribution.team}
          focusAxisLabel={AXIS_LABELS[trainee.focusAxis]}
          round={trainee.round}
          rawLines={trainee.attribution.rawLines}
          rawFiles={trainee.attribution.rawFiles}
        />
      )}
    </div>
  )
}
