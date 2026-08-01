import ConsoleShell from '@/shells/ConsoleShell'
import PlaceholderScreen from '@/app/PlaceholderScreen'

/** MG-08 프로젝트 상세 — 화면 이식 전 자리표시. 실제 화면이 들어오면 이 파일 내용만 바뀐다. */
export default function ProjectDetailScreen() {
  return (
    <ConsoleShell role="manager">
      <PlaceholderScreen code="MG-08" title="프로젝트 상세" />
    </ConsoleShell>
  )
}
