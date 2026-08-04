import { ROSTER_ISSUE_LABEL } from '../labels'
import type { RosterIssue } from '../api/types'

/*
  고쳐야 하는 행 — **행 번호로 알린다**(목업 `✗ 이메일 형식 오류 1명 — 3행을 고쳐 주세요`).

  이유별로 묶는다. `3행 · 17행 · 42행`처럼 번호만 늘어놓으면 무엇이 잘못됐는지 모르고,
  줄마다 한 문장씩 쓰면 오류 30건짜리 파일에서 모달이 스크롤로 가득 찬다.

  **이유마다 고칠 곳이 다르다** — 형식은 그 줄을, 도메인은 주소 자체를, 파일 안 중복은
  둘 중 하나를 지워야 한다(labels.ts).
*/
export default function RosterIssueList({ issues }: { issues: RosterIssue[] }) {
  if (issues.length === 0) return null

  const grouped = new Map<RosterIssue['reason'], number[]>()
  for (const issue of issues) {
    const lines = grouped.get(issue.reason)
    if (lines) lines.push(issue.line)
    else grouped.set(issue.reason, [issue.line])
  }

  return (
    <ul className="mt-1 space-y-0.5">
      {[...grouped].map(([reason, lines]) => (
        <li key={reason} className="text-danger text-xs">
          ✗ {ROSTER_ISSUE_LABEL[reason]} <b className="font-semibold">{lines.length}명</b> —{' '}
          {/* 줄이 많으면 앞 다섯만 쓴다. 전부 쓰면 모달이 번호로 가득 찬다 */}
          {lines.slice(0, 5).join('행 · ')}행{lines.length > 5 && ` 외 ${lines.length - 5}행`}을
          고쳐 주세요
        </li>
      ))}
    </ul>
  )
}
