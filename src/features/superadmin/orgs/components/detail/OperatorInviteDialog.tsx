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
import {
  inviteOperator,
  validateOperatorEmail,
  type InviteFieldErrorCode,
  type Operator,
  type Org,
} from '../../mockData'

/*
  SA-02 §3 "초대 모달" — 이메일 하나만 받는다(기수 배정 없음, 오퍼레이터는 기관
  전체를 본다). 케이스 2·N1(형식·중복·도메인 밖)은 제출 전에 막는다 — 서버 왕복이
  필요 없는 검사라 OrgCreateDialog의 실시간 중복 확인과 달리 입력마다 동기 검증만
  한다(mockData.validateOperatorEmail).
*/

const ERROR_MESSAGE: Record<InviteFieldErrorCode, string> = {
  INVALID_EMAIL: '올바른 이메일 형식이 아닙니다.',
  ALREADY_INVITED: '이미 초대된 이메일입니다.',
  DOMAIN_NOT_ALLOWED: '이 기관 도메인 밖의 주소는 초대할 수 없습니다.',
}

export default function OperatorInviteDialog({
  open,
  onOpenChange,
  org,
  existing,
  onInvited,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  org: Org
  existing: Operator[]
  onInvited: (operator: Operator) => void
}) {
  const [email, setEmail] = useState('')
  const [touched, setTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setEmail('')
      setTouched(false)
    }
  }, [open])

  const trimmed = email.trim()
  const error = trimmed ? validateOperatorEmail(org.domain, existing, trimmed) : null
  // 버튼은 "제출 가능한 상태"가 아니라 "누를 수 있는 상태"만 따진다 — 에러가 있어도
  // 비활성으로 막으면 클릭 자체가 안 먹혀서 handleSubmit이 안 불리고(setTouched(true)도
  // 안 됨), 결과적으로 입력칸에서 포커스가 빠져야만(onBlur) 에러가 보이는 문제가
  // 생긴다. "초대 발송"을 눌렀을 때 바로 에러가 뜨려면 클릭이 항상 handleSubmit까지
  // 도달해야 한다.
  const canAttemptSubmit = trimmed.length > 0 && !submitting
  const canSubmit = canAttemptSubmit && error === null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const operator = await inviteOperator(org.id, trimmed)
      onInvited(operator)
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>오퍼레이터 초대 · {org.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Field data-invalid={touched && error !== null}>
            <FieldLabel htmlFor="operator-email">이메일</FieldLabel>
            <Input
              id="operator-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder={`example@${org.domain}`}
              disabled={submitting}
              aria-invalid={touched && error !== null}
              autoComplete="off"
            />
            {touched && error ? (
              <p className="text-danger text-xs font-medium">{ERROR_MESSAGE[error]}</p>
            ) : (
              <FieldDescription>
                이 주소로 초대 메일이 갑니다 · {org.domain} 도메인만 가능
              </FieldDescription>
            )}
          </Field>

          <DialogFooter className="-mx-4 -mb-4 mt-0">
            <Button
              type="button"
              variant="ghost"
              disabled={submitting}
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button type="submit" disabled={!canAttemptSubmit}>
              {submitting ? '보내는 중…' : '초대 발송'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
