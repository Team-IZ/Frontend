import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatDateTime } from '@/lib/format'
import type { ProjectOption, RunSummary } from '../_/api/types'

/*
  프로젝트 진행 한 줄 — 목업 `.runline`(#inbox). **KPI 카드 그리드가 아니다**
  (정의서 §3 "회차 진행은 한 줄. KPI 카드 그리드를 만들지 않는다") — 그래서
  `Card`가 아니라 표 한 줄짜리 테두리 박스로 짠다.

  ⚠ 프로젝트 select를 이 줄 맨 앞에 얹었다(사용자 지시, 2026-08-08) — 처음엔
  별도 툴바 줄로 얹었는데 "한 줄로 합쳐서 그 자리를 대신하라"는 지적을 받고
  합쳤다. 빈 상태(`!run`)에도 같은 select가 떠야 다른 프로젝트로 옮길 수 있어
  두 분기 다 렌더한다.

  ⚠ **응시의 분모가 제출 인원이 아니다.** 서버가 단계별 깔때기로 주고
  응시율 분모는 **분석 성공 인원**이다(스펙) — 목은 제출 인원으로 뒀는데
  PARTIAL이 빠져 값이 갈렸다. 어댑터가 서버 값을 그대로 옮긴다.
*/
export default function RunLine({
  projects,
  projectId,
  onProjectChange,
  run,
  pending,
}: {
  projects: ProjectOption[]
  projectId: string | null
  onProjectChange: (v: string) => void
  run: RunSummary | null
  /** 진행 줄만 아직 안 온 상태 — **select는 그대로 둔다**(아래 주석) */
  pending: boolean
}) {
  const items = projects.map((p) => ({ value: p.projectId, label: p.name }))
  const select = (
    <Select
      value={projectId ?? ''}
      onValueChange={(v) => v && onProjectChange(String(v))}
      items={items}
    >
      {/* `shrink-0` — 이 줄이 `flex-wrap`이라 공간이 빠듯하면 다른 flex 자식처럼
          줄어들고, 그러면 `SelectValue`의 `line-clamp-1`이 프로젝트 이름을 잘라
          보여준다(사용자 지적). 줄어들지 못하게 고정한다. */}
      <SelectTrigger className="h-8 shrink-0 text-sm font-bold" aria-label="프로젝트">
        <SelectValue />
      </SelectTrigger>
      {/*
        min-w-64 — 팝업 폭이 트리거 폭(`w-fit`, 지금 고른 프로젝트 이름 길이)에
        묶여 있어서, 짧은 이름이 선택된 채로 열면 더 긴 다른 프로젝트 이름이
        목록에서 잘렸다(사용자 지적, 실측 렌더 확인). 트리거는 여전히 고른 값에
        맞춰 딱 맞게 자라고(의도된 모양), 팝업만 최소 폭을 따로 보장한다.
      */}
      <SelectContent className="min-w-64">
        {items.map((o) => (
          <SelectItem key={o.value} value={o.value} title={o.label}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  /*
    🔴 **기다리는 동안에도 select를 남긴다.** 화면을 통째로 스켈레톤으로 떨어뜨리면
    **되돌아갈 컨트롤이 사라진다** — 고른 프로젝트가 느리거나 답이 없으면 새로고침
    말고 방법이 없어진다. 숫자 자리만 비운다.

    ⚠ 처음엔 `SlowNotice`(12초 안내)를 같이 뒀다. `PLANNED` 프로젝트에서 이 조회가
    18초 무응답이던 때의 대비인데, **그건 Lambda 호스트 쪽 현상**이었다 —
    지금은 `404 PROJECT_ROUND_NOT_CREATED`가 0.8초에 오고(38차 §6) 어댑터가 그것을
    「아직 회차가 없다」로 받는다. 1.7초짜리 조회에 12초 안내는 뜰 일이 없어 걷어냈다.
  */
  if (pending) {
    return (
      <div className="border-border bg-surface mb-5 flex flex-wrap items-center gap-3 rounded-md border px-4 py-2.5 text-sm">
        {select}
        <span className="text-border-strong">|</span>
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-24" />
      </div>
    )
  }

  if (!run) {
    /*
      "진행 중인 프로젝트가 없습니다" 문구는 여기 안 적는다 — 화면 아래 더
      자세한 빈 상태가 같은 말을 이미 한다. 여기서 또 적으면 같은 문장이 두 번
      보인다(select가 실제로 다른 프로젝트를 고를 수 있게 되며 드러난 문제).
    */
    return (
      <div className="border-border bg-surface mb-5 flex items-center gap-3 rounded-md border px-4 py-2.5 text-sm">
        {select}
      </div>
    )
  }

  return (
    <div className="border-border bg-surface mb-5 flex flex-wrap items-center gap-3 rounded-md border px-4 py-2.5 text-sm">
      {select}
      <span className="text-border-strong">|</span>
      <span className="text-fg-muted">
        {run.roundName}{' '}
        <span className="text-fg-subtle text-xs tabular-nums">
          {run.roundNo}/{run.totalRoundCount}
        </span>
      </span>
      <span className="text-border-strong">·</span>
      <span className="text-fg-muted">
        제출 <b className="text-fg tabular-nums">{run.submitted}</b>/{run.submittedTotal}
      </span>
      <span className="text-border-strong">·</span>
      {/* 분모는 분석 성공 인원이다 — 제출 인원과 다를 수 있어 나란히 보여준다 */}
      <span className="text-fg-muted">
        응시 <b className="text-fg tabular-nums">{run.attended}</b>/{run.attendedTotal}
      </span>
      <span className="text-border-strong">·</span>
      <span className="text-fg-muted">
        리포트 <b className="text-fg">{run.reportPublished ? '발행됨' : '발행 전'}</b>
      </span>
      {run.dueAt && (
        <span className="text-fg-subtle ml-auto text-xs">
          제출 마감 {formatDateTime(run.dueAt)}
        </span>
      )}
    </div>
  )
}
