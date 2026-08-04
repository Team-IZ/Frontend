import { useCallback, useState } from 'react'
import { TriangleAlertIcon } from 'lucide-react'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table'
import { useAsync } from '@/lib/useAsync'
import { useDebounced } from '@/lib/useDebounced'
import {
  cancelManagerInvite,
  getNow,
  listCohorts,
  listManagers,
  resendManagerInvite,
  setManagerStatus,
} from '../_/api/api'
import { MANAGER_STATUS_LABEL } from '../_/labels'
import { formatLastSeen } from '../_/rules'
import type { Manager, ManagerStatus } from '../_/api/types'
import SectionHeader from '../_/components/SectionHeader'
import TableFooterBar from '../_/components/TableFooterBar'
import ResultBanner from '../_/components/ResultBanner'
import { useActionResult } from '../_/actionResult'
import { Loading, LoadFailed } from '../_/components/AsyncState'
import { ManagerStatusBadge } from '../_/components/StatusBadges'
import { FilterSelect, SearchBox } from '../_/components/AdminFilters'
import { ALL, asQuery, withAll } from '../_/filterState'
import InviteManagerDialog from './components/InviteManagerDialog'
import AssignManagerDialog from '../_/components/AssignManagerDialog'
import ConfirmDialog from '../_/components/ConfirmDialog'

/*
  ③ 매니저 — **계정 관리가 아니라 담당 배정이다.**

  범위가 **기관 전체**다. 매니저는 기수를 옮겨 다니므로 상단 스위처로 걸러 버리면 지난
  기수 담당이 화면에서 사라진다 — 기수 필터를 두되 기본은 전체다.

  **퇴사한 매니저를 지우지 않고 정지로 남긴다.** 담당 반 배정이 기간형 이력이라 지우면
  지난 기수의 기록이 끊긴다(OP-06 §3).

  **오퍼레이터 계정은 여기 없다** — 초대·정지는 슈퍼어드민(SA-02) 소관이다.
*/
type Props = {
  onCountsChange: () => void
}

type Pending = { kind: 'suspend'; manager: Manager } | { kind: 'cancel'; manager: Manager } | null

