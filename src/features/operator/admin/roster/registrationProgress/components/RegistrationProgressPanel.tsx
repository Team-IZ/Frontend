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

  **연결은 #224 범위 밖이다** — `AddRosterDialog.tsx`가 아직 이 컴포넌트를 안 부른다
  (이슈 "하지 않는 것": 계약이 안 정해진 상태에서 실제 submit 흐름에 못 붙인다).
  지금은 `RosterProgressPreview`(dev)에서만 실제로 그려진다.
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

  const percent = progress.total > 0 ? Math.round((progress.sent / progress.total) * 100) : 0

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Badge variant={REGISTRATION_BATCH_STATUS_BADGE_VARIANT[progress.status]}>
          {REGISTRATION_BATCH_STATUS_LABEL[progress.status]}
        </Badge>
        <span className="text-fg-subtle text-xs tabular-nums">
          {progress.sent.toLocaleString()} / {progress.total.toLocaleString()}명
        </span>
      </div>

      {/* WAITING은 아직 진행률이 없다 — 0%로 그리면 "시작했는데 하나도 안 됐다"로 읽힌다 */}
      <Progress value={progress.status === 'WAITING' ? null : percent} />

      {/* ⚠ estimated 필드(failed) — 스펙에 없으면 이 블록부터 지운다(mock-first-screens.md §5) */}
      {progress.failed > 0 && (
        <p className="text-warning text-xs">
          ⚠ 발송 실패 <b className="font-semibold">{progress.failed}명</b> — 재시도 대상으로
          표시됩니다
        </p>
      )}

      {progress.status === 'COMPLETED' && (
        <p className="text-success text-xs">
          ✓ 전체 {progress.total.toLocaleString()}명에게 초대 발송을 마쳤습니다
        </p>
      )}
    </div>
  )
}
