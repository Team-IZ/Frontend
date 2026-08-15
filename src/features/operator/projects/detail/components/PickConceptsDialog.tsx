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
import { useConfirmConcepts } from '@/api/projectExecution/useProjectExecutionMutations'
import { CONCEPT_COUNT, toggleConcept } from '../../rules'
import ConceptPicker from '../../components/ConceptPicker'
import type { ConceptCandidate, Curriculum, ProjectDetail } from '../../types'

/*
  검증 개념 선택.

  검증 개념은 그 회차 교안이 가르친 것에서만 나오므로(14번 4-3) 교안이 바뀌면 후보 자체가
  달라진다 — 후보 조회(`GET /projects/{id}/concept-candidates`)가 그 관계를 이미 담고
  있어서 화면이 교안과 후보를 맞춰 볼 필요가 없다.

  ▸ **측정이 시작된 뒤 바꾸면 비교 축이 깨진다**(OP-04 §5) — 응시가 하나라도 있으면
    확인을 세운다. 막지는 않는다. 오퍼레이터가 알고 바꾸는 경우가 있다.

  ─── 연동하며 빠진 것 ───────────────────────────────────────────
  **지난 회차 이력이 없어졌다.** 후보마다 `집단 미달`·`코드 매칭 0`·`평균 3.3단`을 붙여
  9-6의 *"다음 프로젝트 검증 개념에 재투입"* 판단을 돕던 값인데, 그것을 주는 엔드포인트가
  없다(types `ConceptHistory` 주석). **판단을 대신하는 값이 아니었으므로** 없다고 개념을
  못 고르지는 않는다 — 10차에 요청하고 그때 되살린다.
*/
type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: ProjectDetail
  /** 후보 전량. **화면이 조회해서 넘긴다** — 이 모달이 부르면 열 때마다 요청이 나간다 */
  candidates: ConceptCandidate[]
  loadingCandidates: boolean
  /** 후보를 교안별로 묶을 때 쓰는 이름표 */
  curricula: Curriculum[]
}

export default function PickConceptsDialog({
  open,
  onOpenChange,
  project,
  candidates,
  loadingCandidates,
  curricula,
}: Props) {
  const [picked, setPicked] = useState<string[]>([])
  const [failed, setFailed] = useState(false)
  const save = useConfirmConcepts()

  // 열 때마다 현재 확정값에서 시작한다 — 변경하러 열었는데 빈 상태면 처음부터 다시 골라야 한다
  useEffect(() => {
    if (open) {
      // 확정은 `mappingId`로 한다(`PUT /concepts`) — 선택 상태도 같은 키로 든다
      setPicked(project.concepts.map((c) => c.mappingId))
      setFailed(false)
    }
  }, [open, project.concepts])

  /** 이미 응시가 있으면 변경이 비교 축을 깬다 — 지금은 확정된 회차인지로 근사한다 */
  const measured = project.status === 'RUNNING' || project.status === 'DONE'

  const toggle = (id: string) => setPicked((prev) => toggleConcept(prev, id))

  const submit = async () => {
    setFailed(false)
    try {
      await save.mutateAsync({
        path: { projectId: project.projectId },
        body: { mappingIds: picked },
      })
      onOpenChange(false)
    } catch {
      // 선택을 유지한다 — 저장 실패로 고른 것이 날아가면 처음부터 다시 해야 한다(F5)
      setFailed(true)
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
              <AlertTitle>이미 응시가 시작된 프로젝트입니다</AlertTitle>
            </Alert>
          )}

          <div className="border-border rounded-md border">
            {loadingCandidates ? (
              <div className="flex justify-center py-10">
                <Spinner className="size-5" aria-label="후보를 불러오는 중" />
              </div>
            ) : candidates.length === 0 ? (
              /*
                후보가 0인 이유는 둘인데 **여기서 가르지 않는다.** 교안이 없으면 이 모달을
                열 수 없고(구성 탭이 버튼을 잠근다), 교안이 있는데 0이면 분석이 안 끝났거나
                실패한 것이다 — 그 확인은 교안 화면 소관이라 링크를 걸지 않는다(C4).
              */
              <p className="text-fg-subtle p-6 text-center text-xs">
                고를 수 있는 후보가 없습니다 — 연결한 교안의 분석 상태를 확인하세요
              </p>
            ) : (
              <ConceptPicker
                candidates={candidates}
                curricula={curricula}
                picked={picked}
                onToggle={toggle}
              />
            )}
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
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={save.isPending}>
              취소
            </Button>
            <Button disabled={picked.length !== CONCEPT_COUNT || save.isPending} onClick={submit}>
              {save.isPending && <Spinner className="size-3.5" />}
              저장
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
