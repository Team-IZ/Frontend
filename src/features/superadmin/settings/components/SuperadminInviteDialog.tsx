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
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { useInviteSuperAdmin } from '@/api/platform/usePlatformMutations'
import { isApiError } from '@/api/_contract'
import { EMAIL_PATTERN, EMAIL_INVALID_MESSAGE } from '@/lib/validation'

/*
  SA-03 슈퍼어드민 초대.

  **이메일만 받는다.** 서버 요청 스키마에 이름이 없다 — 이름은 초대받은 사람이
  **가입할 때 직접 정한다**(그래서 목록의 `name`이 활성화 전까지 null이다).
  예전 폼은 이름을 받았는데, 그 값은 보낼 곳이 없어 화면에만 남았을 것이다.

  ## 메일 발송 실패를 성공으로 처리하지 않는다
  `INVITE_MAIL_FAILED`(502)는 **계정 자리와 초대 기록은 남고 메일만 못 간 것**이다.
  "실패"로만 말하면 사용자가 다시 초대를 시도하는데, 그때는 `ALREADY_INVITED`가 나서
  막힌다. 그래서 **무엇이 됐고 무엇이 안 됐는지**를 문구에 담는다.
*/

export default function SuperadminInviteDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [email, setEmail] = useState('')
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const invite = useInviteSuperAdmin()

  useEffect(() => {
    if (open) {
      setEmail('')
      setTouched(false)
      setError(null)
    }
  }, [open])

  const trimmed = email.trim()
  const emailValid = EMAIL_PATTERN.test(trimmed)
  const canSubmit = emailValid && !invite.isPending

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (!canSubmit) return
    setError(null)
    try {
      await invite.mutateAsync({ body: { email: trimmed } })
      onOpenChange(false)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>슈퍼어드민 초대</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {error && <Alert variant="danger">{error}</Alert>}

          <Field data-invalid={touched && !emailValid}>
            <FieldLabel htmlFor="superadmin-email">이메일</FieldLabel>
            <Input
              id="superadmin-email"
              type="email"
              autoComplete="off"
              placeholder="name@example.com"
              value={email}
              disabled={invite.isPending}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={touched && !emailValid}
            />
            <FieldDescription>
              초대 메일의 링크로 가입하며, 이름은 본인이 정합니다.
            </FieldDescription>
            <FieldError>{touched && !emailValid ? EMAIL_INVALID_MESSAGE : ''}</FieldError>
          </Field>

          <DialogFooter className="-mx-4 -mb-4 mt-0">
            <Button
              type="button"
              variant="ghost"
              disabled={invite.isPending}
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {invite.isPending ? '초대 중…' : '초대'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function errorMessage(e: unknown): string {
  if (!isApiError(e)) return '초대하지 못했습니다. 잠시 후 다시 시도해 주세요.'
  switch (e.code) {
    case 'ALREADY_INVITED':
      return '이미 등록되었거나 초대된 이메일입니다.'
    case 'INVITE_MAIL_FAILED':
      // 계정 자리는 만들어졌다 — 다시 초대하면 ALREADY_INVITED가 난다
      return '계정은 만들어졌지만 초대 메일 발송에 실패했습니다. 목록에서 재발송해 주세요.'
    default:
      return '초대하지 못했습니다. 잠시 후 다시 시도해 주세요.'
  }
}
