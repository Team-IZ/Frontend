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
import { saveConcepts } from '../../api'
import { CONCEPT_COUNT, toggleConcept } from '../../rules'
import ConceptPicker from '../../components/ConceptPicker'
import type { ConceptHistory, Curriculum, Project } from '../../types'

/*
  검증 개념 선택 — **지난 회차 이력이 붙는 자리**다.

  9-6의 후속(*"다음 프로젝트 검증 개념에 재투입"*)이 실제로 쓰이는 곳은 목록이 아니라
  여기다. 검증 개념은 그 회차 교안이 가르친 것에서만 나오므로(14번 4-3) 교안이 바뀌면
  후보 자체가 달라진다 — **조건이 자연히 충족되는 자리**라 *"불가능한 일을 권하는"*
  문제가 안 생긴다.

  ▸ **이력은 판단을 대신하지 않는다**(OP-04 §3).
      `집단 미달`  지난 회차에 반 절반 이상이 2단 이하였다
                  → *"피해야 한다"* 도 *"다시 물어야 한다"* 도 아니다
      `코드 매칭 0` 그 개념이 학생 코드에 없어 **묻지 못했다**
                  → 학생이 못한 것이 아니다. **개념을 바꿔야 한다는 다른 신호**다
      `평균 3.3단`  지난 회차에 썼고 결과가 이랬다

    교안을 보강했다면 다시 넣어 확인할 수 있고, 그대로면 같은 결과가 나온다. 어느
    쪽인지는 시스템이 모른다 — 9-6이 *"시스템은 표시까지만 한다"* 고 한 그대로다.

  ▸ **측정이 시작된 뒤 바꾸면 비교 축이 깨진다**(OP-04 §5) — 응시가 하나라도 있으면
    확인을 세운다.
*/
type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project
  curricula: Curriculum[]
  history: ConceptHistory[]
  onSaved: () => void
}

export default function PickConceptsDialog({
  open,
  onOpenChange,
  project,
  curricula,
  history,
  onSaved,
}: Props) {
  const [picked, setPicked] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [failed, setFailed] = useState(false)

  // 열 때마다 현재 확정값에서 시작한다 — 변경하러 열었는데 빈 상태면 처음부터 다시 골라야 한다
  useEffect(() => {
    if (open) {
      setPicked(project.concepts.map((c) => c.id))
      setFailed(false)
    }
  }, [open, project.concepts])

  const linked = curricula.filter((c) => project.curriculumIds.includes(c.id))
  /** 이미 응시가 있으면 변경이 비교 축을 깬다 — 지금은 확정된 회차인지로 근사한다 */
  const measured = project.status === 'RUNNING' || project.status === 'DONE'

  const toggle = (id: string) => setPicked((prev) => toggleConcept(prev, id))

  const submit = async () => {
    setSubmitting(true)
    setFailed(false)
    try {
      await saveConcepts(project.id, picked)
      onSaved()
      onOpenChange(false)
    } catch {
      // 선택을 유지한다 — 저장 실패로 고른 것이 날아가면 처음부터 다시 해야 한다(F5)
      setFailed(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85svh] flex-col sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            검증 개념 선택{' '}
            <span className="text-fg-subtle text-xs font-normal">
              · {CONCEPT_COUNT}건 고정 · {picked.length}건 선택됨
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-1">
          {failed && (
            <Alert variant="danger">
              <AlertTitle>저장하지 못했습니다. 잠시 후 다시 시도해 주세요.</AlertTitle>
            </Alert>
          )}

          {/*
            이미 측정이 시작된 회차 — 바꾸면 그 회차 이전 결과와 비교할 수 없다.
            막지는 않는다. 오퍼레이터가 알고 바꾸는 경우가 있다.
          */}
          {measured && (
            <Alert variant="warning">
              <AlertTitle>이미 응시가 시작된 회차입니다</AlertTitle>
            </Alert>
          )}

          <div className="border-border rounded-md border">
            <ConceptPicker curricula={linked} picked={picked} onToggle={toggle} history={history} />
          </div>
        </div>

        <DialogFooter className="items-center justify-between sm:justify-between">
          {/* 왜 저장할 수 없는지를 버튼 옆에 쓴다 — 흐린 버튼만 두면 이유를 모른다 */}
          <p className="text-fg-subtle text-xs">
            {picked.length === CONCEPT_COUNT
              ? `${CONCEPT_COUNT}건을 골랐습니다`
              : `${CONCEPT_COUNT}건을 골라야 저장할 수 있습니다 · 지금 ${picked.length}건`}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
              취소
            </Button>
            <Button disabled={picked.length !== CONCEPT_COUNT || submitting} onClick={submit}>
              {submitting && <Spinner className="size-3.5" />}
              저장
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
