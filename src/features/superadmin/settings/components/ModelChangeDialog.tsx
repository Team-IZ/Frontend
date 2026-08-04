import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Field, FieldLabel } from '@/components/ui/Field'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { AVAILABLE_MODELS, changeGradingModel, type ModelId } from '../mockData'

/*
  SA-03 §6 "채점 모델 변경은 되돌릴 수 없다고 먼저 말한다" — 와이어 #modelchange.
  확정 전에 전 기관 재캘리브레이션 경고를 빨간 Alert(§3 규약 그대로, OperatorsTab의
  마지막 오퍼레이터 차단 모달과 같은 `.warnbox` 구조 재사용)로 보여주고, 확정 버튼도
  danger로 눌러야 실제 위험을 담는다.
*/

export default function ModelChangeDialog({
  open,
  onOpenChange,
  currentModel,
  orgCount,
  onChanged,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentModel: ModelId
  orgCount: number
  onChanged: () => void
}) {
  const [model, setModel] = useState<ModelId>(currentModel)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) setModel(currentModel)
  }, [open, currentModel])

  const canSubmit = model !== currentModel && !submitting

  function handleConfirm() {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      changeGradingModel(model)
      onChanged()
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>채점 모델 변경</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="grading-model-select">모델</FieldLabel>
            <Select
              value={model}
              onValueChange={(v) => setModel((v as ModelId) ?? currentModel)}
              items={Object.fromEntries(AVAILABLE_MODELS.map((m) => [m, m]))}
            >
              <SelectTrigger
                id="grading-model-select"
                className="w-full font-mono text-xs"
                aria-label="채점 모델"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_MODELS.map((m) => (
                  <SelectItem key={m} value={m} className="font-mono text-xs">
                    {m}
                    {m === currentModel && ' (현재)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="flex flex-col gap-2">
            <Alert variant="danger">
              <AlertTitle>{orgCount}개 기관 전체가 재캘리브레이션 대기 상태가 됩니다</AlertTitle>
              <AlertDescription>
                끝나기 전까지 이전 버전으로 채점된 결과와는 비교할 수 없습니다.
              </AlertDescription>
            </Alert>
            <p className="text-fg-subtle text-xs">진행 중인 세션은 기존 모델로 끝까지 채점됩니다</p>
          </div>
        </div>

        <DialogFooter className="-mx-4 -mb-4 mt-0">
          <Button
            type="button"
            variant="ghost"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
          >
            취소
          </Button>
          <Button type="button" variant="danger" disabled={!canSubmit} onClick={handleConfirm}>
            변경하고 재캘리브레이션 시작
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
