import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Field, FieldLabel, FieldDescription } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { updatePricing, type ModelId, type ModelPricing } from '../mockData'

/*
  SA-03 §5 "단가 수정" — 매핑 변경과 달리 확인 모달이 명시돼 있지 않다(정의서 §5
  목록에 "매핑 변경(확인 모달)"만 괄호가 붙어 있고 단가 수정엔 없다). 그래서 이
  다이얼로그는 확인 문구 없이 바로 입력·저장한다.

  100만 토큰당 달러 단위(와이어 "· 100만 토큰당") — 소수점 둘째 자리까지 받는다.

  0·0 = 미설정 — 두 값을 다 0으로 저장하면 mockData.updatePricing이 이 모델의
  단가 항목 자체를 지운다(§6 "0으로 계산하지 않는다"). 값을 막지 않고 되돌리는
  쪽으로 둔 이유: 입력을 막으면 "이미 있는 단가를 미설정으로 되돌리고 싶을 때"
  취소 말고는 방법이 없다 — 0을 그 의도의 입력으로 받아주는 편이 자연스럽다.
*/

export default function PricingDialog({
  open,
  onOpenChange,
  model,
  current,
  onChanged,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  model: ModelId | null
  current: ModelPricing | undefined
  onChanged: () => void
}) {
  const [inputUsd, setInputUsd] = useState('')
  const [outputUsd, setOutputUsd] = useState('')
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (open) {
      setInputUsd(current ? String(current.inputUsdPerM) : '')
      setOutputUsd(current ? String(current.outputUsdPerM) : '')
      setTouched(false)
    }
  }, [open, current])

  if (!model) return null

  const inputNum = Number(inputUsd)
  const outputNum = Number(outputUsd)
  const inputValid = inputUsd.trim() !== '' && Number.isFinite(inputNum) && inputNum >= 0
  const outputValid = outputUsd.trim() !== '' && Number.isFinite(outputNum) && outputNum >= 0
  const canAttemptSubmit = inputUsd.trim() !== '' && outputUsd.trim() !== ''
  const canSubmit = canAttemptSubmit && inputValid && outputValid
  const willClear = canSubmit && inputNum === 0 && outputNum === 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (!model || !canSubmit) return
    updatePricing(model, inputNum, outputNum)
    onChanged()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            단가 {current ? '수정' : '입력'} · {model}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <p className="text-fg-subtle text-xs">
            미설정으로 되돌리려면 입력·출력 둘 다 0을 입력하세요.
          </p>

          <Field data-invalid={touched && !inputValid}>
            <FieldLabel htmlFor="price-input">입력 토큰 단가 (USD)</FieldLabel>
            <Input
              id="price-input"
              inputMode="decimal"
              value={inputUsd}
              onChange={(e) => setInputUsd(e.target.value)}
              placeholder="0.00"
              aria-invalid={touched && !inputValid}
            />
            {touched && !inputValid ? (
              <p className="text-danger text-xs font-medium">0 이상의 숫자를 입력하세요.</p>
            ) : (
              <FieldDescription>100만 토큰당</FieldDescription>
            )}
          </Field>

          <Field data-invalid={touched && !outputValid}>
            <FieldLabel htmlFor="price-output">출력 토큰 단가 (USD)</FieldLabel>
            <Input
              id="price-output"
              inputMode="decimal"
              value={outputUsd}
              onChange={(e) => setOutputUsd(e.target.value)}
              placeholder="0.00"
              aria-invalid={touched && !outputValid}
            />
            {touched && !outputValid ? (
              <p className="text-danger text-xs font-medium">0 이상의 숫자를 입력하세요.</p>
            ) : (
              <FieldDescription>100만 토큰당</FieldDescription>
            )}
          </Field>

          {willClear && (
            <p className="text-warning text-xs font-medium">
              저장하면 이 모델은 단가 미설정으로 바뀝니다.
            </p>
          )}

          <DialogFooter className="-mx-4 -mb-4 mt-0">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" disabled={!canAttemptSubmit}>
              {willClear ? '미설정으로 저장' : '저장'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
