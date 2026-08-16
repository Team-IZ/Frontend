import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Field, FieldLabel, FieldError, FieldDescription } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { useUpdateGradingModel } from '@/api/platform/usePlatformMutations'
import type { findModelSettings_Response } from '@/api/platform/platformTypes'
import { isApiError } from '@/api/_contract'
import { isSelectableModel } from '../labels'

/*
  SA-03 §6 "채점 모델 변경은 되돌릴 수 없다고 먼저 말한다".

  **제품 원칙이 그대로 걸리는 자리다** — *"되돌릴 수 없는 것을 가장 크게."*
  전 기관 재캘리브레이션이 돌고, 그 사이 채점 결과가 새 기준으로 바뀐다.

  ## 서버가 요구하는 것 셋
  | | |
  |---|---|
  | `modelId` | 새 채점 모델 |
  | `calibrationVersionCode` | **사용자가 짓는다.** 결과 비교에서 이 코드로 버전을 구분한다 |
  | `acknowledgeRecalibration` | `true`가 아니면 400. **확인 모달을 우회한 호출을 막는 안전장치**라 화면이 무조건 true를 보내면 안 된다 — 사용자가 실제로 확인한 뒤에만 켠다 |
*/

type Settings = findModelSettings_Response
type Pricing = Settings['modelPricings'][number]

/** 서버 패턴 그대로 — 대문자로 시작, 대문자·숫자·밑줄만 */
const VERSION_CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/

/** `CAL_2026_08_V1` — 사용자가 매번 형식을 고민하지 않게 기본값을 준다 */
function suggestVersionCode(now: Date) {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `CAL_${y}_${m}_V1`
}

