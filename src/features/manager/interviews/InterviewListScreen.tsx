import ConsoleShell from '@/shells/ConsoleShell'
import PlaceholderScreen from '@/app/PlaceholderScreen'

/** MG-03 면담 목록 — 화면 이식 전 자리표시. 실제 화면이 들어오면 이 파일 내용만 바뀐다. */
export default function InterviewListScreen() {
  return (
    <ConsoleShell role="manager">
      <PlaceholderScreen code="MG-03" title="면담 목록" />
    </ConsoleShell>
  )
}
