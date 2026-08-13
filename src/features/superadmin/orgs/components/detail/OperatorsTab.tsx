import { useState, type ReactNode } from 'react'
import { PlusIcon, TriangleAlertIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table'
import { cn } from '@/lib/utils/cn'
import { useFindOperators } from '@/api/organization/useOrganizationQueries'
import {
  useCancelInvitation,
  useResendOperatorInvitation,
  useUpdateOperatorStatus,
} from '@/api/organization/useOrganizationMutations'
import { isApiError } from '@/api/_contract'
import type {
  findOperators_Item,
  findOrganization_Response,
} from '@/api/organization/organizationTypes'
import { formatDate, formatDateTime, isDeletionLocked } from '../../labels'
import OperatorInviteDialog from './OperatorInviteDialog'

/*
  SA-02 ② 오퍼레이터 — 계정 관리이지 매니저 관리가 아니다(반 담당 매니저는 오퍼레이터가
  기관 안에서 초대한다).

  ## 버튼 노출을 서버 값으로 판정한다
  | 서버 값 | 목일 때 화면이 하던 것 |
  |---|---|
  | `suspendable` | **마지막 활성인지 화면이 셌다.** 규칙이 바뀌면 조용히 틀린다 |
  | `pendingInvitationTokenId` | `status === 'INVITED'`로 유추 |
  | `invitationDeliveryFailed` | `MAIL_FAILED`라는 **없는 상태값을 지어냈다** |

  메일 실패는 **상태가 아니라 플래그**다. `PENDING`이면서 실패한 것이라 배지와 따로 다룬다.

  ## 정지 버튼은 잠그되 이유를 말한다
  `suspendable === false`면 흐리게 두고 `title`로 사유를 준다 — 제품 원칙이 이유 없는 흐린
  버튼을 금지한다. 그래도 **서버가 거절할 수 있다**(목록을 받은 뒤 남이 정지시킨 경우).
  그때는 `LAST_OPERATOR`를 문장으로 바꿔 띄운다. 앞은 평소를 위한 것이고 뒤는 어긋난 순간을 위한 것이다.
*/

type Org = findOrganization_Response
type Operator = findOperators_Item

function ActionLink({
  onClick,
  tone = 'neutral',
  children,
  disabled,
  title,
}: {
  onClick: () => void
  tone?: 'neutral' | 'danger' | 'primary'
  children: ReactNode
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'text-xs font-semibold hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50',
        tone === 'danger' && 'text-danger',
        tone === 'primary' && 'text-primary',
        tone === 'neutral' && 'text-fg-muted',
      )}
    >
      {children}
    </button>
  )
}

/** 메일 실패는 여기 없다 — 상태가 아니라 플래그라 `PENDING` 안에서 갈린다 */
function OperatorStatusBadge({ op }: { op: Operator }) {
  switch (op.status) {
    case 'ACTIVE':
      return <Badge variant="success">활성</Badge>
    case 'INACTIVE':
      return <Badge variant="neutral">정지</Badge>
    case 'PENDING':
      return op.invitationDeliveryFailed ? (
        <Badge variant="warning">메일 발송 실패</Badge>
      ) : (
        <Badge variant="warning">초대됨</Badge>
      )
    default:
      // 스펙에 없는 값이 오면 원문 그대로 — 빈칸은 "데이터 없음"으로 읽힌다
      return <Badge variant="neutral">{op.status}</Badge>
  }
}

/** J6(정책) — 삭제 대기 중엔 이 문구가 다른 잠금 사유보다 우선한다 */
const DELETION_LOCKED_TITLE = '삭제 대기 상태인 기관은 오퍼레이터를 관리할 수 없습니다.'

