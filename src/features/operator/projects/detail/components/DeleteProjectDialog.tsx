import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Alert, AlertTitle } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { deleteProject } from '../../api'
import { formatDue } from '../../rules'
import { withParticle } from '../../labels'
import type { ProjectDetail } from '../../types'

/*
  회차 삭제 확인 — **되돌릴 수 없으므로 무엇이 사라지는지 먼저 센다.**

  `정말 삭제하시겠습니까?` 만 묻는 확인창은 아무 정보도 주지 않는다. 오퍼레이터가 지금
  지우려는 것이 **비어 있는 회차인지, 개념 3건까지 잡아 둔 회차인지**를 이 자리에서
  보여줘야 실수를 되돌릴 수 있다(B5 — 되돌릴 수 없는 행동 앞에는 무엇을·얼마나).

  **이름을 다시 타이핑시키지 않는다.** 학생 데이터가 붙은 회차는 애초에 여기 못 오고
  (`canDelete`), 남는 것은 준비 중·준비됨뿐이라 잃는 것이 오퍼레이터 본인의 설정 작업이다.
  타이핑 확인은 그 비용에 비해 과하다 — 대신 **주 버튼을 위험 색**으로 두고 기본 포커스를
  취소에 남긴다.
*/
type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: ProjectDetail
  /** 삭제 성공 시 — 이 회차는 더 이상 없으므로 화면이 목록으로 나간다 */
  onDeleted: () => void
}

export default function DeleteProjectDialog({ open, onOpenChange, project, onDeleted }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (open) setFailed(false)
  }, [open])

  /** 사라지는 것 — 0인 항목은 쓰지 않는다. `요구사항 0건`은 잃는 것이 아니다 */
  const losing = [
    project.curricula.length > 0 && `교안 ${project.curricula.length}개 연결`,
    project.concepts.length > 0 && `검증 개념 ${project.concepts.length}건`,
    project.requirementTitles.length > 0 && `요구사항 ${project.requirementTitles.length}건`,
    project.endDate && `일정(마감 ${formatDue(project.endDate)})`,
  ].filter(Boolean) as string[]

  const linked = project.curricula

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85svh] flex-col sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{withParticle(project.name, '을', '를')} 삭제할까요?</DialogTitle>
        </DialogHeader>

        <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-1">
          {failed && (
            <Alert variant="danger">
              <AlertTitle>삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.</AlertTitle>
            </Alert>
          )}

          {losing.length > 0 ? (
            <div className="border-border rounded-md border p-3">
              <p className="text-fg-subtle mb-1.5 text-xs">함께 사라집니다</p>
              <ul className="flex flex-col gap-1 text-sm">
                {losing.map((x) => (
                  <li key={x}>· {x}</li>
                ))}
              </ul>
              {linked.length > 0 && (
                /*
                  **교안 자체는 안 지워진다.** 여러 회차가 같이 쓰는 자산이라 여기서
                  지우면 남의 회차가 깨진다 — 이 회차와의 **연결만** 끊긴다.
                */
                <p className="text-fg-subtle mt-2 text-2xs">
                  교안 파일은 지워지지 않습니다 — 이 회차와의 연결만 끊깁니다.
                </p>
              )}
            </div>
          ) : (
            <p className="border-border-strong text-fg-subtle rounded-md border border-dashed p-4 text-center text-xs">
              아직 아무것도 설정하지 않은 회차입니다
            </p>
          )}

          {/*
            **이름과 순번을 다시 못 쓴다**(9차 회신 §10). 삭제된 행도 그 이름·순번을
            점유해서, 같은 이름으로 다시 만들면 서버가 409로 막고 다음 회차 번호는
            지운 번호를 건너뛴다. **지우고 다시 만들면 된다고 생각하고 누르는 것**을
            막아야 하므로 여기서 미리 말한다.
          */}
          <p className="text-fg-muted text-xs">
            되돌릴 수 없습니다. <b className="font-semibold">같은 이름으로 다시 만들 수 없고</b>,
            다음 회차 번호는 이 회차의 번호를 건너뜁니다.
          </p>
        </div>

        <DialogFooter>
          {/* 기본 포커스를 취소에 남긴다 — Enter가 삭제로 가면 안 된다 */}
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            autoFocus
          >
            취소
          </Button>
          <Button
            className="bg-danger hover:bg-danger/90 text-white"
            disabled={submitting}
            onClick={async () => {
              setSubmitting(true)
              setFailed(false)
              try {
                await deleteProject(project.projectId)
                onDeleted()
              } catch {
                setFailed(true)
              } finally {
                setSubmitting(false)
              }
            }}
          >
            {submitting && <Spinner className="size-3.5" />}
            삭제
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
