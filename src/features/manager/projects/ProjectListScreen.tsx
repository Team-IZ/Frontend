import ConsoleShell from '@/shells/ConsoleShell'
import PlaceholderScreen from '@/app/PlaceholderScreen'

/** MG-07 프로젝트 목록 — 화면 이식 전 자리표시. 실제 화면이 들어오면 이 파일 내용만 바뀐다. */
export default function ProjectListScreen() {
  return (
    <ConsoleShell role="manager">
      <PlaceholderScreen code="MG-07" title="프로젝트 목록" />
    </ConsoleShell>
  )
}
