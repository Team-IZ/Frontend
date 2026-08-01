import ConsoleShell from '@/shells/ConsoleShell'
import PlaceholderScreen from '@/app/PlaceholderScreen'

/** TR-01 홈 — 화면 이식 전 자리표시. 실제 화면이 들어오면 이 파일 내용만 바뀐다. */
export default function HomeScreen() {
  return (
    <ConsoleShell role="trainee">
      <PlaceholderScreen code="TR-01" title="홈" />
    </ConsoleShell>
  )
}
