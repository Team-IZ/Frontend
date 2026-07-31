/** password-reset.html `.stepbar` — AU-03 두 단계(요청·설정) 진행 표시 */
export default function Stepbar({ active }: { active: 1 | 2 }) {
  return (
    <div className="mb-6 flex gap-2 text-[11px] text-fg-subtle">
      <span className={active === 1 ? 'font-semibold text-primary' : ''}>1 요청</span>
      <span>›</span>
      <span className={active === 2 ? 'font-semibold text-primary' : ''}>2 설정</span>
    </div>
  )
}
