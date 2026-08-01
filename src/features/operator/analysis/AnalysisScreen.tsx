import ConsoleShell from '@/shells/ConsoleShell'
import PlaceholderScreen from '@/app/PlaceholderScreen'

/** OP-02 분석 — 화면 이식 전 자리표시. 실제 화면이 들어오면 이 파일 내용만 바뀐다. */
export default function AnalysisScreen() {
  return (
    <ConsoleShell role="operator">
      <PlaceholderScreen code="OP-02" title="분석" />
    </ConsoleShell>
  )
}