export default function OperatorsTab({ org }: { org: Org }) {
  const organizationId = org.organizationId
  const locked = isDeletionLocked(org.status)
  const { data, isPending, isError, refetch } = useFindOperators({ path: { organizationId } })
  const [inviteOpen, setInviteOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateStatus = useUpdateOperatorStatus()
  const resend = useResendOperatorInvitation()
  const cancel = useCancelInvitation()
  const busy = updateStatus.isPending || resend.isPending || cancel.isPending

  async function run(action: () => Promise<unknown>, fallback: string) {
    setError(null)
    try {
      await action()
    } catch (e) {
      setError(
        isApiError(e) && e.code === 'LAST_OPERATOR'
          ? '이 기관의 마지막 오퍼레이터라 정지할 수 없습니다. 새 오퍼레이터를 먼저 초대하세요.'
          : fallback,
      )
    }
  }

  if (isError) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>오퍼레이터를 불러오지 못했습니다</EmptyTitle>
          <EmptyDescription>잠시 후 다시 시도해 주세요.</EmptyDescription>
        </EmptyHeader>
        <Button variant="ghost" onClick={() => refetch()}>
          다시 시도
        </Button>
      </Empty>
    )
  }

  const operators = data?.content ?? []
  const hasMailFailure = operators.some((o) => o.invitationDeliveryFailed)

  return (
    <div className="flex flex-col gap-4">
      {error && <Alert variant="danger">{error}</Alert>}

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
          {data
            ? `이 기관의 오퍼레이터 계정 · ${operators.length}명 (활성 ${data.activeCount})`
            : ' '}
        </p>
        <Button
          disabled={locked}
          title={locked ? DELETION_LOCKED_TITLE : undefined}
          onClick={() => setInviteOpen(true)}
        >
          <PlusIcon /> 오퍼레이터 초대
        </Button>
      </div>

      {isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : operators.length === 0 ? (
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
              <TableHead className="w-36">최근 로그인</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {operators.map((op) => {
              const inactive = op.status === 'INACTIVE'
              // 대기 중인 초대가 있어야 재발송·취소가 된다. 상태로 유추하지 않는다
              const tokenId = op.pendingInvitationTokenId
              return (
                <TableRow
                  key={op.memberId}
                  className={cn(
                    inactive && 'opacity-60',
                    op.invitationDeliveryFailed && 'bg-warning-soft',
                  )}
                >
                  <TableCell className={cn('font-bold', !op.name && 'text-fg-subtle font-normal')}>
                    {/* 초대만 되고 가입 전이면 이름이 없다(서버 null) */}
                    {op.name ?? '—'}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{op.email}</TableCell>
                  <TableCell>
                    <OperatorStatusBadge op={op} />
                  </TableCell>
                  <TableCell className="text-fg-muted text-xs">
                    {op.invitedAt ? formatDate(op.invitedAt) : '—'}
                  </TableCell>
                  <TableCell className="text-fg-muted text-xs">
                    {op.lastLoginAt ? formatDateTime(op.lastLoginAt) : tokenId ? '대기 중' : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {op.status === 'ACTIVE' && (
                        <ActionLink
                          tone="danger"
                          disabled={locked || !op.suspendable || busy}
                          title={
                            locked
                              ? DELETION_LOCKED_TITLE
                              : op.suspendable
                                ? undefined
                                : '이 기관의 마지막 활성 오퍼레이터는 정지할 수 없습니다'
                          }
                          onClick={() =>
                            void run(
                              () =>
                                updateStatus.mutateAsync({
                                  path: { organizationId, memberId: op.memberId },
                                  body: { status: 'INACTIVE' },
                                }),
                              '정지하지 못했습니다. 잠시 후 다시 시도해 주세요.',
                            )
                          }
                        >
                          정지
                        </ActionLink>
                      )}

                      {inactive && (
                        <ActionLink
                          tone="primary"
                          disabled={locked || busy}
                          title={locked ? DELETION_LOCKED_TITLE : undefined}
                          onClick={() =>
                            void run(
                              () =>
                                updateStatus.mutateAsync({
                                  path: { organizationId, memberId: op.memberId },
                                  body: { status: 'ACTIVE' },
                                }),
                              '재활성하지 못했습니다. 잠시 후 다시 시도해 주세요.',
                            )
                          }
                        >
                          재활성
                        </ActionLink>
                      )}

                      {tokenId && (
                        <>
                          <ActionLink
                            tone="primary"
                            disabled={locked || busy}
                            title={locked ? DELETION_LOCKED_TITLE : undefined}
                            onClick={() =>
                              void run(
                                () => resend.mutateAsync({ path: { organizationId, tokenId } }),
                                '재발송하지 못했습니다. 잠시 후 다시 시도해 주세요.',
                              )
                            }
                          >
                            재발송
                          </ActionLink>
                          <ActionLink
                            tone="danger"
                            disabled={locked || busy}
                            title={locked ? DELETION_LOCKED_TITLE : undefined}
                            onClick={() =>
                              void run(
                                () => cancel.mutateAsync({ path: { organizationId, tokenId } }),
                                '취소하지 못했습니다. 잠시 후 다시 시도해 주세요.',
                              )
                            }
                          >
                            취소
                          </ActionLink>
                        </>
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
        organizationId={organizationId}
      />
    </div>
  )
}
