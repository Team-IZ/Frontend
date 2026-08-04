import { useState } from 'react'
import { PlusIcon } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/Pagination'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog'
import { cancelSuperadminInvite, suspendSuperadmin, type SuperadminAccount } from '../mockData'
import SuperadminInviteDialog from './SuperadminInviteDialog'

/*
  SA-03 §3 "슈퍼어드민 계정" — 목록 · 초대 · 정지(재활성 없음, mockData.ts 파일
  머리말 판단 근거). 초대는 SA-02 오퍼레이터와 같이 INVITED로 시작해 실제 로그인
  전까지 활성으로 치지 않는다(mockData.ts 판단 근거) — 그래서 액션도 상태별로
  갈린다: ACTIVE는 정지, INVITED는 초대 취소(아직 아무도 아니라 "정지"가 성립하지
  않는다), SUSPENDED는 없음. 표는 SA-02 OperatorsTab의 bare Table 관례를 따르고,
  "마지막 슈퍼어드민 정지 차단"은 OperatorsTab의 LAST_OPERATOR 차단 모달과 같은
  구조(Dialog + 빨간 Alert, AlertDialog가 아닌 이유도 동일 — 닫기 ✕가 있어야 한다)를
  재사용한다. 와이어 #page-accounts의 하단 범위·페이지네이션도 그대로 둔다(SA-01
  목록과 같은 1쪽 고정 표기 — 실제 다중 페이지 로직은 아직 없다).
*/

export default function SuperadminAccountsTab({
  accounts,
  onChange,
}: {
  accounts: SuperadminAccount[]
  onChange: () => void
}) {
  const [inviteOpen, setInviteOpen] = useState(false)
  const [blocked, setBlocked] = useState<SuperadminAccount | null>(null)

  function handleSuspend(account: SuperadminAccount) {
    const result = suspendSuperadmin(account.id)
    if (!result.ok) {
      setBlocked(account)
      return
    }
    onChange()
  }

  function handleCancelInvite(account: SuperadminAccount) {
    cancelSuperadminInvite(account.id)
    onChange()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-fg-subtle text-xs font-semibold">
          슈퍼어드민 계정 · {accounts.length}명
        </p>
        <Button onClick={() => setInviteOpen(true)}>
          <PlusIcon /> 계정 초대
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-40">이름</TableHead>
            <TableHead className="w-52">이메일</TableHead>
            <TableHead className="w-28">상태</TableHead>
            <TableHead className="w-28">최근 로그인</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((a) => {
            const suspended = a.status === 'SUSPENDED'
            const invited = a.status === 'INVITED'
            return (
              <TableRow key={a.id} className={suspended ? 'opacity-60' : undefined}>
                <TableCell className={a.name ? 'font-bold' : 'text-fg-subtle font-normal'}>
                  <span className="flex items-center gap-1.5">
                    {a.name}
                    {a.isSelf && (
                      <Badge variant="neutral" className="text-[10px]">
                        나
                      </Badge>
                    )}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-xs">{a.email}</TableCell>
                <TableCell>
                  {suspended ? (
                    <Badge variant="neutral">정지</Badge>
                  ) : invited ? (
                    <Badge variant="warning">초대됨</Badge>
                  ) : (
                    <Badge variant="success">활성</Badge>
                  )}
                </TableCell>
                <TableCell className="text-fg-muted text-xs">
                  {a.lastLoginAt ?? (invited ? '대기 중' : '—')}
                </TableCell>
                <TableCell>
                  {a.status === 'ACTIVE' && (
                    <button
                      type="button"
                      onClick={() => handleSuspend(a)}
                      className="text-danger text-xs font-semibold hover:underline"
                    >
                      정지
                    </button>
                  )}
                  {invited && (
                    <button
                      type="button"
                      onClick={() => handleCancelInvite(a)}
                      className="text-danger text-xs font-semibold hover:underline"
                    >
                      초대 취소
                    </button>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <div className="grid grid-cols-3 items-center">
        <p className="text-fg-subtle text-xs">{`1–${accounts.length} / ${accounts.length}개`}</p>
        <div className="flex justify-center">
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationLink isActive aria-label="1쪽">
                  1
                </PaginationLink>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
        <div />
      </div>

      <SuperadminInviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvited={() => onChange()}
      />

      {/* 마지막 슈퍼어드민 정지 차단 — OperatorsTab의 LAST_OPERATOR 모달과 같은 구조.
          닫기 ✕가 필요해 AlertDialog가 아니라 Dialog를 쓴다. */}
      <Dialog open={blocked !== null} onOpenChange={(v) => !v && setBlocked(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>정지할 수 없습니다</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <Alert variant="danger">
              <AlertTitle>마지막 슈퍼어드민 계정입니다</AlertTitle>
              <AlertDescription>
                정지하면 플랫폼 콘솔에 들어갈 수 있는 사람이 아무도 없어집니다. 풀어 줄 상위 권한이
                없어 되돌릴 방법도 없습니다.
              </AlertDescription>
            </Alert>
            <p className="text-fg-subtle text-xs">
              새 슈퍼어드민을 먼저 초대한 뒤에 정지할 수 있습니다
            </p>
          </div>

          <DialogFooter className="-mx-4 -mb-4 mt-0">
            <Button type="button" variant="ghost" onClick={() => setBlocked(null)}>
              닫기
            </Button>
            <Button
              type="button"
              onClick={() => {
                setBlocked(null)
                setInviteOpen(true)
              }}
            >
              계정 초대
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
