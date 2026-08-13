import { useState } from 'react'
import { PlusIcon, TriangleAlertIcon, RotateCcwIcon } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { Spinner } from '@/components/ui/Spinner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/AlertDialog'
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

/** 정지·재활성 확인 모달이 대상으로 삼은 행 + 어느 상태로 바꿀지 */
type StatusConfirmTarget = { account: Account; status: 'ACTIVE' | 'INACTIVE' }

export default function SuperadminAccountsTab() {
  const [inviteOpen, setInviteOpen] = useState(false)
  /*
    팀장 지시(H6) — 설정 변경 액션은 전부 확인 모달을 한 번 거친다. 정지·재활성은
    이 화면에 딱 2곳뿐이라(D14 관례 — 세 번째 등장까지 공용 컴포넌트로 안 올린다) 각자
    `AlertDialog` 원시 컴포넌트를 인라인으로 쓴다(`ResultTab.tsx`가 같은 파일 안에서
    성격이 다른 확인 모달 2개를 이렇게 두는 것과 같은 방식). 정지/취소는 danger 톤,
    재활성은 중립 톤으로 나눈다.
  */
  const [confirmTarget, setConfirmTarget] = useState<StatusConfirmTarget | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)

  const { data, isPending, isError, refetch } = useFindSuperAdmins()
  const updateStatus = useUpdateSuperAdminStatus()
  /*
    "나" 배지를 위해 지금 로그인한 사람이 필요하다. 인증 도메인의 훅을 쓰면 레이어 린트에
    걸린다(features 간 교차 import 금지) — **생성된 `/me` 훅을 직접 쓴다.** 어차피 같은
    쿼리 키라 요청이 한 번 더 나가지 않는다.
  */
  const { data: me } = useGetCurrentMember()

  /** 성공하면 true — 확인 모달이 이 값으로 닫을지 말지(실패는 안 닫는다) 판단한다 */
  async function changeStatus(account: Account, status: 'ACTIVE' | 'INACTIVE') {
    try {
      await updateStatus.mutateAsync({ path: { memberId: account.memberId }, body: { status } })
      return true
    } catch (e) {
      setConfirmError(
        isApiError(e) && e.code === 'LAST_SUPER_ADMIN'
          ? '마지막 슈퍼어드민은 정지할 수 없습니다. 플랫폼에 들어갈 사람이 없어집니다.'
          : '상태를 바꾸지 못했습니다. 잠시 후 다시 시도해 주세요.',
      )
      return false
    }
  }

  async function handleConfirmStatusChange() {
    if (!confirmTarget) return
    setConfirmError(null)
    const ok = await changeStatus(confirmTarget.account, confirmTarget.status)
    // 실패하면 모달을 닫지 않는다 — 닫으면 목록이 그대로인 것을 보고 "안 눌렸나?" 하며
    // 다시 누르게 된다(ConfirmDialog.tsx와 같은 관례). 실패 문구는 모달 안에 남긴다.
    if (ok) setConfirmTarget(null)
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
                        onClick={() => setConfirmTarget({ account: a, status: 'ACTIVE' })}
                        className="text-primary text-xs font-semibold hover:underline disabled:opacity-50"
                      >
                        재활성
                      </button>
                    ) : (
                      /*
                        `deactivatable`이 false면 **버튼을 흐리게 두지 않고 이유를 말한다.**
                        제품 원칙이 흐린 버튼을 금지한다 — 왜 못 누르는지 알 수 없기 때문이다.

                        PENDING도 이 분기를 탄다(서버에 초대 취소 API가 없어 INACTIVE로
                        정지하는 것으로 대신한다 — 파일 머리말 참고). 동작은 같지만 아직
                        활성화도 안 한 초대에 "정지"라는 말은 어색해 문구만 "취소"로 바꾼다.

                        `isSelf`는 `deactivatable`과 별개 축이다 — 서버는 "마지막 활성인가"만
                        보고 "지금 로그인한 사람인가"는 안 본다(정책 확인 필요로 남겨뒀던
                        항목, 사용자 판단으로 프론트에서 막기로 함). 활성이 여럿이라
                        `deactivatable=true`여도 본인 행은 잠근다 — 두 이유가 겹치면 본인
                        쪽이 더 구체적인 사실이라 그 문구를 우선한다.
                      */
                      <button
                        type="button"
                        disabled={isSelf || !a.deactivatable || updateStatus.isPending}
                        title={
                          isSelf
                            ? '본인 계정은 정지할 수 없습니다'
                            : a.deactivatable
                              ? undefined
                              : '마지막 활성 슈퍼어드민은 정지할 수 없습니다'
                        }
                        onClick={() => setConfirmTarget({ account: a, status: 'INACTIVE' })}
                        className="text-danger text-xs font-semibold hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {a.status === 'PENDING' ? '취소' : '정지'}
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

      <AlertDialog
        open={confirmTarget !== null}
        onOpenChange={(open) => {
          if (!open && !updateStatus.isPending) {
            setConfirmTarget(null)
            setConfirmError(null)
          }
        }}
      >
        <AlertDialogContent>
          {confirmTarget &&
            (() => {
              const { account, status } = confirmTarget
              const displayName = account.name ?? account.email
              const isCancelInvite = status === 'INACTIVE' && account.status === 'PENDING'
              const isSuspend = status === 'INACTIVE' && !isCancelInvite
              const title = isCancelInvite
                ? '초대를 취소할까요?'
                : isSuspend
                  ? '계정을 정지할까요?'
                  : '계정을 다시 활성화할까요?'
              const description = isCancelInvite
                ? `${displayName}님의 초대를 취소합니다. 보낸 초대 링크가 더 이상 유효하지 않습니다.`
                : isSuspend
                  ? `${displayName}님을 정지하면 더 이상 로그인할 수 없습니다.`
                  : `${displayName}님이 다시 로그인할 수 있게 됩니다.`
              const confirmLabel = isCancelInvite ? '초대 취소' : isSuspend ? '정지' : '재활성화'
              const pendingLabel = isCancelInvite
                ? '취소하는 중…'
                : isSuspend
                  ? '정지하는 중…'
                  : '재활성화하는 중…'
              return (
                <>
                  <AlertDialogHeader>
                    <AlertDialogMedia
                      className={
                        isSuspend || isCancelInvite ? 'bg-danger-soft text-danger' : undefined
                      }
                    >
                      {isSuspend || isCancelInvite ? <TriangleAlertIcon /> : <RotateCcwIcon />}
                    </AlertDialogMedia>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {confirmError ? (
                        <span className="text-danger">{confirmError}</span>
                      ) : (
                        description
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={updateStatus.isPending}>취소</AlertDialogCancel>
                    <AlertDialogAction
                      variant={isSuspend || isCancelInvite ? 'danger' : 'primary'}
                      disabled={updateStatus.isPending}
                      onClick={handleConfirmStatusChange}
                    >
                      {updateStatus.isPending && <Spinner className="size-3.5" />}
                      {updateStatus.isPending ? pendingLabel : confirmLabel}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </>
              )
            })()}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
