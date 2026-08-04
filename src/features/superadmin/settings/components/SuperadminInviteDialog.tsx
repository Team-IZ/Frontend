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
  inviteSuperadmin,
  validateSuperadminInvite,
  type SuperadminAccount,
  type SuperadminInviteErrorCode,
} from '../mockData'

/*
  SA-03 §3 "슈퍼어드민 계정" — 목록 · 초대 · 정지. 이메일만 받는 오퍼레이터 초대와
  달리 이름도 함께 받는다(초대 즉시 활성 계정을 만들기 때문 — mockData.ts 파일
  머리말 판단 근거). 검증 타이밍은 OperatorInviteDialog와 같은 패턴: 버튼은 항상
  handleSubmit까지 도달하게 두고(disabled는 "누를 수 있는 상태"만 따짐), 제출
  시점에 touched를 세워 에러를 보여준다.
*/

const ERROR_MESSAGE: Record<SuperadminInviteErrorCode, string> = {
  NAME_REQUIRED: '이름을 입력하세요.',
  INVALID_EMAIL: '올바른 이메일 형식이 아닙니다.',
  ALREADY_EXISTS: '이미 등록된 이메일입니다.',
}

export default function SuperadminInviteDialog({
  open,
  onOpenChange,
  onInvited,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onInvited: (account: SuperadminAccount) => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [touched, setTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setName('')
      setEmail('')
      setTouched(false)
    }
  }, [open])

  const trimmedName = name.trim()
  const trimmedEmail = email.trim()
  const error =
    trimmedName || trimmedEmail ? validateSuperadminInvite(trimmedName, trimmedEmail) : null
  const canAttemptSubmit = trimmedName.length > 0 && trimmedEmail.length > 0 && !submitting
  const canSubmit = canAttemptSubmit && error === null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const account = inviteSuperadmin(trimmedName, trimmedEmail)
      onInvited(account)
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>슈퍼어드민 계정 초대</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Field data-invalid={touched && error === 'NAME_REQUIRED'}>
            <FieldLabel htmlFor="superadmin-name">이름</FieldLabel>
            <Input
              id="superadmin-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched(true)}
              disabled={submitting}
              autoComplete="off"
            />
            {touched && error === 'NAME_REQUIRED' && (
              <p className="text-danger text-xs font-medium">{ERROR_MESSAGE.NAME_REQUIRED}</p>
            )}
          </Field>

          <Field
            data-invalid={touched && (error === 'INVALID_EMAIL' || error === 'ALREADY_EXISTS')}
          >
            <FieldLabel htmlFor="superadmin-email">이메일</FieldLabel>
            <Input
              id="superadmin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="example@iz-get.com"
              disabled={submitting}
              aria-invalid={touched && (error === 'INVALID_EMAIL' || error === 'ALREADY_EXISTS')}
              autoComplete="off"
            />
            {touched && (error === 'INVALID_EMAIL' || error === 'ALREADY_EXISTS') ? (
              <p className="text-danger text-xs font-medium">{ERROR_MESSAGE[error]}</p>
            ) : (
              <FieldDescription>플랫폼 콘솔에 로그인할 수 있는 계정입니다</FieldDescription>
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
              {submitting ? '초대하는 중…' : '계정 초대'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
