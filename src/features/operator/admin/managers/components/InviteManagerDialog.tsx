import { useCallback, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Alert, AlertTitle } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Field, FieldLabel, FieldDescription } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { useAsync } from '@/lib/useAsync'
import { getOrg, inviteManager, listClasses } from '../../_/api/api'
import { checkEmail } from '../../_/rules'
import { COHORT_ID } from '../../_/cohortScope'
import { FilterSelect } from '../../_/components/AdminFilters'
import { ALL } from '../../_/filterState'
import RequiredMark from '../../_/components/RequiredMark'

/*
  매니저 초대 — **권한을 고르는 칸이 없다.**

  총괄/담당이 폐기되어 매니저가 한 종류뿐이고, 무엇을 볼 수 있는지는 **담당 반**이
  정한다(OP-06 §3 · 17번 6-3). 그래서 이 폼이 받는 것은 이메일과 담당 반 둘뿐이다.

  담당 반은 **선택**이다 — 사람을 먼저 뽑고 반을 나중에 정하는 순서가 실제로 있다.
  비워 두면 목록에 `미배정`으로 남고, 반 쪽에는 `담당 필요` 경고가 그대로 있다.

  **도메인 밖 주소는 `저장 실패`가 아니라 다른 문구로 답한다** — 재시도해도 안 되는
  일이라 "다시 시도"를 권하면 거짓말이 된다(케이스 표 `DOMAIN_NOT_ALLOWED`).
*/
type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onInvited: () => void
}

export default function InviteManagerDialog({ open, onOpenChange, onInvited }: Props) {
  const [email, setEmail] = useState('')
  const [classId, setClassId] = useState(ALL)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadOrg = useCallback(() => getOrg(), [])
  const loadClasses = useCallback(() => listClasses(COHORT_ID), [])
  const org = useAsync(loadOrg, open)
  const classes = useAsync(loadClasses, open)

  const domain = org.data?.domain
  /** `@`를 치기 전에는 판정하지 않는다 — 다 치기 전에 붉어지면 타이핑을 방해한다 */
  const domainProblem =
    domain !== undefined &&
    email.includes('@') &&
    checkEmail(email.trim(), domain) === 'DOMAIN_NOT_ALLOWED'

  const options = [
    { value: ALL, label: '나중에 배정' },
    ...(classes.data ?? []).map((c) => ({
      value: c.id,
      label: `${c.name}${c.managerName ? ` · ${c.managerName} 교체` : ''}`,
    })),
  ]

  const submit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await inviteManager({ email: email.trim(), classId: classId === ALL ? null : classId })
      onInvited()
      onOpenChange(false)
      setEmail('')
      setClassId(ALL)
    } catch (e) {
      const code = (e as { code?: string })?.code
      setError(
        code === 'DOMAIN_NOT_ALLOWED'
          ? `${domain ?? '기관'} 주소로만 초대할 수 있습니다.`
          : '초대를 보내지 못했습니다. 이미 등록된 주소인지 확인해 주세요.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>
            매니저 초대
            {org.data && (
              <span className="text-fg-subtle text-xs font-normal"> · {org.data.name}</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {error && (
            <Alert variant="danger">
              <AlertTitle>{error}</AlertTitle>
            </Alert>
          )}

          <Field>
            <FieldLabel htmlFor="mgr-email">
              이메일 <RequiredMark />
            </FieldLabel>
            <Input
              id="mgr-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={domain ? `name@${domain}` : ''}
              aria-invalid={domainProblem || undefined}
            />
            <FieldDescription>
              {domainProblem ? (
                <span className="text-danger">{domain} 주소만 초대할 수 있습니다.</span>
              ) : (
                '이 주소로 초대가 나가고, 받는 사람은 이름과 비밀번호만 정하면 됩니다.'
              )}
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel>
              담당 반 <span className="text-fg-subtle text-xs font-normal">· 선택</span>
            </FieldLabel>
            <FilterSelect
              label="7기"
              value={classId}
              options={options}
              onChange={setClassId}
              className="w-full"
            />
            {/*
              권한 칸이 없는 이유를 **폼 안에서 밝힌다.** 없는 것은 눈에 안 띄어서,
              쓰는 사람이 "권한은 어디서 주지?"를 계속 찾게 된다.
            */}
            <FieldDescription>
              권한을 고르는 칸이 없습니다 — 매니저는 한 종류뿐이고, 무엇을 볼 수 있는지는 담당 반이
              정합니다.
            </FieldDescription>
          </Field>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            취소
          </Button>
          <Button
            disabled={submitting || email.trim().length === 0 || domainProblem}
            onClick={submit}
          >
            {submitting && <Spinner className="size-3.5" />}
            초대 발송
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
