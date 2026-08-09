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
import { saveRequirements } from '../../api'
import RequirementsField from '../../components/RequirementsField'
import type { ProjectDetail } from '../../types'

/*
  요구사항 편집 — **교안과 별개다.** 과제 문서에서 나와 **구현 P/F에만** 쓴다(14번 6-3).

  ▸ **관문이 아니다.** 비어 있어도 일정·현황이 열린다 — 요구사항은 문항을 만들지
    않는다. 검증 개념과 갈리는 지점이 정확히 여기라, 저장 버튼에 "N건이어야 한다"
    같은 조건이 붙지 않는다.
  ▸ **입력이 곧 목록이다**(`RequirementsField` — 칩). 공백·중복 정리가 **치는 순간**
    끝나므로 저장된 것과 화면에 보이는 것이 항상 같다. 처음엔 `Textarea` + `한 줄에
    하나`였는데, 개행이 눈에 안 보이는 계약이라 저장해야 몇 건인지 알 수 있었다.
  ▸ **생성 모달과 같은 입력을 쓴다** — 같은 것을 두 모양으로 배우지 않게.
*/
type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: ProjectDetail
  /** 저장 성공 시 — 상세를 다시 부른다 */
  onSaved: () => void
}

export default function EditRequirementsDialog({ open, onOpenChange, project, onSaved }: Props) {
  const [items, setItems] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [failed, setFailed] = useState(false)

  // 열 때마다 저장된 원문에서 시작한다 — 편집하러 열었는데 비어 있으면 다시 쳐야 한다
  useEffect(() => {
    if (open) {
      setItems(project.requirementTitles)
      setFailed(false)
    }
  }, [open, project.requirementTitles])

  const changed =
    items.length !== project.requirementTitles.length ||
    items.some((r, i) => r !== project.requirementTitles[i])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85svh] flex-col sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>
            요구사항 편집{' '}
            <span className="text-fg-subtle text-xs font-normal">
              · 교안과 별개 · 구현 P/F 전용
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-1">
          {failed && (
            <Alert variant="danger">
              <AlertTitle>저장하지 못했습니다. 잠시 후 다시 시도해 주세요.</AlertTitle>
            </Alert>
          )}

          <RequirementsField value={items} onChange={setItems} />
        </div>

        <DialogFooter className="items-center justify-between sm:justify-between">
          {/*
            비운 것도 저장이다 — 요구사항은 회차를 만든 뒤에 채우는 값이라 `0건`은
            "아직 안 적음"이지 결함이 아니다. 못 지나가는 조건으로 쓰지 않고 **센 결과만** 쓴다.
          */}
          <p className="text-fg-subtle text-xs">
            {items.length === 0 ? '비워 둘 수 있습니다' : `${items.length}건`}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
              취소
            </Button>
            <Button
              disabled={!changed || submitting}
              onClick={async () => {
                setSubmitting(true)
                setFailed(false)
                try {
                  await saveRequirements(project.projectId, items)
                  onSaved()
                  onOpenChange(false)
                } catch {
                  // 입력값을 유지한다 — 저장 실패로 친 것이 날아가면 처음부터 다시 해야 한다(F5)
                  setFailed(true)
                } finally {
                  setSubmitting(false)
                }
              }}
            >
              {submitting && <Spinner className="size-3.5" />}
              저장
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
