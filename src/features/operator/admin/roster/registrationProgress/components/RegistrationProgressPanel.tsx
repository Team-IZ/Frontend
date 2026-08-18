import { Progress } from '@/components/ui/Progress'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import type { RegistrationProgress as RegistrationProgressData } from '../types'
import { REGISTRATION_BATCH_STATUS_LABEL, REGISTRATION_BATCH_STATUS_BADGE_VARIANT } from '../labels'

type Props = {
  progress: RegistrationProgressData | undefined
  loading: boolean
  failed: boolean
}

/*
  등록 진행 상태 한 조각. 카드로 감싸지 않는다 — 감싸는 자리(모달 안 Alert 자리 등)는
  부르는 쪽이 정한다(`docs/dev/mock-first-screens.md` §3 폴더 배치의 `components/`처럼
  "목록 · 상세가 같이 쓰는 조각"과 같은 위치).

  이슈 263으로 `AddRosterDialog.tsx`의 실제 submit 흐름에 붙었다 —
  `batchRequestId`가 있을 때(직접 입력 등록이 1명 이상 성공했을 때) `RosterTab.tsx`가
  이 컴포넌트를 그린다.
*/
export default function RegistrationProgressPanel({ progress, loading, failed }: Props) {
  // 첫 응답 전 — 아직 무엇을 그릴지 몰라 스켈레톤 대상이 아니다(async-states.md §1-2)
  if (!progress && loading) {
    return (
      <div className="text-fg-subtle flex items-center gap-2 text-xs">
        <Spinner className="size-3.5" />
        진행 상태를 확인하는 중
      </div>
    )
  }

  // 첫 응답 자체가 실패 — 재시도는 훅이 자동으로 계속한다, 사용자가 누를 것이 없다
  if (!progress && failed) {
    return (
      <p className="text-danger text-xs">진행 상태를 확인하지 못했습니다 — 계속 다시 시도합니다</p>
    )
  }

  if (!progress) return null

  // 발송을 마친 수 = 등록된 수 - 아직 대기 중인 수. 실패도 "처리는 끝난" 것이라 분모에 넣는다
  const processed = progress.registeredCount - progress.mailPendingCount
  const percent =
    progress.registeredCount > 0 ? Math.round((processed / progress.registeredCount) * 100) : 0

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Badge variant={REGISTRATION_BATCH_STATUS_BADGE_VARIANT[progress.status]}>
          {REGISTRATION_BATCH_STATUS_LABEL[progress.status]}
        </Badge>
        <span className="text-fg-subtle text-xs tabular-nums">
          {processed.toLocaleString()} / {progress.registeredCount.toLocaleString()}명
        </span>
      </div>

      <Progress value={percent} />

      {progress.mailFailedCount > 0 && (
        <p className="text-warning text-xs">
          ⚠ 발송 실패 <b className="font-semibold">{progress.mailFailedCount.toLocaleString()}명</b>{' '}
          — 명단 화면의 초대 재발송으로 복구할 수 있습니다
        </p>
      )}

      {progress.status === 'SUCCEEDED' && (
        <p className="text-success text-xs">
          ✓ 전체 {progress.registeredCount.toLocaleString()}명에게 초대 발송을 마쳤습니다
        </p>
      )}
    </div>
  )
}
