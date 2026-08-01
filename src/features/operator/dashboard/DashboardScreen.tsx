import ConsoleShell from '@/shells/ConsoleShell'
import PlaceholderScreen from '@/app/PlaceholderScreen'

/** OP-01 대시보드 — 화면 이식 전 자리표시. 실제 화면이 들어오면 이 파일 내용만 바뀐다. */
export default function DashboardScreen() {
  return (
    <ConsoleShell role="operator">
      <PlaceholderScreen code="OP-01" title="대시보드" />
    </ConsoleShell>
  )
}
