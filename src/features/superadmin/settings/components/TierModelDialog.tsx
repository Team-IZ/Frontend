import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Field, FieldLabel, FieldDescription } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { AVAILABLE_MODELS, updateTierMapping, type ModelId, type TierMapping } from '../mockData'

/*
  SA-03 §5 "매핑 변경(확인 모달)". 채점 모델 변경(ModelChangeDialog)과 달리
  재캘리브레이션이 걸리지 않는다 — 질문 생성·요약 전용이라 채점 결과 비교와
  무관하다(mockData.ts updateTierMapping 주석). 그래서 확인은 가볍게, 위험
  경고 없이 "정말 바꿀지"만 확인한다.
*/

export default function TierModelDialog({
  open,
  onOpenChange,
  tierMapping,
  onChanged,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tierMapping: TierMapping | null
  onChanged: () => void
}) {
  const [model, setModel] = useState<ModelId>(tierMapping?.model ?? 'claude-opus-5')

  useEffect(() => {
    if (open && tierMapping) setModel(tierMapping.model)
  }, [open, tierMapping])

  if (!tierMapping) return null

  const canSubmit = model !== tierMapping.model

  function handleConfirm() {
    if (!tierMapping || !canSubmit) return
    updateTierMapping(tierMapping.tier, model)
    onChanged()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>티어 모델 변경 · {tierMapping.label}</DialogTitle>
        </DialogHeader>

        <Field>
          <FieldLabel htmlFor="tier-model-select">모델</FieldLabel>
          <Select
            value={model}
            onValueChange={(v) => setModel((v as ModelId) ?? tierMapping.model)}
            items={Object.fromEntries(AVAILABLE_MODELS.map((m) => [m, m]))}
          >
            <SelectTrigger
              id="tier-model-select"
              className="w-full font-mono text-xs"
              aria-label="모델"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_MODELS.map((m) => (
                <SelectItem key={m} value={m} className="font-mono text-xs">
                  {m}
                  {m === tierMapping.model && ' (현재)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>{tierMapping.usedFor}에 쓰입니다</FieldDescription>
        </Field>

        <DialogFooter className="-mx-4 -mb-4 mt-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={handleConfirm}>
            변경
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