export default function ManagersTab({ onCountsChange }: Props) {
  const [search, setSearch] = useState('')
  /*
    **입력값과 조회값을 가른다.** 입력칸은 `search`(즉시 반응), 조회는 `query`(멈춘 뒤).
    안 가르면 한 글자마다 요청이 나가고, 입력칸이 `query`를 보면 타이핑이 끊긴다.
  */
  const query = useDebounced(search)
  const [cohortId, setCohortId] = useState(ALL)
  const [status, setStatus] = useState(ALL)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [assigning, setAssigning] = useState<Manager | null>(null)
  const [pending, setPending] = useState<Pending>(null)
  /** 행 액션 결과 — 성공·실패가 같은 배너 자리를 쓴다 */
  const action = useActionResult()

  const load = useCallback(
    () =>
      listManagers({
        search: query || undefined,
        cohortId: asQuery(cohortId),
        status: asQuery<ManagerStatus>(status),
      }),
    [query, cohortId, status],
  )
  const loadCohorts = useCallback(() => listCohorts(), [])
  const page = useAsync(load)
  const cohorts = useAsync(loadCohorts)

  const now = getNow()
  const counts = page.data?.counts
  const totalAll = counts ? counts.ACTIVE + counts.INVITED + counts.SUSPENDED : 0
  const narrowed = query.trim().length > 0 || cohortId !== ALL || status !== ALL

  const refresh = () => {
    page.reload()
    onCountsChange()
  }

  const cohortOptions = [
    { value: ALL, label: '전체' },
    ...(cohorts.data?.items ?? []).map((c) => ({ value: c.id, label: c.name })),
  ]

  return (
    <>
      {/*
        담당 없는 반 경고. **목록 위에 둔다** — 행 하나의 문제가 아니라 조직의 문제라
        필터를 걸어도 사라지지 않아야 한다. OP-01 `조치 필요`의 `미배정`과 같은 신호이고,
        그래서 여기 문구가 그 화면과 같은 것을 가리킨다(D1).
      */}
      {page.data && page.data.unstaffedClasses.length > 0 && (
        <Alert variant="warning" className="mb-4">
          <TriangleAlertIcon />
          <AlertTitle>{page.data.unstaffedClasses.join(' · ')}에 담당 매니저가 없습니다</AlertTitle>
          <AlertDescription>
            담당이 없으면 그 반 학생의 면담·독촉을 아무도 처리하지 않습니다. 대시보드의 조치
            필요에도 같은 신호가 올라옵니다.
          </AlertDescription>
        </Alert>
      )}

      {action.result && (
        <ResultBanner
          failed={action.result.failed}
          onRetry={action.result.retry}
          onDismiss={action.dismiss}
        >
          {action.result.text}
        </ResultBanner>
      )}

      <SectionHeader
        title="매니저"
        count={counts ? `${totalAll}명` : undefined}
        breakdown={
          counts && (
            <>
              기관 전체 · 활성 <b className="text-fg-muted font-semibold">{counts.ACTIVE}</b> · 초대
              대기 {counts.INVITED} · 정지 {counts.SUSPENDED}
            </>
          )
        }
        action={<Button onClick={() => setInviteOpen(true)}>+ 매니저 초대</Button>}
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="이름 · 이메일 검색"
          label="매니저 검색"
        />
        <FilterSelect
          label="기수"
          value={cohortId}
          options={cohortOptions}
          onChange={setCohortId}
        />
        <FilterSelect
          label="상태"
          value={status}
          options={withAll(MANAGER_STATUS_LABEL)}
          onChange={setStatus}
        />
      </div>

      {page.loading ? (
        <Loading label="매니저를 불러오는 중" />
      ) : page.failed ? (
        <LoadFailed label="매니저를 불러오지 못했습니다" onRetry={page.reload} />
      ) : page.data?.items.length === 0 ? (
        narrowed ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>
                {query ? `"${query}"와 맞는 매니저가 없습니다` : '조건에 맞는 매니저가 없습니다'}
              </EmptyTitle>
              <EmptyDescription>전체 {totalAll}명에서 찾았습니다.</EmptyDescription>
            </EmptyHeader>
            <Button
              variant="ghost"
              onClick={() => {
                setSearch('')
                setCohortId(ALL)
                setStatus(ALL)
              }}
            >
              필터 해제
            </Button>
          </Empty>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>아직 매니저가 없습니다</EmptyTitle>
              <EmptyDescription>
                초대하면 담당 반을 맡길 수 있습니다. 반이 담당 없이 시작되면 그 반 면담을 아무도
                처리하지 않습니다.
              </EmptyDescription>
            </EmptyHeader>
            <Button onClick={() => setInviteOpen(true)}>+ 매니저 초대</Button>
          </Empty>
        )
      ) : (
        page.data && (
          <>
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {/*
                    **한 칸에 두 값을 쌓지 않는다**(E11). 이메일을 이름 밑에, 정지 사유를
                    상태 밑에 붙였더니 그 행만 두 줄이 되어 표가 들쭉날쭉했다(실측 57 ↔ 60px).
                    둘 다 제 열로 뺀다 — 명단 탭과 같은 판단이다(D29·D32).
                  */}
                  <TableHead className="w-28">매니저</TableHead>
                  <TableHead className="w-52">이메일</TableHead>
                  <TableHead className="w-40">담당 반</TableHead>
                  <TableHead className="w-24 text-right">담당 인원</TableHead>
                  <TableHead className="w-24">상태</TableHead>
                  <TableHead className="w-32">최근 접속</TableHead>
                  <TableHead className="w-40">비고</TableHead>
                  {/* 마지막 열(액션)이 남는 폭을 흡수한다 */}
                  <TableHead className="text-right">
                    <span className="sr-only">액션</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.data.items.map((m) => (
                  <TableRow key={m.id}>
                    {/* 가입 전이면 이름이 없다 — `—`가 아니라 무엇을 기다리는지 쓴다(F3) */}
                    <TableCell className="font-semibold">{m.name ?? '가입 대기'}</TableCell>
                    <TableCell className="text-fg-muted truncate text-xs">{m.email}</TableCell>
                    <TableCell className="text-fg-muted text-xs">
                      {m.assignment
                        ? `${m.assignment.cohortName} · ${m.assignment.classNames.join(', ')}`
                        : '미배정'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{m.headcount ?? '—'}</TableCell>
                    <TableCell>
                      <ManagerStatusBadge status={m.status} />
                    </TableCell>
                    <TableCell className="text-fg-muted text-xs">
                      {formatLastSeen(m.lastSeenAt, now) ?? '—'}
                    </TableCell>
                    {/* 왜 정지인지가 상태보다 중요하다 — 배지 밑이 아니라 제 열에 */}
                    <TableCell className="text-fg-muted truncate text-xs">
                      {m.statusNote ?? ''}
                    </TableCell>
                    <TableCell className="text-right">
                      {/* 상태마다 할 수 있는 일이 다르다 — 흐린 버튼을 두지 않는다(C1) */}
                      {/* 버튼 수가 행마다 달라도 높이는 같아야 한다(명단 탭과 같은 처리) */}
                      <div className="flex h-[30px] items-center justify-end">
                        <RowActions
                          manager={m}
                          onAssign={() => setAssigning(m)}
                          onSuspend={() => setPending({ kind: 'suspend', manager: m })}
                          onCancel={() => setPending({ kind: 'cancel', manager: m })}
                          onResend={() =>
                            action.run(
                              () => resendManagerInvite(m.id),
                              () => `${m.email}로 초대를 다시 보냈어요`,
                              `${m.email}로 초대를 보내지 못했습니다`,
                            )
                          }
                          onReactivate={async () => {
                            const ok = await action.run(
                              () => setManagerStatus(m.id, 'ACTIVE'),
                              () => `${m.name ?? m.email}을 다시 활성화했어요`,
                              `${m.name ?? m.email}을 활성화하지 못했습니다`,
                            )
                            if (ok) refresh()
                          }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <TableFooterBar
              range={`1–${page.data.items.length} / ${page.data.total}명`}
              page={1}
              totalPages={1}
              onPageChange={() => {}}
            />
          </>
        )
      )}

      <InviteManagerDialog open={inviteOpen} onOpenChange={setInviteOpen} onInvited={refresh} />

      {assigning && (
        <AssignManagerDialog
          open
          onOpenChange={(v) => !v && setAssigning(null)}
          fixed={{ kind: 'manager', id: assigning.id, name: assigning.name ?? assigning.email }}
          onSaved={() => {
            setAssigning(null)
            refresh()
          }}
        />
      )}

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(v) => !v && setPending(null)}
        title={
          pending?.kind === 'suspend'
            ? `${pending.manager.name ?? pending.manager.email}을 정지할까요?`
            : `${pending?.manager.email ?? ''} 초대를 취소할까요?`
        }
        description={
          pending?.kind === 'suspend'
            ? `정지하면 로그인할 수 없고 담당 반이 풀립니다${
                pending?.manager.assignment
                  ? ` — ${pending.manager.assignment.classNames.join(' · ')}이(가) 담당 없음이 됩니다`
                  : ''
              }. 계정과 지난 기수 담당 기록은 남고, 다시 활성화해도 담당 반은 자동으로 돌아오지 않습니다.`
            : `아직 가입 전이라 계정이 만들어지지 않았습니다. 취소하면 목록에서 사라지고${
                pending?.manager.assignment
                  ? `, 맡겨 둔 ${pending.manager.assignment.classNames.join(' · ')}도 담당 없음이 됩니다`
                  : ''
              }. 필요하면 같은 주소로 다시 초대할 수 있습니다.`
        }
        confirmLabel={pending?.kind === 'suspend' ? '정지' : '초대 취소'}
        destructive
        onConfirm={async () => {
          if (!pending) return
          if (pending.kind === 'suspend') await setManagerStatus(pending.manager.id, 'SUSPENDED')
          else await cancelManagerInvite(pending.manager.id)
          setPending(null)
          refresh()
        }}
      />
    </>
  )
}

/** 상태마다 할 수 있는 일이 다르다 — 못 하는 일을 흐리게 두지 않고 아예 안 그린다(C1) */
function RowActions({
  manager,
  onAssign,
  onSuspend,
  onCancel,
  onResend,
  onReactivate,
}: {
  manager: Manager
  onAssign: () => void
  onSuspend: () => void
  onCancel: () => void
  onResend: () => Promise<unknown>
  onReactivate: () => Promise<unknown>
}) {
  if (manager.status === 'INVITED')
    return (
      <>
        <Button variant="ghost" size="sm" onClick={() => void onResend()}>
          재발송
        </Button>
        <Button variant="ghost" size="sm" className="ml-1" onClick={onCancel}>
          취소
        </Button>
      </>
    )

  if (manager.status === 'SUSPENDED')
    return (
      <Button variant="ghost" size="sm" onClick={() => void onReactivate()}>
        재활성
      </Button>
    )

  return (
    <>
      <Button variant="ghost" size="sm" onClick={onAssign}>
        반 배정
      </Button>
      <Button variant="ghost" size="sm" className="ml-1" onClick={onSuspend}>
        정지
      </Button>
    </>
  )
}
