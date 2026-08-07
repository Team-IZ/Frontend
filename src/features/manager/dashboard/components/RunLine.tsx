import type { RunSummary } from '../mockData'

/*
  회차 진행 한 줄 — 목업 `.runline`(#inbox). **KPI 카드 그리드가 아니다**(정의서
  §3 "회차 진행은 한 줄. KPI 카드 그리드를 만들지 않는다") — 그래서 `Card`가
  아니라 표 한 줄짜리 테두리 박스로 짠다.

  `run`이 `null`이면 진행 중인 프로젝트가 없는 것(#noproject) — 이 화면의
  mock은 항상 실제 값을 주지만(`mockData.ts` 판단 기록), 타입은 두 갈래를
  받아 컴포넌트가 실제로 두 상태를 다 처리하게 해 둔다.
*/
export default function RunLine({
  run,
  nextRoundLabel,
}: {
  run: RunSummary | null
  nextRoundLabel?: string
}) {
  if (!run) {
    return (
      <div className="border-border bg-surface mb-5 flex items-center gap-3 rounded-md border px-4 py-2.5 text-sm">
        <span className="text-fg-muted">진행 중인 프로젝트가 없습니다</span>
        {nextRoundLabel && <span className="text-fg-subtle ml-auto text-xs">{nextRoundLabel}</span>}
      </div>
    )
  }

  return (
    <div className="border-border bg-surface mb-5 flex flex-wrap items-center gap-3 rounded-md border px-4 py-2.5 text-sm">
      <span className="font-bold">{run.roundLabel}</span>
      <span className="text-border-strong">|</span>
      <span className="text-fg-muted">
        제출 <b className="text-fg tabular-nums">{run.submitted}</b>/{run.submittedTotal}
      </span>
      <span className="text-border-strong">·</span>
      <span className="text-fg-muted">
        응시 <b className="text-fg tabular-nums">{run.attended}</b>/{run.attendedTotal}
      </span>
      <span className="text-border-strong">·</span>
      <span className="text-fg-muted">
        리포트 <b className="text-fg">{run.reportPublished ? '발행됨' : '발행 전'}</b>
      </span>
      <span className="text-fg-subtle ml-auto text-xs">
        {run.dueLabel} · 응시 창은 <b className="text-fg-muted">개인별 24시간</b>(분석 완료부터)
      </span>
    </div>
  )
}
