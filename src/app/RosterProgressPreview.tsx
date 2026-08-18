import { useState } from 'react'
import { Link } from 'react-router'
import ConsoleShell from '@/shells/ConsoleShell'
import PageHeader from '@/components/common/PageHeader'
import { Button } from '@/components/ui/Button'
import { useRegistrationProgress } from '@/features/operator/admin/roster/registrationProgress/useRegistrationProgress'
import RegistrationProgressPanel from '@/features/operator/admin/roster/registrationProgress/components/RegistrationProgressPanel'

/*
  dev 전용 — 이슈 224(등록 진행률 폴링 UI, mock-first)를 눈으로 확인하는 자리.
  `/operator/__async`와 같은 관례(`docs/dev/async-states.md` §5-1) — 실제 앱에는 이
  페이지로 오는 링크가 없다. 라우트에 직접 등록한다(`*.route.tsx` 글롭 대상이 아니다).

  **아직 `AddRosterDialog.tsx`에 안 붙어 있다**(이슈 "하지 않는 것" — 계약이 안
  정해졌다). 그래서 이 페이지가 지금 유일하게 `RegistrationProgressPanel` ·
  `useRegistrationProgress`를 실제로 그리는 자리다 — 완료 조건("모든 상태를 목
  데이터로 렌더")을 여기서 확인한다.

  시나리오 아이디에 심은 숫자가 목 총 인원이 된다(`registrationProgress/mockDb.ts`
  `seed` 참고) — 8명은 대기 → 완료가 한 번에, 450명은 배치 5회로 나뉘어 진행되는
  모습을 볼 수 있다.
*/

const SCENARIOS = [
  { id: 'demo-8', label: '8명 · 소규모(1배치)' },
  { id: 'demo-450', label: '450명 · 대규모(5배치)' },
]

/** 프리뷰 전용 폴링 간격 — 실제 간격은 `useRegistrationProgress` 기본값(추정치) 참고 */
const PREVIEW_INTERVAL_MS = 600

export default function RosterProgressPreview() {
  const [batchRequestId, setBatchRequestId] = useState(SCENARIOS[0].id)
  const [mounted, setMounted] = useState(true)

  return (
    <ConsoleShell role="operator" cohort="9기">
      <PageHeader
        breadcrumb="dev › 등록 진행률 폴링"
        title="이슈 224 · 등록 진행률 폴링 UI (mock-first)"
        breakdown={<span className="text-fg-subtle">진행 컴포넌트 · 폴링 훅 · 목 API 경계</span>}
        action={
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link to="/operator/admin/roster" />}
          >
            실제 화면으로 →
          </Button>
        }
      />

      <div className="border-border mb-6 flex flex-wrap items-center gap-1.5 border-b pb-4">
        {SCENARIOS.map((s) => (
          <Button
            key={s.id}
            size="sm"
            variant={s.id === batchRequestId ? 'primary' : 'ghost'}
            onClick={() => setBatchRequestId(s.id)}
          >
            {s.label}
          </Button>
        ))}
        <span className="bg-border mx-1 h-4 w-px" />
        <Button size="sm" variant="ghost" onClick={() => setMounted((m) => !m)}>
          {mounted ? '언마운트(폴링 정리 확인)' : '다시 마운트'}
        </Button>
      </div>

      <div className="border-border max-w-sm rounded-md border p-4">
        {mounted ? (
          <PollingDemo key={batchRequestId} batchRequestId={batchRequestId} />
        ) : (
          <p className="text-fg-subtle text-xs">
            언마운트됨 — 네트워크 탭(또는 콘솔)에서 요청이 더 안 나가는지 확인하세요.
          </p>
        )}
      </div>
    </ConsoleShell>
  )
}

function PollingDemo({ batchRequestId }: { batchRequestId: string }) {
  const { progress, loading, failed } = useRegistrationProgress({
    cohortId: 'demo-cohort',
    batchRequestId,
    intervalMs: PREVIEW_INTERVAL_MS,
  })
  return <RegistrationProgressPanel progress={progress} loading={loading} failed={failed} />
}
