import ConsoleShell from '@/shells/ConsoleShell'
import PlaceholderScreen from '@/app/PlaceholderScreen'

/** MG-04 면담 브리프 — 모드 — 사이드바 항목 없음 — 화면 이식 전 자리표시. 실제 화면이 들어오면 이 파일 내용만 바뀐다. */
export default function InterviewBriefScreen() {
  return (
    <ConsoleShell role="manager">
      <PlaceholderScreen code="MG-04" title="면담 브리프" />
    </ConsoleShell>
  )
}
