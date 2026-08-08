import { useState } from 'react'
import { PlusIcon } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { Alert } from '@/components/ui/Alert'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table'
import { useFindSuperAdmins } from '@/api/platform/usePlatformQueries'
import { useUpdateSuperAdminStatus } from '@/api/platform/usePlatformMutations'
import type { findSuperAdmins_Item } from '@/api/platform/platformTypes'
import { isApiError } from '@/api/_contract'
import { useGetCurrentMember } from '@/api/member/useMemberQueries'
import { ACCOUNT_STATUS_LABEL, ACCOUNT_STATUS_VARIANT, formatDate, formatDateTime } from '../labels'
import SuperadminInviteDialog from './SuperadminInviteDialog'

/*
  SA-03 §3 "슈퍼어드민 계정" — 목록 · 초대 · 정지/재활성.

  ## 서버가 판정하는 것 둘
  | | |
  |---|---|
  | `deactivatable` | 이 계정을 정지할 수 있나. **활성이 1명뿐이면 false** — 화면이 `activeCount === 1`로 유추하지 않는다 |
  | `activeCount` | 활성 슈퍼어드민 수 |

  ## ⚠️ 초대 취소가 서버에 없다
  목에는 `cancelSuperadminInvite`가 있었지만 **API가 없다.** 대신 `PENDING` 계정도
  `INACTIVE`로 정지할 수 있어 "들어오지 못하게" 하는 것은 된다. 목록에서 지우는 기능은
  백엔드에 요청해 두었고, 그전까지는 정지로 대신한다 — **없는 기능을 버튼으로 만들지 않는다.**
*/

type Account = findSuperAdmins_Item

export default function SuperadminAccountsTab() {
  const [inviteOpen, setInviteOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data, isPending, isError, refetch } = useFindSuperAdmins()
  const updateStatus = useUpdateSuperAdminStatus()
  /*
    "나" 배지를 위해 지금 로그인한 사람이 필요하다. 인증 도메인의 훅을 쓰면 레이어 린트에
    걸린다(features 간 교차 import 금지) — **생성된 `/me` 훅을 직접 쓴다.** 어차피 같은
    쿼리 키라 요청이 한 번 더 나가지 않는다.
  */
  const { data: me } = useGetCurrentMember()

  async function changeStatus(account: Account, status: 'ACTIVE' | 'INACTIVE') {
    setError(null)
    try {
      await updateStatus.mutateAsync({ path: { memberId: account.memberId }, body: { status } })
    } catch (e) {
      setError(
        isApiError(e) && e.code === 'LAST_SUPER_ADMIN'
          ? '마지막 슈퍼어드민은 정지할 수 없습니다. 플랫폼에 들어갈 사람이 없어집니다.'
          : '상태를 바꾸지 못했습니다. 잠시 후 다시 시도해 주세요.',
      )
    }
  }

  if (isError) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>계정 목록을 불러오지 못했습니다</EmptyTitle>
          <EmptyDescription>잠시 후 다시 시도해 주세요.</EmptyDescription>
        </EmptyHeader>
        <Button variant="ghost" onClick={() => refetch()}>
          다시 시도
        </Button>
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <Alert variant="danger">{error}</Alert>}

      <div className="flex items-center justify-between">
        <p className="text-fg-subtle text-xs font-semibold">
          {data ? `슈퍼어드민 계정 · ${data.content.length}명 (활성 ${data.activeCount})` : ' '}
        </p>
        <Button onClick={() => setInviteOpen(true)}>
          <PlusIcon /> 계정 초대
        </Button>
      </div>

      {isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-40">이름</TableHead>
              <TableHead className="w-56">이메일</TableHead>
              <TableHead className="w-24">상태</TableHead>
              <TableHead className="w-36">최근 로그인</TableHead>
              <TableHead className="w-28">등록일</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.content.map((a) => {
              const inactive = a.status === 'INACTIVE'
              // 서버는 "나"를 표시해 주지 않는다 — 지금 로그인한 사람과 대조한다
              const isSelf = me?.memberId === a.memberId
              return (
                <TableRow key={a.memberId} className={inactive ? 'opacity-60' : undefined}>
                  <TableCell className={a.name ? 'font-bold' : 'text-fg-subtle font-normal'}>
                    <span className="flex items-center gap-1.5">
                      {/* 초대만 되고 활성화 전이면 이름이 없다(서버 null) */}
                      {a.name ?? '—'}
                      {isSelf && (
                        <Badge variant="neutral" className="text-[10px]">
                          나
                        </Badge>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">{a.email}</TableCell>
                  <TableCell>
                    <Badge variant={ACCOUNT_STATUS_VARIANT[a.status]}>
                      {ACCOUNT_STATUS_LABEL[a.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-fg-muted text-xs">
                    {formatDateTime(a.lastLoginAt)}
                  </TableCell>
                  <TableCell className="text-fg-muted text-xs">{formatDate(a.createdAt)}</TableCell>
                  <TableCell>
                    {inactive ? (
                      <button
                        type="button"
                        disabled={updateStatus.isPending}
                        onClick={() => changeStatus(a, 'ACTIVE')}
                        className="text-primary text-xs font-semibold hover:underline disabled:opacity-50"
                      >
                        재활성
                      </button>
                    ) : (
                      /*
                        `deactivatable`이 false면 **버튼을 흐리게 두지 않고 이유를 말한다.**
                        제품 원칙이 흐린 버튼을 금지한다 — 왜 못 누르는지 알 수 없기 때문이다.
                      */
                      <button
                        type="button"
                        disabled={!a.deactivatable || updateStatus.isPending}
                        title={
                          a.deactivatable
                            ? undefined
                            : '마지막 활성 슈퍼어드민은 정지할 수 없습니다'
                        }
                        onClick={() => changeStatus(a, 'INACTIVE')}
                        className="text-danger text-xs font-semibold hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        정지
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      <SuperadminInviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  )
}
