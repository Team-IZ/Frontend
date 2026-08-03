import { useState, type ReactNode } from 'react'
import { PlusIcon, TriangleAlertIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog'
import { cn } from '@/lib/utils/cn'
import {
  cancelInvite,
  reactivateOperator,
  resendInvite,
  suspendOperator,
  type Operator,
  type Org,
  type OrgDetail,
} from '../../mockData'
import OperatorInviteDialog from './OperatorInviteDialog'

/*
  SA-02 §3 "오퍼레이터 탭" — 계정 관리이지 매니저 관리가 아니다(반 담당 매니저는
  오퍼레이터가 기관 안에서 초대한다). 정지 액션은 항상 눌릴 수 있게 두고, 그게
  마지막 활성 오퍼레이터일 때만 suspendOperator가 LAST_OPERATOR를 돌려줘서
  차단 모달(N2)을 띄운다 — 미리 버튼을 숨기면 "왜 안 눌리지"를 설명할 곳이 없다.
*/

function ActionLink({
  onClick,
  tone = 'neutral',
  children,
  disabled,
}: {
  onClick: () => void
  tone?: 'neutral' | 'danger' | 'primary'
  children: ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'text-xs font-semibold hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline',
        tone === 'danger' && 'text-danger',
        tone === 'primary' && 'text-primary',
        tone === 'neutral' && 'text-fg-muted',
      )}
    >
      {children}
    </button>
  )
}

function OperatorStatusBadge({ status }: { status: Operator['status'] }) {
  switch (status) {
    case 'ACTIVE':
      return <Badge variant="success">활성</Badge>
    case 'INVITED':
      return <Badge variant="warning">초대됨</Badge>
    case 'MAIL_FAILED':
      return <Badge variant="warning">메일 발송 실패</Badge>
    case 'SUSPENDED':
      return <Badge variant="neutral">정지</Badge>
  }
}

export default function OperatorsTab({
  org,
  detail,
  onChange,
}: {
  org: Org
  detail: OrgDetail
  onChange: () => void
}) {
  const [inviteOpen, setInviteOpen] = useState(false)
  const [blockedOperator, setBlockedOperator] = useState<Operator | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  async function handleSuspend(op: Operator) {
    const result = suspendOperator(org.id, op.id)
    if (!result.ok) {
      setBlockedOperator(op)
      return
    }
    onChange()
  }

  function handleReactivate(op: Operator) {
    reactivateOperator(org.id, op.id)
    onChange()
  }

  async function handleResend(op: Operator) {
    setPendingId(op.id)
    try {
      await resendInvite(org.id, op.id)
      onChange()
    } finally {
      setPendingId(null)
    }
  }

  function handleCancel(op: Operator) {
    cancelInvite(org.id, op.id)
    onChange()
  }

  const hasMailFailure = detail.operators.some((o) => o.status === 'MAIL_FAILED')

  return (
    <div className="flex flex-col gap-4">
      {hasMailFailure && (
        <Alert variant="warning">
          <TriangleAlertIcon />
          <AlertTitle>오퍼레이터로 지정됐지만 초대 메일이 나가지 않았습니다</AlertTitle>
          <AlertDescription>
            계정 자리는 만들어졌고 링크만 실패했습니다. 재발송해 주세요.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <p className="text-fg-subtle text-xs font-semibold">
          이 기관의 오퍼레이터 계정 · {detail.operators.length}명
        </p>
        <Button onClick={() => setInviteOpen(true)}>
          <PlusIcon /> 오퍼레이터 초대
        </Button>
      </div>

      {detail.operators.length === 0 ? (
        <p className="text-fg-subtle rounded-md border border-dashed border-border-strong bg-surface-2 p-8 text-center text-sm">
          아직 오퍼레이터가 없습니다. 첫 오퍼레이터를 초대해 이 기관을 시작하세요.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-32">이름</TableHead>
              <TableHead className="w-52">이메일</TableHead>
              <TableHead className="w-32">상태</TableHead>
              <TableHead className="w-28">초대일</TableHead>
              <TableHead className="w-28">최근 로그인</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {detail.operators.map((op) => {
              const suspended = op.status === 'SUSPENDED'
              const mailFailed = op.status === 'MAIL_FAILED'
              return (
                <TableRow
                  key={op.id}
                  className={cn(suspended && 'opacity-60', mailFailed && 'bg-warning-soft')}
                >
                  <TableCell className={cn('font-bold', !op.name && 'text-fg-subtle font-normal')}>
                    {op.name ?? '—'}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{op.email}</TableCell>
                  <TableCell>
                    <OperatorStatusBadge status={op.status} />
                  </TableCell>
                  <TableCell className="text-fg-muted text-xs">{op.invitedAt}</TableCell>
                  <TableCell className="text-fg-muted text-xs">
                    {op.lastLoginAt ?? (op.status === 'INVITED' || mailFailed ? '대기 중' : '—')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {op.status === 'ACTIVE' && (
                        <ActionLink tone="danger" onClick={() => handleSuspend(op)}>
                          정지
                        </ActionLink>
                      )}
                      {(op.status === 'INVITED' || mailFailed) && (
                        <>
                          <ActionLink
                            tone="primary"
                            disabled={pendingId === op.id}
                            onClick={() => handleResend(op)}
                          >
                            재발송
                          </ActionLink>
                          <ActionLink tone="danger" onClick={() => handleCancel(op)}>
                            취소
                          </ActionLink>
                        </>
                      )}
                      {suspended && (
                        <ActionLink tone="primary" onClick={() => handleReactivate(op)}>
                          재활성
                        </ActionLink>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      <OperatorInviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        org={org}
        existing={detail.operators}
        onInvited={() => onChange()}
      />

      {/* N2 — 마지막 활성 오퍼레이터 정지 차단. 정의서 §6 "고아 기관 방지".
          와이어 `.warnbox`(빨간 상자) + `.fhint`(상자 밖 잔글씨) 구조를 그대로 따른다 —
          Dialog를 쓰는 이유는 AlertDialog엔 닫기 ✕가 없어서다(닫기 버튼이 이미 있어도
          모달 우상단에 ✕가 있는 게 이 팀 모달의 기본형, DialogContent가 기본 제공한다). */}
      <Dialog open={blockedOperator !== null} onOpenChange={(v) => !v && setBlockedOperator(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>정지할 수 없습니다</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <Alert variant="danger">
              <AlertTitle>이 기관의 마지막 오퍼레이터입니다</AlertTitle>
              <AlertDescription>
                정지하면 기관에 들어갈 수 있는 사람이 아무도 없어지고, 기수·명단·매니저를 손댈
                방법이 사라집니다.
              </AlertDescription>
            </Alert>
            <p className="text-fg-subtle text-xs">
              새 오퍼레이터를 먼저 초대한 뒤에 정지할 수 있습니다
            </p>
          </div>

          <DialogFooter className="-mx-4 -mb-4 mt-0">
            <Button type="button" variant="ghost" onClick={() => setBlockedOperator(null)}>
              닫기
            </Button>
            <Button
              type="button"
              onClick={() => {
                setBlockedOperator(null)
                setInviteOpen(true)
              }}
            >
              오퍼레이터 초대
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
