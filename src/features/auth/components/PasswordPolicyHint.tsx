/**
 * SC-A02 §8 · 비밀번호 정책 힌트
 * 정책은 상시 노출하고(사전 노출 규칙), 제출 실패 시 미충족 기준만 danger로 표시 (case6)
 */
export default function PasswordPolicyHint({ unmet }: { unmet?: string[] }) {
  if (unmet && unmet.length > 0) {
    return (
      <p className="mt-1.5 text-[12px] text-danger">비밀번호 조건 미충족 · {unmet.join(', ')}</p>
    )
  }
  return <p className="mt-1.5 text-[12px] text-fg-subtle">8자 이상, 영문·숫자·특수문자 포함</p>
}
