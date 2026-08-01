import ConsoleShell from '@/shells/ConsoleShell'
import PlaceholderScreen from '@/app/PlaceholderScreen'

/** MG-09 교안 — 화면 이식 전 자리표시. 실제 화면이 들어오면 이 파일 내용만 바뀐다. */
export default function CurriculumScreen() {
  return (
    <ConsoleShell role="manager">
      <PlaceholderScreen code="MG-09" title="교안" />
    </ConsoleShell>
  )
}