export default function ModelChangeDialog({
  open,
  onOpenChange,
  gradingPolicy,
  models,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  gradingPolicy: Settings['gradingPolicy']
  models: Pricing[]
}) {
  const [modelId, setModelId] = useState(gradingPolicy.modelId)
  const [versionCode, setVersionCode] = useState('')
  const [reason, setReason] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const update = useUpdateGradingModel()

  useEffect(() => {
    if (open) {
      setModelId(gradingPolicy.modelId)
      setVersionCode(suggestVersionCode(new Date()))
      setReason('')
      setAcknowledged(false)
      setTouched(false)
      setError(null)
    }
  }, [open, gradingPolicy.modelId])

  /*
    단가 미설정 모델은 채점 모델로 고를 수 없다(사용자 정책 — 채점 모델은 전 기관 강제
    적용 단일 모델이라, 단가 미설정 상태로 바뀌면 전 기관 채점 호출 비용이 통째로 집계에서
    빠진다. 정의서 §6 "0으로 계산하지 않는다" 원칙과 같은 결의 문제).
    지금 채점 모델이 마침 단가 미설정이면(이 화면 밖에서 이미 그렇게 된 상태) 목록에서
    완전히 빼지 않는다 — 빼면 트리거가 빈 값으로 보인다. 대신 목록엔 남기고 선택만 막는다.
  */
  const options = models.filter(
    (m) => (isSelectableModel(m) && !m.pricingMissing) || m.modelId === gradingPolicy.modelId,
  )
  const versionValid = VERSION_CODE_PATTERN.test(versionCode)
  const changed = modelId !== gradingPolicy.modelId
  const canSubmit = changed && versionValid && acknowledged && !update.isPending

  async function handleConfirm() {
    setTouched(true)
    if (!canSubmit) return
    setError(null)
    try {
      await update.mutateAsync({
        body: {
          modelId,
          calibrationVersionCode: versionCode,
          changeReason: reason.trim() || null,
          /*
            사용자가 위 경고를 읽고 켠 값만 보낸다 — 하드코딩하면 안전장치가 무의미해진다.

            ⚠ **한때 같은 값을 두 이름으로 같이 보냈다**(`recalibrationAcknowledged`도).
            연동 당시 서버가 어느 쪽을 읽는지 확실하지 않아 양쪽에 실은 것인데, 스펙이
            `acknowledgeRecalibration` 하나로 정리되면서(`required`) 나머지가 타입에서
            빠졌다. 둘을 계속 보내면 **어느 쪽이 실제로 동의를 전달하는지 아무도 모르는
            상태**가 굳는다 — 스펙이 답한 지금 지운다.
          */
          acknowledgeRecalibration: acknowledged,
        },
      })
      onOpenChange(false)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>채점 모델 변경</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {error && <Alert variant="danger">{error}</Alert>}

          <Alert variant="danger">
            <AlertTitle>되돌릴 수 없습니다</AlertTitle>
            <AlertDescription>
              바꾸는 즉시 <b>전 기관 재캘리브레이션</b>이 시작되고, 이후 채점은 새 기준으로
              이뤄집니다. 이전 결과와 직접 비교할 수 없게 됩니다.
            </AlertDescription>
          </Alert>

          <Field>
            <FieldLabel htmlFor="grading-model-select">모델</FieldLabel>
            <Select
              value={modelId}
              onValueChange={(v) => setModelId(v ?? gradingPolicy.modelId)}
              disabled={update.isPending}
              items={Object.fromEntries(options.map((m) => [m.modelId, m.modelDisplayName]))}
            >
              <SelectTrigger id="grading-model-select" className="w-full" aria-label="채점 모델">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((m) => (
                  <SelectItem key={m.modelId} value={m.modelId} disabled={m.pricingMissing}>
                    {m.modelDisplayName}
                    {m.modelId === gradingPolicy.modelId && ' (현재)'}
                    {m.pricingMissing && ' · 단가 미설정이라 고를 수 없습니다'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field data-invalid={touched && !versionValid}>
            <FieldLabel htmlFor="calibration-version">캘리브레이션 버전 코드</FieldLabel>
            <Input
              id="calibration-version"
              value={versionCode}
              disabled={update.isPending}
              onChange={(e) => setVersionCode(e.target.value.toUpperCase())}
              aria-invalid={touched && !versionValid}
              className="font-mono"
            />
            <FieldDescription>
              결과를 비교할 때 이 코드로 버전을 구분합니다. 대문자로 시작하고 대문자·숫자·밑줄만 쓸
              수 있습니다.
            </FieldDescription>
            <FieldError>
              {touched && !versionValid ? '예: CAL_2026_08_V1 형식으로 입력하세요.' : ''}
            </FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="change-reason">변경 사유 (선택)</FieldLabel>
            <Input
              id="change-reason"
              value={reason}
              disabled={update.isPending}
              placeholder="감사·이력 확인용"
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>

          {/*
            서버가 `acknowledgeRecalibration !== true`면 400으로 막는다 — 확인 모달을 우회한
            호출을 걸러내는 장치다. 화면이 자동으로 true를 보내면 그 장치가 무의미해지므로
            **사용자가 직접 켜게** 한다.
          */}
          <label className="border-danger-border bg-danger-soft flex items-start gap-2 rounded-md border px-3 py-2.5 text-xs">
            <input
              type="checkbox"
              checked={acknowledged}
              disabled={update.isPending}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              전 기관 재캘리브레이션이 시작되고 <b>되돌릴 수 없다</b>는 것을 확인했습니다.
            </span>
          </label>
        </div>

        <DialogFooter className="-mx-4 -mb-4 mt-0">
          <Button
            type="button"
            variant="ghost"
            disabled={update.isPending}
            onClick={() => onOpenChange(false)}
          >
            취소
          </Button>
          <Button type="button" variant="danger" disabled={!canSubmit} onClick={handleConfirm}>
            {update.isPending ? '변경 중…' : '변경하고 재캘리브레이션 시작'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function errorMessage(e: unknown): string {
  if (!isApiError(e)) return '변경하지 못했습니다. 잠시 후 다시 시도해 주세요.'
  switch (e.code) {
    case 'CALIBRATION_IN_PROGRESS':
      return '이미 재캘리브레이션이 진행 중입니다. 끝난 뒤에 다시 시도해 주세요.'
    case 'CALIBRATION_VERSION_CODE_TAKEN':
      return '이미 쓰인 버전 코드입니다. 다른 코드를 입력해 주세요.'
    case 'AI_MODEL_NOT_AVAILABLE':
      return '사용할 수 없는 모델입니다.'
    default:
      return '변경하지 못했습니다. 잠시 후 다시 시도해 주세요.'
  }
}
