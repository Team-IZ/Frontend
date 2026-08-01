import ConsoleShell from '@/shells/ConsoleShell'
import PlaceholderScreen from '@/app/PlaceholderScreen'

/** TR-02 코드 제출 — 홈에서만 진입, 사이드바 항목 없음 — 화면 이식 전 자리표시. 실제 화면이 들어오면 이 파일 내용만 바뀐다. */
export default function SubmissionScreen() {
  return (
    <ConsoleShell role="trainee">
      <PlaceholderScreen code="TR-02" title="코드 제출" />
    </ConsoleShell>
  )
}
