import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Field, FieldLabel, FieldDescription, FieldError } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { useInviteOperator } from '@/api/organization/useOrganizationMutations'
import { organizationKeys } from '@/api/organization/organizationKeys'
import { isApiError } from '@/api/_contract'
import { EMAIL_PATTERN, EMAIL_INVALID_MESSAGE } from '#lib/validation.ts'

/*
  SA-02 ② 초대 모달 — 이메일 하나만 받는다(기수 배정 없음, 오퍼레이터는 기관 전체를 본다).

  ## 화면이 하던 검사 둘을 서버에 넘겼다
  | 검사 | 왜 화면이 못 하나 |
  |---|---|
  | **도메인 제한** | 스펙 명시 — *"이메일 도메인 제한이 없다. `emailDomain`이 설정돼 있어도 아무 주소로나"*. 목이 막고 있던 것이 **없는 규칙**이었다 |
  | **중복 초대** | 이미 가입했는지·초대 진행 중인지는 서버만 안다. 목은 화면이 가진 목록으로 셌다 |

  형식 검사만 화면에 남는다 — 왕복 없이 즉시 알려줄 수 있는 것이라 그렇다.

  ## `INVITE_MAIL_FAILED`(502)는 에러 코드지만 초대는 됐다
  스펙에 적혀 있다 — *"502여도 계정 자리는 남는다. 목록을 다시 부르면 그 계정이
  `invitationDeliveryFailed=true`로 나오므로 화면은 **그 행에** 재발송 버튼을 붙이면 된다."*

  그래서 **모달을 닫는다.** 에러로 남겨 두면 사용자가 다시 누르고, 그때는 `ALREADY_INVITED`가
  나서 "초대가 안 된 건가?"로 더 헷갈린다. 자리가 남는 이유도 스펙에 있다 — 지우면
  **중복 초대인지 재시도인지 구분할 수 없다.**
*/

export default function OperatorInviteDialog({
  open,
  onOpenChange,
  organizationId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
}) {
  const [email, setEmail] = useState('')
  const [touched, setTouched] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const invite = useInviteOperator()
  const queryClient = useQueryClient()

  // 다이얼로그는 닫아도 언마운트되지 않는다 — 열 때마다 비운다
  useEffect(() => {
    if (open) {
      setEmail('')
      setTouched(false)
      setSubmitError(null)
    }
  }, [open])

  const trimmed = email.trim()
  const formatError = trimmed && !EMAIL_PATTERN.test(trimmed) ? EMAIL_INVALID_MESSAGE : null

  async function handleSubmit() {
    setTouched(true)
    setSubmitError(null)
    if (!trimmed || formatError) return

    try {
      await invite.mutateAsync({ path: { organizationId }, body: { email: trimmed } })
      onOpenChange(false)
    } catch (e) {
      // 메일 실패는 초대 자체가 된 것이라 닫는다. 표의 그 행이 재발송을 안내한다.
      // 실패라 useInviteOperator의 onSuccess 무효화가 안 돌아서 여기서 직접 무효화한다 —
      // 안 하면 방금 생긴 "메일 발송 실패" 행이 다른 계기로 재조회되기 전까진 안 보인다(F6).
      if (isApiError(e) && e.code === 'INVITE_MAIL_FAILED') {
        queryClient.invalidateQueries({ queryKey: organizationKeys.all })
        onOpenChange(false)
        return
      }
      setSubmitError(inviteErrorMessage(e))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>오퍼레이터 초대</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {submitError && <Alert variant="danger">{submitError}</Alert>}

          <Field data-invalid={touched && Boolean(formatError)}>
            <FieldLabel htmlFor="operator-email">이메일</FieldLabel>
            <Input
              id="operator-email"
              type="email"
              value={email}
              autoFocus
              placeholder="operator@example.com"
              aria-invalid={touched && Boolean(formatError)}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched(true)}
              onKeyDown={(e) => e.key === 'Enter' && void handleSubmit()}
            />
            <FieldError>{touched && formatError ? formatError : ''}</FieldError>
            <FieldDescription>
              초대 링크가 이 주소로 갑니다. 기관 도메인 밖의 주소도 초대할 수 있습니다.
            </FieldDescription>
          </Field>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button disabled={invite.isPending} onClick={() => void handleSubmit()}>
            초대 보내기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** 서버 문구를 그대로 띄우지 않는다 — 개발자용이고 백엔드가 문구만 고쳐도 화면이 바뀐다 */
function inviteErrorMessage(e: unknown): string {
  if (!isApiError(e)) return '초대하지 못했습니다. 잠시 후 다시 시도해 주세요.'
  switch (e.code) {
    case 'ALREADY_INVITED':
      // 스펙: "이미 등록되었거나 초대가 진행 중" — 둘을 구분할 수 없어 양쪽을 다 말한다
      return '이미 등록되었거나 초대가 진행 중인 이메일입니다.'
    case 'NOT_FOUND':
      // 스펙: "활성 기관이 아님(삭제·미존재)"
      return '활성 상태인 기관이 아닙니다. 목록에서 다시 들어와 주세요.'
    default:
      return '초대하지 못했습니다. 잠시 후 다시 시도해 주세요.'
  }
}
