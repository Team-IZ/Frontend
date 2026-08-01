import ConsoleShell from '@/shells/ConsoleShell'
import PlaceholderScreen from '@/app/PlaceholderScreen'

/** MG-06 교육생 상세 — 명부에서만 진입 — 화면 이식 전 자리표시. 실제 화면이 들어오면 이 파일 내용만 바뀐다. */
export default function TraineeDetailScreen() {
  return (
    <ConsoleShell role="manager">
      <PlaceholderScreen code="MG-06" title="교육생 상세" />
    </ConsoleShell>
  )
}
