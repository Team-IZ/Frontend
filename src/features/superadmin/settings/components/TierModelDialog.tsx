import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Field, FieldLabel, FieldDescription } from '@/components/ui/Field'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { useUpdateTierModel } from '@/api/platform/usePlatformMutations'
import type { findModelSettings_Response } from '@/api/platform/platformTypes'
import { isApiError } from '@/api/_contract'
import { FEATURE_CODE, TIER_DESCRIPTION, TIER_LABEL, isSelectableModel } from '../labels'

/*
  SA-03 §5 "매핑 변경". 채점 모델 변경(ModelChangeDialog)과 달리 **재캘리브레이션이 없다** —
  코드 세션 전용이라 채점 결과 비교와 무관하다. 그래서 확인은 가볍게 둔다.

  **모델 목록은 `modelPricings`에서 온다.** 중지된 모델(`status !== 'ACTIVE'`)은 새로 배정할
  수 없으므로 선택지에서 뺀다 — 다만 **지금 쓰이는 모델이 중지 상태면 남긴다.** 안 그러면
  셀렉트에 현재 값이 없어 빈 칸으로 보인다.
*/

type Settings = findModelSettings_Response
type Pricing = Settings['modelPricings'][number]
type TierMapping = Settings['tierMappings'][number]

export default function TierModelDialog({
  open,
  onOpenChange,
  tierMapping,
  models,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tierMapping: TierMapping | null
  models: Pricing[]
}) {
  const [modelId, setModelId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const update = useUpdateTierModel()

  useEffect(() => {
    if (open && tierMapping) {
      setModelId(tierMapping.modelId)
      setError(null)
    }
  }, [open, tierMapping])

  if (!tierMapping) return null

  const options = models.filter((m) => isSelectableModel(m) || m.modelId === tierMapping.modelId)
  const canSubmit = modelId !== tierMapping.modelId && !update.isPending

  async function handleConfirm() {
    if (!tierMapping || !canSubmit) return
    setError(null)
    try {
      await update.mutateAsync({
        body: { featureCode: FEATURE_CODE, tierCode: tierMapping.tierCode, modelId },
      })
      onOpenChange(false)
    } catch (e) {
      setError(
        isApiError(e) && e.code === 'AI_MODEL_NOT_AVAILABLE'
          ? '사용할 수 없는 모델입니다. 목록을 새로 불러온 뒤 다시 선택해 주세요.'
          : '변경하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>티어 모델 변경 · {TIER_LABEL[tierMapping.tierCode]}</DialogTitle>
        </DialogHeader>

        {error && <Alert variant="danger">{error}</Alert>}

        <Field>
          <FieldLabel htmlFor="tier-model-select">모델</FieldLabel>
          <Select
            value={modelId}
            onValueChange={(v) => setModelId(v ?? tierMapping.modelId)}
            disabled={update.isPending}
            items={Object.fromEntries(options.map((m) => [m.modelId, m.modelDisplayName]))}
          >
            <SelectTrigger id="tier-model-select" className="w-full" aria-label="모델">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((m) => (
                <SelectItem key={m.modelId} value={m.modelId}>
                  {m.modelDisplayName}
                  {m.modelId === tierMapping.modelId && ' (현재)'}
                  {/* 단가가 없으면 이 모델 호출은 비용 집계에서 빠진다 — 고르기 전에 알려야 한다 */}
                  {m.pricingMissing && ' · 단가 미설정'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>{TIER_DESCRIPTION[tierMapping.tierCode]}</FieldDescription>
        </Field>

        <DialogFooter className="-mx-4 -mb-4 mt-0">
          <Button
            type="button"
            variant="ghost"
            disabled={update.isPending}
            onClick={() => onOpenChange(false)}
          >
            취소
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={handleConfirm}>
            {update.isPending ? '변경 중…' : '변경'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
