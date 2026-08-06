import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { resolveVoid, type InterviewCase, type RoundId } from '../mockData'

/*
  무효 응시 확인 모달(#void) — 정의서 §5 "자동 확정하지 않는다"(9-4). 시스템은
  **본 것**(무응답 문항 수·복사 여부·응답 시간)만 보여주고 판정은 사람이 한다 —
  결과를 지우는 일이라 오탐 비용이 크다.
*/

type Props = {
  roundId: RoundId
  caseItem: InterviewCase
  open: boolean
  onOpenChange: (open: boolean) => void
  onResolved: () => void
}

export default function VoidConfirmDialog({
  roundId,
  caseItem,
  open,
  onOpenChange,
  onResolved,
}: Props) {
  const [pending, setPending] = useState<'INVALIDATE' | 'KEEP' | null>(null)
  const ev = caseItem.voidEvidence

  async function resolve(action: 'INVALIDATE' | 'KEEP') {
    setPending(action)
    try {
      await resolveVoid(roundId, caseItem.id, action)
      onOpenChange(false)
      onResolved()
    } finally {
      setPending(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{caseItem.name} · 무효 응시로 처리할까요?</DialogTitle>
        </DialogHeader>

        <div className="text-fg-muted space-y-3 text-sm leading-relaxed">
          <p>
            <b className="text-fg">이 회차 결과가 지워집니다.</b>
            <br />
            도달 단계도 위험 판정도 남지 않고, 반 평균에서도 빠집니다.
          </p>

          {ev && (
            <div className="bg-surface-2 border-border rounded-md border p-3">
              <div className="text-fg-subtle mb-1 text-2xs font-bold">시스템이 본 것</div>
              <div className="text-xs">
                {ev.totalQuestions}문항 중{' '}
                <b className="text-fg font-bold">{ev.unanswered}문항 무응답</b>
                {ev.copied && (
                  <>
                    {' '}
                    · 나머지 1문항은 <b className="text-fg font-bold">질문 문장을 그대로 복사</b>
                  </>
                )}{' '}
                · 총 응답 시간 <b className="text-fg font-bold">{ev.durationMin}분</b>
              </div>
            </div>
          )}

          <div className="text-warning flex gap-1.5 text-xs leading-relaxed">
            <span>⚠</span>
            {/* 아이콘을 걸이표처럼 왼쪽에 붙이고, 줄바꿈된 두 줄은 아이콘 없이
                본문끼리 세로줄을 맞춘다(사용자 지적 — "그대로 두면"이 "무효로"와
                맞아야 한다) */}
            <span>
              무효로 처리하면 <b>1차로 재응시</b>하게 되고,
              <br />
              그대로 두면 이 결과가 남습니다.
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" disabled={pending !== null} onClick={() => resolve('KEEP')}>
            그대로 두기
          </Button>
          <Button
            variant="primary"
            disabled={pending !== null}
            onClick={() => resolve('INVALIDATE')}
          >
            무효로 처리하고 재응시 안내
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
