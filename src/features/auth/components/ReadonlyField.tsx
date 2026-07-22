/**
 * SC-A02 §8 · 읽기전용 필드
 * 이메일은 초대값 고정 — 초대 링크 클릭이 곧 이메일 소유 증명이므로 편집 불가 (D13)
 */
export default function ReadonlyField({
  label,
  hint,
  value,
}: {
  label: string
  hint?: string
  value: string
}) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-fg-muted">
        {label}
        {hint && <span className="ml-1 font-normal text-fg-subtle">· {hint}</span>}
      </label>
      <div className="mt-1.5 rounded-md border border-border bg-canvas px-3.5 py-2.5 text-sm text-fg-muted">
        {value}
      </div>
    </div>
  )
}
