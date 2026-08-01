import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import type { RecordCard } from '../mockData'

/*
  면담·관찰 기록 카드 — 근거 시그널·내용·상태·효과가 한 덩어리(D43).
  kind는 면담/관찰 둘뿐이다 — 스코프 축소: 멘토링 유형 제외(이슈 #40).
  status는 면담에만 있다(관찰은 진행/완료 구분이 없어 버튼 자체가 안 뜬다).
*/
export function InterventionCard({
  record,
  onToggleStatus,
  onEditSave,
}: {
  record: RecordCard
  onToggleStatus: () => void
  onEditSave: (content: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(record.content)
  const isProgress = record.status === 'progress'

  function startEdit() {
    setDraft(record.content)
    setEditing(true)
  }

  function saveEdit() {
    if (draft.trim().length === 0) return
    onEditSave(draft.trim())
    setEditing(false)
  }

  return (
    <div
      className={cn(
        'mb-4 rounded-lg border border-border bg-surface p-5',
        isProgress && 'border-primary/30',
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base font-bold">{record.kind}</span>
          {record.status && (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                isProgress ? 'bg-info-soft text-info' : 'bg-success-soft text-success',
              )}
            >
              {isProgress ? '진행 중' : '완료'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {record.kind === '면담' && isProgress && (
            <>
              <span className="text-[11px] text-fg-subtle">효과는 완료 후 다음 회차에 판정</span>
              <Button variant="ghost" size="sm" onClick={onToggleStatus}>
                면담 완료
              </Button>
            </>
          )}
          {!isProgress && record.effect && (
            <span className="rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-semibold text-success">
              {record.effect}
            </span>
          )}
          <button
            type="button"
            onClick={startEdit}
            aria-label="기록 내용 수정"
            className="rounded-md p-1.5 text-fg-subtle hover:bg-surface-2 hover:text-fg"
          >
            <Pencil className="size-4" />
          </button>
        </div>
      </div>

      <p className="mb-2.5 text-xs text-fg-subtle">
        {record.startedAt}
        {record.endedAt ? ` ~ ${record.endedAt}` : record.status ? ' 시작' : ''} · 담당{' '}
        {record.author}
        {record.editedAt && (
          <span className="text-fg-subtle/70"> · (수정됨) {record.editedAt}</span>
        )}
      </p>
      {record.basisNote && (
        <p className="mb-3 rounded-md bg-surface-2 px-3 py-2 text-xs text-fg-muted">
          근거 시그널 · <b className="text-fg">{record.basisNote}</b>
        </p>
      )}

      {editing ? (
        <div className="flex flex-col gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="기록 내용 수정"
            className="min-h-24"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              취소
            </Button>
            <Button size="sm" disabled={draft.trim().length === 0} onClick={saveEdit}>
              저장
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-fg-muted">{record.content}</p>
      )}
    </div>
  )
}
