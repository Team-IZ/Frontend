import ConsoleShell from '@/shells/ConsoleShell'
import PlaceholderScreen from '@/app/PlaceholderScreen'

/** MG-05 교육생 명부 — 화면 이식 전 자리표시. 실제 화면이 들어오면 이 파일 내용만 바뀐다. */
export default function TraineeListScreen() {
  return (
    <ConsoleShell role="manager">
      <PlaceholderScreen code="MG-05" title="교육생 명부" />
    </ConsoleShell>
  )
}
