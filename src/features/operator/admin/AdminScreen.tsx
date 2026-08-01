import ConsoleShell from '@/shells/ConsoleShell'
import PlaceholderScreen from '@/app/PlaceholderScreen'

/** OP-06 운영 관리 — 화면 이식 전 자리표시. 실제 화면이 들어오면 이 파일 내용만 바뀐다. */
export default function AdminScreen() {
  return (
    <ConsoleShell role="operator">
      <PlaceholderScreen code="OP-06" title="운영 관리" />
    </ConsoleShell>
  )
}
