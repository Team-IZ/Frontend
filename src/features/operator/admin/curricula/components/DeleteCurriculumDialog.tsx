import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { useDeleteCurriculum } from '@/api/curriculum/useCurriculumMutations'
import { errorCopy } from '@/lib/errorCopy'

/*
  교안 삭제 — **되돌릴 수 없다.**

  한때 삭제 경로가 아예 없어서 **한 번 올린 교안이 기관 목록에서 영원히 안 사라졌다** —
  잘못 올린 파일·시험 삼아 올린 파일이 그대로 쌓이고, 프로젝트를 만들 때 그 목록에서
  골라야 했다.

  **쓰는 프로젝트가 하나라도 있으면 서버가 막는다**(`409 CURRICULUM_MATERIAL_IN_USE` —
  판정 기준은 `usedProjectCount`라고 스펙에 명시돼 있다). 화면도 그 경우 버튼을 안
  그리지만, 목록을 띄워 둔 사이 누가 연결하면 여기로 온다 — 그때는 서버 문구가 이긴다.
*/
export default function DeleteCurriculumDialog({
  open,
  onOpenChange,
  materialId,
  title,
  onDeleted,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  materialId: string
  title: string
  onDeleted: () => void
}) {
  const [failed, setFailed] = useState<unknown>(null)
  const remove = useDeleteCurriculum()

  const run = async () => {
    setFailed(null)
    try {
      await remove.mutateAsync({ path: { materialId } })
      onOpenChange(false)
      onDeleted()
    } catch (e) {
      setFailed(e)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>
            교안을 지울까요?
            <span className="text-fg-subtle text-xs font-normal"> · {title}</span>
          </DialogTitle>
        </DialogHeader>

        {/* 원인을 추측하지 않는다 — 서버가 코드로 말하면 그 문구가 이긴다 */}
        {failed !== null &&
          (() => {
            const copy = errorCopy(failed, { subject: '교안', action: '삭제' })
            return (
              <Alert variant="danger">
                <AlertTitle>{copy.title}</AlertTitle>
                <AlertDescription>{copy.description}</AlertDescription>
              </Alert>
            )
          })()}

        {/* **무엇이 일어나는지 쓴다**(G4) — `정말 하시겠습니까?`는 판단 근거를 안 준다 */}
        <p className="text-fg-muted text-xs">
          목록에서 사라지고 프로젝트를 만들 때 더는 고를 수 없습니다. 올린 파일과 분석 결과도 같이
          지워집니다. <b className="text-danger font-semibold">되돌릴 수 없습니다.</b>
        </p>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={remove.isPending}>
            취소
          </Button>
          <Button variant="danger" disabled={remove.isPending} onClick={() => void run()}>
            {remove.isPending && <Spinner className="size-3.5" />}
            교안 삭제
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
