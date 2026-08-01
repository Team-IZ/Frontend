import ConsoleShell from '@/shells/ConsoleShell'
import PlaceholderScreen from '@/app/PlaceholderScreen'

/** TR-04 내 리포트 — 화면 이식 전 자리표시. 실제 화면이 들어오면 이 파일 내용만 바뀐다. */
export default function MyReportScreen() {
  return (
    <ConsoleShell role="trainee">
      <PlaceholderScreen code="TR-04" title="내 리포트" />
    </ConsoleShell>
  )
}
