import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { ROUND_OPTIONS, type RoundId, type RunSummary } from '../mockData'

/*
  회차 진행 한 줄 — 목업 `.runline`(#inbox). **KPI 카드 그리드가 아니다**(정의서
  §3 "회차 진행은 한 줄. KPI 카드 그리드를 만들지 않는다") — 그래서 `Card`가
  아니라 표 한 줄짜리 테두리 박스로 짠다.

  `run`이 `null`이면 진행 중인 프로젝트가 없는 것(#noproject) — 이 화면의
  mock은 항상 실제 값을 주지만(`mockData.ts` 판단 기록), 타입은 두 갈래를
  받아 컴포넌트가 실제로 두 상태를 다 처리하게 해 둔다.

  ⚠ 프로젝트 select를 이 줄 맨 앞(원래 `run.roundLabel` 자리)에 얹었다(사용자
  지시, 2026-08-08) — 처음엔 별도 툴바 줄로 얹었는데, "한 줄로 합쳐서 '미프
  3차' 자리를 대신하라"는 지적을 받고 합쳤다. 빈 상태(`!run`)에도 같은 select가
  떠야 다른 회차로 옮길 수 있어 두 분기 다 렌더한다.
*/
export default function RunLine({
  round,
  onRoundChange,
  run,
  nextRoundLabel,
}: {
  round: RoundId
  onRoundChange: (v: RoundId) => void
  run: RunSummary | null
  nextRoundLabel?: string
}) {
  const roundSelect = (
    <Select
      value={round}
      onValueChange={(v) => onRoundChange((v ?? round) as RoundId)}
      items={ROUND_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
    >
      {/* `shrink-0` — 기본 select는 `w-fit`(내용만큼)이지만, 이 줄이
          `flex flex-wrap`이라 공간이 빠듯하면 다른 flex 자식들처럼 줄어들 수
          있다. 그러면 `SelectValue`의 `line-clamp-1`이 프로젝트 이름을 잘라
          보여준다(사용자 지적) — 줄어들지 못하게 고정하고, 좁아지면 이
          select 대신 오른쪽 다른 항목들이 줄바꿈되게 한다. */}
      <SelectTrigger className="h-8 shrink-0 text-sm font-bold" aria-label="프로젝트">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROUND_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  if (!run) {
    // "진행 중인 프로젝트가 없습니다" 문구는 여기 안 적는다 — 화면 아래 더 자세한
    // 빈 상태(DashboardScreen)가 같은 말을 이미 한다. 여기서 또 적으면 같은 문장이
    // 두 번 보인다(select가 실제로 다른 회차를 고를 수 있게 되며 새로 드러난 문제).
    return (
      <div className="border-border bg-surface mb-5 flex items-center gap-3 rounded-md border px-4 py-2.5 text-sm">
        {roundSelect}
        {nextRoundLabel && <span className="text-fg-subtle ml-auto text-xs">{nextRoundLabel}</span>}
      </div>
    )
  }

  return (
    <div className="border-border bg-surface mb-5 flex flex-wrap items-center gap-3 rounded-md border px-4 py-2.5 text-sm">
      {roundSelect}
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
