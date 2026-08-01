import ConsoleShell from '@/shells/ConsoleShell'
import PlaceholderScreen from '@/app/PlaceholderScreen'

/** SA-03 플랫폼 설정 — 화면 이식 전 자리표시. 실제 화면이 들어오면 이 파일 내용만 바뀐다. */
export default function PlatformSettingsScreen() {
  return (
    <ConsoleShell role="superadmin">
      <PlaceholderScreen code="SA-03" title="플랫폼 설정" />
    </ConsoleShell>
  )
}
