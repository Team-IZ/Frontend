/*
  ⑦ 귀속 신호 카드 — 기여 편차 AND 이해도 저조 AND 지속성, 3조건 동시 충족 시만
  표시한다(B5, ENG-03). 순수 서술형 — 신뢰도 경고는 ②로 이미 분리됐으므로 여기선
  사람 신호만 다룬다. 원시 숫자는 "참고용" 접기(disclosure)로만 노출한다.
*/
export function NarrativeSignal({
  project,
  team,
  focusAxisLabel,
  round,
  rawLines,
  rawFiles,
}: {
  project: string
  team: string
  focusAxisLabel: string
  round: number
  rawLines: string
  rawFiles: string
}) {
  return (
    <div className="rounded-lg border border-warning-border bg-warning-soft px-5 py-4">
      <p className="mb-2 flex items-center gap-2 text-sm font-bold text-warning">
        ⚠ 기여·이해도 불균형
        <span className="text-xs font-normal text-fg-subtle">
          {project} · {team} · 서술형
        </span>
      </p>
      <p className="text-sm leading-relaxed text-fg-muted">
        팀 내 기여량이 낮은 편이지만, <b>낮은 기여량이 곧 낮은 실력을 뜻하진 않습니다.</b> 이 신호는
        기여량 단독이 아니라 아래 세 조건이 <b>동시에</b> 충족될 때만 표시됩니다.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full border border-warning-border bg-surface px-2.5 py-0.5 text-[11px] font-semibold text-warning">
          기여 편차 (팀 하위)
        </span>
        <span className="rounded-full border border-warning-border bg-surface px-2.5 py-0.5 text-[11px] font-semibold text-warning">
          ＋ 이해도 저조 ({focusAxisLabel})
        </span>
        <span className="rounded-full border border-warning-border bg-surface px-2.5 py-0.5 text-[11px] font-semibold text-warning">
          ＋ 지속성 ({round}회차)
        </span>
      </div>
      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-fg-subtle underline">
          기여 원시 데이터 보기 (참고용)
        </summary>
        <div className="mt-2 rounded-md border border-border bg-surface p-3 text-xs text-fg-muted">
          <span className="font-semibold text-warning">참고용 · 판정값 아님(B5).</span> {rawLines} ·{' '}
          {rawFiles} <b>코드량은 설명 변수일 뿐, 품질·적극성의 지표가 아님.</b>
        </div>
      </details>
    </div>
  )
}
