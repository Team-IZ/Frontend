import { useState } from 'react'
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
import { isApiError } from '@/api/_contract'
import { useInviteManager } from '@/api/member/useMemberMutations'
import { useGetCurrentMember } from '@/api/member/useMemberQueries'
import { useCohortId } from '@/stores/cohortScope'
import RequiredMark from '../../_/components/RequiredMark'

/*
  매니저 초대 — **권한을 고르는 칸이 없다.**

  총괄/담당이 폐기되어 매니저가 한 종류뿐이고, 무엇을 볼 수 있는지는 **담당 반**이
  정한다(OP-06 §3 · 17번 6-3). 그래서 이 폼이 받는 것은 이메일과 담당 반 둘뿐이다.

  담당 반은 **선택**이다 — 사람을 먼저 뽑고 반을 나중에 정하는 순서가 실제로 있다.
  비워 두면 목록에 `미배정`으로 남고, 반 쪽에는 `담당 필요` 경고가 그대로 있다.

  **기관 도메인 제한은 없앴다(8/18 결정).** 교육생 명단과 달리 매니저는 재직 여부를
  도메인으로 가늠할 필요가 없다고 판단 — 어떤 주소든 초대할 수 있다. 서버가 그래도
  `DOMAIN_NOT_ALLOWED`를 돌려줄 가능성에 대비해 그 케이스의 에러 문구 분기만 남겨 둔다.
*/
type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function InviteManagerDialog({ open, onOpenChange }: Props) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: me } = useGetCurrentMember()
  const scope = useCohortId()
  const invite = useInviteManager()

  const organizationId = me?.organizationId

  /*
    **닫으면 비운다.** 성공했을 때만 비우고 있어서, 주소를 치다 취소하고 다시 열면
    그 값이 그대로 떠 있었다 — 오타를 고치려고 닫은 사람이 같은 오타를 다시 보낸다.
    초대는 이어 하는 작업이 아니다(명단 추가 모달과 같은 판단).
  */
  const close = (next: boolean) => {
    onOpenChange(next)
    if (!next) {
      setEmail('')
      setError(null)
    }
  }

  const submit = async () => {
    if (!organizationId) return
    setError(null)
    try {
      /*
        **`cohortId`를 같이 보낸다.** 목록이 기수로 걸러지므로(스위처 범위) 안 보내면
        방금 초대한 사람이 어느 기수에도 안 잡혀 목록에서 사라진다.
      */
      await invite.mutateAsync({
        path: { organizationId },
        body: { email: email.trim(), cohortId: scope.cohortId ?? null },
      })
      close(false) // 닫기가 비우는 일까지 한다 — 성공·취소가 같은 길로 나간다
    } catch (e) {
      const code = isApiError(e) ? e.code : undefined
      setError(
        code === 'DOMAIN_NOT_ALLOWED'
          ? '이 주소로는 초대할 수 없습니다.'
          : code === 'ALREADY_INVITED'
            ? '이미 초대한 주소입니다. 목록에서 재발송할 수 있습니다.'
            : '초대를 보내지 못했습니다. 이미 등록된 주소인지 확인해 주세요.',
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>
            매니저 초대
            {scope.current && (
              <span className="text-fg-subtle text-xs font-normal"> · {scope.current.name}</span>
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
              placeholder="name@company.com"
            />
            <FieldDescription>
              이 주소로 초대가 나가고, 받는 사람은 이름과 비밀번호만 정하면 됩니다.
            </FieldDescription>
          </Field>

          {/*
            **담당 반 칸이 없다**(기획 확인 · op-06-admin.md OP06-11).

            가입 전에는 로그인을 못 하므로 **그 반의 면담·독촉을 처리할 수 없다.** 그런데
            반에 담당 id는 박혀 있어서 `담당 없음` 경고에 안 잡혔다 — 경고가 막으려던
            상황(아무도 안 보는 반)을 초대 기능이 만들고 있었다.

            **없는 칸은 눈에 안 띄므로 왜 없는지를 폼 안에서 밝힌다** — 권한 칸을 설명한
            것과 같은 이유다. 안 그러면 "반은 어디서 정하지?"를 계속 찾는다.
          */}
          <FieldDescription>
            담당 반과 권한을 고르는 칸이 없습니다. 매니저는 한 종류뿐이고, 담당 반은 받는 사람이
            가입을 마친 뒤 매니저 목록에서 맡깁니다 — 가입 전에는 로그인을 못 해 그 반 학생의
            면담·독촉을 처리할 수 없기 때문입니다.
          </FieldDescription>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => close(false)} disabled={invite.isPending}>
            취소
          </Button>
          <Button
            disabled={invite.isPending || email.trim().length === 0 || !organizationId}
            onClick={() => void submit()}
          >
            {invite.isPending && <Spinner className="size-3.5" />}
            초대 발송
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
