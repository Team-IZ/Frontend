import ConsoleShell from '@/shells/ConsoleShell'
import PlaceholderScreen from '@/app/PlaceholderScreen'

/** OP-05 리포트 — 화면 이식 전 자리표시. 실제 화면이 들어오면 이 파일 내용만 바뀐다. */
export default function ReportScreen() {
  return (
    <ConsoleShell role="operator">
      <PlaceholderScreen code="OP-05" title="리포트" />
    </ConsoleShell>
  )
}
