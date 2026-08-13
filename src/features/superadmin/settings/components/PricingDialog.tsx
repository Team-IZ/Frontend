import { useEffect, useState } from 'react'
import { TriangleAlertIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Field, FieldLabel, FieldError, FieldDescription } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/AlertDialog'
import { Spinner } from '@/components/ui/Spinner'
import { useUpdateModelPricing } from '@/api/platform/usePlatformMutations'
import type { findModelSettings_Response } from '@/api/platform/platformTypes'
import { isApiError } from '@/api/_contract'

/*
  SA-03 단가 수정.

  ## ★ 빈 칸과 0은 다르다
  스펙이 못 박아 뒀다 — *"0은 '무료'를 의미하므로 미설정과 구분한다."*

  | 입력 | 보내는 값 | 뜻 |
  |---|---|---|
  | 비움 | `null` | **단가 미설정** — 이 모델 호출이 비용 집계에서 빠진다 |
  | `0` | `0` | **무료** — 집계에 0원으로 들어간다 |

  예전 목은 `0·0`을 미설정으로 처리했는데, 서버 의미로는 **무료**다. 그대로 두면
  "미설정으로 되돌리려고 0을 넣은 사람"이 그 모델을 무료로 만들어 버린다.

  ## 확인 모달(팀장 지시, H6)
  "저장" 버튼은 이제 바로 제출하지 않고 확인 모달을 연다. `willUnset` 경고 `Alert`는
  그대로 남긴다 — 그건 **입력하는 동안** 실시간으로 "지금 이대로 저장하면 미설정이
  된다"를 알려주는 것이고, 확인 모달은 **제출 직전** 마지막 관문이라 성격이 다르다(하나는
  타이핑 중 피드백, 하나는 커밋 직전 게이트). 확인 모달 문구도 `willUnset`이면 같은
  사실을 한 번 더 강조하도록 갈랐다 — 두 벌이 아니라 같은 사실을 다른 시점에 말하는 것.
*/

type Pricing = findModelSettings_Response['modelPricings'][number]

