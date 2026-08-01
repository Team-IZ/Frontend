import ConsoleShell from '@/shells/ConsoleShell'
import PlaceholderScreen from '@/app/PlaceholderScreen'

/** MG-02 히트맵 — 화면 이식 전 자리표시. 실제 화면이 들어오면 이 파일 내용만 바뀐다. */
export default function HeatmapScreen() {
  return (
    <ConsoleShell role="manager">
      <PlaceholderScreen code="MG-02" title="히트맵" />
    </ConsoleShell>
  )
}
