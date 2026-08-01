import ConsoleShell from '@/shells/ConsoleShell'
import PlaceholderScreen from '@/app/PlaceholderScreen'

/** SA-01 기관 목록 — 화면 이식 전 자리표시. 실제 화면이 들어오면 이 파일 내용만 바뀐다. */
export default function OrgListScreen() {
  return (
    <ConsoleShell role="superadmin">
      <PlaceholderScreen code="SA-01" title="기관 목록" />
    </ConsoleShell>
  )
}