/** 빈 문자열 → null(미설정), 숫자 → 그 값. 형식이 틀리면 `undefined`로 알린다 */
function parsePrice(raw: string): number | null | undefined {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const n = Number(trimmed)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

const toField = (v: number | null | undefined) => (v == null ? '' : String(v))

export default function PricingDialog({
  open,
  onOpenChange,
  pricing,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  pricing: Pricing | null
}) {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [cached, setCached] = useState('')
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const update = useUpdateModelPricing()

  useEffect(() => {
    if (open && pricing) {
      setInput(toField(pricing.inputPricePerMillionTokens))
      setOutput(toField(pricing.outputPricePerMillionTokens))
      setCached(toField(pricing.cachedInputPricePerMillionTokens))
      setTouched(false)
      setError(null)
      setConfirmOpen(false)
    }
  }, [open, pricing])

  if (!pricing) return null

  const values = {
    input: parsePrice(input),
    output: parsePrice(output),
    cached: parsePrice(cached),
  }
  const invalid = {
    input: values.input === undefined,
    output: values.output === undefined,
    cached: values.cached === undefined,
  }
  const canSubmit = !invalid.input && !invalid.output && !invalid.cached && !update.isPending
  /** 입력·출력이 둘 다 비면 이 모델은 미설정으로 돌아간다 — 저장 전에 알린다 */
  const willUnset = values.input === null && values.output === null

  /** "저장"은 이제 바로 제출하지 않는다 — 유효성만 확인하고 확인 모달을 연다 */
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (!pricing || !canSubmit) return
    setConfirmOpen(true)
  }

  async function handleConfirmSave() {
    if (!pricing || !canSubmit) return
    setError(null)
    try {
      await update.mutateAsync({
        path: { modelId: pricing.modelId },
        body: {
          inputPricePerMillionTokens: values.input,
          outputPricePerMillionTokens: values.output,
          cachedInputPricePerMillionTokens: values.cached,
        },
      })
      setConfirmOpen(false)
      onOpenChange(false)
    } catch (e) {
      setError(
        isApiError(e) && e.code === 'AI_MODEL_NOT_AVAILABLE'
          ? '사용할 수 없는 모델입니다.'
          : '단가를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      )
      // 확인 모달은 안 닫는다 — 실패 사실이 그 자리에 남아야 한다
    }
  }

  const fmt = (v: number | null | undefined) => (v == null ? '미설정' : `$${v}`)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            단가 {pricing.pricingMissing ? '입력' : '수정'} · {pricing.modelDisplayName}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <p className="text-fg-subtle text-xs">
            100만 토큰당 {pricing.currencyCode}. <b>비워 두면 미설정</b>이고, <b>0은 무료</b>를
            뜻합니다.
          </p>

          <Field data-invalid={touched && invalid.input}>
            <FieldLabel htmlFor="price-input">입력 토큰 단가</FieldLabel>
            <Input
              id="price-input"
              inputMode="decimal"
              placeholder="비우면 미설정"
              value={input}
              disabled={update.isPending}
              onChange={(e) => setInput(e.target.value)}
              aria-invalid={touched && invalid.input}
            />
            <FieldError>{touched && invalid.input ? '0 이상의 숫자를 입력하세요.' : ''}</FieldError>
          </Field>

          <Field data-invalid={touched && invalid.output}>
            <FieldLabel htmlFor="price-output">출력 토큰 단가</FieldLabel>
            <Input
              id="price-output"
              inputMode="decimal"
              placeholder="비우면 미설정"
              value={output}
              disabled={update.isPending}
              onChange={(e) => setOutput(e.target.value)}
              aria-invalid={touched && invalid.output}
            />
            <FieldError>
              {touched && invalid.output ? '0 이상의 숫자를 입력하세요.' : ''}
            </FieldError>
          </Field>

          <Field data-invalid={touched && invalid.cached}>
            <FieldLabel htmlFor="price-cached">캐시 입력 단가</FieldLabel>
            <Input
              id="price-cached"
              inputMode="decimal"
              placeholder="비우면 미설정"
              value={cached}
              disabled={update.isPending}
              onChange={(e) => setCached(e.target.value)}
              aria-invalid={touched && invalid.cached}
            />
            <FieldDescription>같은 프롬프트를 다시 보낼 때 적용되는 단가입니다.</FieldDescription>
            <FieldError>
              {touched && invalid.cached ? '0 이상의 숫자를 입력하세요.' : ''}
            </FieldError>
          </Field>

          {willUnset && (
            <Alert variant="warning">
              입력·출력을 둘 다 비우면 <b>단가 미설정</b>이 됩니다. 이 모델의 호출 비용이 집계에
              합산되지 않습니다.
            </Alert>
          )}

          <DialogFooter className="-mx-4 -mb-4 mt-0">
            <Button
              type="button"
              variant="ghost"
              disabled={update.isPending}
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              저장
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(next) => {
          if (!next && !update.isPending) {
            setConfirmOpen(false)
            setError(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className={willUnset ? 'bg-warning-soft text-warning' : undefined}>
              <TriangleAlertIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>{pricing.modelDisplayName} 단가를 저장할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              {error ? (
                <span className="text-danger">{error}</span>
              ) : willUnset ? (
                <>
                  입력·출력이 둘 다 비어 있어 저장하면 <b>단가 미설정</b>이 됩니다. 이 모델의 호출
                  비용이 비용 집계에서 빠집니다.
                </>
              ) : (
                `입력 ${fmt(values.input)} · 출력 ${fmt(values.output)} · 캐시 입력 ${fmt(values.cached)}로 저장됩니다.`
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={update.isPending}>취소</AlertDialogCancel>
            <AlertDialogAction
              variant={willUnset ? 'danger' : 'primary'}
              disabled={update.isPending}
              onClick={handleConfirmSave}
            >
              {update.isPending && <Spinner className="size-3.5" />}
              {update.isPending ? '저장 중…' : '저장'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
