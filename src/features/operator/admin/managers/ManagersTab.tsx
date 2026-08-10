import { useEffect, useState } from 'react'
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
import { useDebounced } from '@/lib/useDebounced'
import { listQueryOptions, staleProps } from '../../_shared/listQuery'
import { useFindManagers } from '@/api/member/useMemberQueries'
import { useFindClassrooms } from '@/api/academic/useAcademicQueries'
import { useGetCurrentMember } from '@/api/member/useMemberQueries'
import {
  useCancelManagerInvitation,
  useResendManagerInvitation,
  useUpdateManagerStatus,
} from '@/api/member/useMemberMutations'
import type { findManagers_Item, findManagers_Query } from '@/api/member/memberTypes'
import { MANAGER_STATUS_LABEL } from '../_/labels'
import { assignPolicy, formatLastSeen } from '../_/rules'
import { useCohortScope } from '../_/cohortScope'
import type { AccountStatus } from '../_/api/types'
import SectionHeader from '../_/components/SectionHeader'
import TableFooterBar from '../_/components/TableFooterBar'
import ResultBanner from '../_/components/ResultBanner'
import { useActionResult } from '../_/actionResult'
import { Loading, LoadFailed } from '../_/components/AsyncState'
import { ManagerStatusBadge } from '../_/components/StatusBadges'
import { FilterSelect, SearchBox } from '../_/components/AdminFilters'
import { ALL, asQuery, withAll } from '../_/filterState'
import InviteManagerDialog from './components/InviteManagerDialog'
import ManagerClassroomsDialog from './components/ManagerClassroomsDialog'
import ConfirmDialog from '../_/components/ConfirmDialog'

/*
  ③ 매니저 — 계정과 담당 배정.

  ⚠ **범위가 `기관 전체`에서 `선택 기수`로 바뀌었다**(op-06-admin.md OP06-15). 정의서 §3은
  *"매니저는 기수를 옮겨 다니므로 기관 전체"* 라 했는데, 그렇게 두니 한 표가 두 일을
  하려다 꼬였다 — **반이 기수에 붙듯 매니저도 기수에 붙인다.**

  소속은 **담당 반이 아니라 `cohortIds`**다. 담당으로 판정하면 초대 대기·정지 계정이
  어느 기수에도 안 잡혀 사라진다(실측 9명 → 7명) — 이 탭 일의 3분의 2가 계정 업무
  (초대·재발송·정지)라 그것들이 안 보이면 화면이 쓸모없다.

  **기수 필터가 툴바에서 사라졌다.** 상단 스위처가 그 일을 하므로 같은 축이 화면에 둘일
  이유가 없다 — 둘이 서로 다른 값을 가리키고 있었다(헤더는 7기, 툴바는 전체).

  **퇴사한 매니저를 지우지 않고 정지로 남긴다.** 담당 반 배정이 기간형 이력이라 지우면
  지난 기수의 기록이 끊긴다(OP-06 §3).

  **오퍼레이터 계정은 여기 없다** — 초대·정지는 슈퍼어드민(SA-02) 소관이다.
*/
/*
  정렬 — **둘만 둔다**(OP06-11-⑦).

  정의서가 이 탭을 *"초대 · 반 배정 · 정지"* 로 정의한다. 거기서 나오는 순서는 둘뿐이다.
    · **이름순** — 사람을 찾는 목록의 자연 순서(기본)
    · **담당 인원순** — 한 사람에게 몰리는 것이 실제 조치 대상이다(`headcount`가 계약에 있다)

  **최근 접속순·상태순은 안 만들었다.** 접속 시각은 보이지만 그것으로 할 조치가 없고,
  상태순은 *무엇이 급한가*를 화면이 정하는 셈이라(E8) 상태 필터가 이미 그 일을 한다.
*/
const SORT_OPTIONS = [
  { value: 'NAME', label: '이름순' },
  { value: 'ASSIGNED_TRAINEE_COUNT', label: '담당 인원순' },
]

type Manager = findManagers_Item
type ManagerSort = NonNullable<findManagers_Query['sort']>

/** 한 페이지에 받는 수. 기관 매니저가 수십 명이라 한 쪽에 들어간다 */
const PAGE_SIZE = 100

type Props = {
  /**
   * ⚠ **아직 목이다.** 실서버로 옮길 때 이 탭의 개수를 여기로 알린다 —
   * 목 개수를 배지에 쓰면 실제와 다른 수가 탭 이름 옆에 붙는다.
   */
  onCount: (count: number | null) => void
}

type Pending = { kind: 'suspend'; manager: Manager } | { kind: 'cancel'; manager: Manager } | null

/** 지금 맡은 반 이름들 — 확인 문구가 **어느 반이 비는지 이름을 대야** 판단이 된다 */
const heldClasses = (m: Manager) => m.classroomNames.join(' · ')

/** 사람을 부르는 이름. 가입 전이면 이름이 없어 이메일이 그 자리를 대신한다 */
const displayName = (m: Manager) => m.name ?? m.email

export default function ManagersTab({ onCount }: Props) {
  const [search, setSearch] = useState('')
  /*
    **입력값과 조회값을 가른다.** 입력칸은 `search`(즉시 반응), 조회는 `query`(멈춘 뒤).
    안 가르면 한 글자마다 요청이 나가고, 입력칸이 `query`를 보면 타이핑이 끊긴다.
  */
  const query = useDebounced(search)
  const [status, setStatus] = useState(ALL)
  const [sort, setSort] = useState<ManagerSort>('NAME')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [assigning, setAssigning] = useState<Manager | null>(null)
  const [pending, setPending] = useState<Pending>(null)
  /** 행 액션 결과 — 성공·실패가 같은 배너 자리를 쓴다 */
  const action = useActionResult()

  const scope = useCohortScope()
  const { data: me } = useGetCurrentMember()
  const organizationId = me?.organizationId

  const page = useFindManagers(
    {
      query: {
        // **화면이 늘 기수를 보낸다** — 상단 스위처가 가리키는 기수가 이 목록의 범위다
        cohortId: scope.cohortId,
        query: query.trim() || undefined,
        status: asQuery<AccountStatus>(status),
        sort,
        size: PAGE_SIZE,
      },
    },
    /* 조건·페이지를 바꿔도 표를 비우지 않는다 — `_shared/listQuery` 주석 참고 */
    listQueryOptions,
  )

  /*
    **담당 없는 반은 반 목록이 안다.** 목에서는 매니저 응답이 `unstaffedClasses`를 실어
    줬는데 서버는 안 준다 — `ClassroomResponse.managerAssignmentRequired`가 그 사실을
    반마다 갖고 있으므로 반 목록에서 센다. 반 탭이 곧 같은 조회를 쓰므로 캐시에서 나온다.
  */
  const classrooms = useFindClassrooms(
    { path: { cohortId: scope.cohortId! } },
    { enabled: !!scope.cohortId },
  )
  const unstaffed = (classrooms.data?.classrooms ?? [])
    .filter((c) => c.managerAssignmentRequired)
    .map((c) => c.name)

  /*
    **기수가 어디쯤 왔는지가 액션을 정한다**(OP06-15 · rules.assignPolicy).
      · 시작 전 → 그냥 바꾼다   · 진행 중 → 확인을 받는다   · 종료 → 이력이라 못 바꾼다

    ⚠ 기수에 시작일이 없을 수 있다(`startDate`가 nullable) — 그때는 아직 일정이 안
    잡힌 것이라 **시작 전으로 본다.**
  */
  const cohort = scope.current
  const policy = cohort
    ? assignPolicy(
        { status: cohort.status, startAt: cohort.startDate ?? '9999-12-31' },
        new Date().toISOString().slice(0, 10),
      )
    : 'CONFIRM'
  const locked = policy === 'LOCKED'

  const now = new Date().toISOString().slice(0, 16)
  const counts = page.data?.statusCounts
  /*
    **`statusCounts`는 검색·상태 필터를 무시한다**(스펙: *"필터를 적용하지 않은 기관 전체
    모집단"*). 그래서 헤더의 `9명`과 푸터의 `1–7 / 7명`이 다를 수 있고, 그것이 맞다 —
    상태 칩이 자기 자신을 필터링하면 안 되기 때문이다.

    다만 **기수는 따른다**(실측: `cohortId` 없이 45명 · 9기로 좁히면 7명). 기수는 필터가
    아니라 이 화면의 범위라서다.
  */
  const totalAll = counts
    ? (counts.ACTIVE ?? 0) + (counts.INVITED ?? 0) + (counts.INACTIVE ?? 0)
    : 0
  const narrowed = query.trim().length > 0 || status !== ALL

  useEffect(() => {
    if (counts) onCount(totalAll)
  }, [counts, totalAll, onCount])

  const updateStatus = useUpdateManagerStatus()
  const resendInvite = useResendManagerInvitation()
  const cancelInvite = useCancelManagerInvitation()

  return (
    <>
      {/*
        담당 없는 반 경고. **목록 위에 둔다** — 행 하나의 문제가 아니라 조직의 문제라
        필터를 걸어도 사라지지 않아야 한다. OP-01 `조치 필요`의 `미배정`과 같은 신호이고,
        그래서 여기 문구가 그 화면과 같은 것을 가리킨다(D1).
      */}
      {unstaffed.length > 0 && (
        <Alert variant="warning" className="mb-4">
          <TriangleAlertIcon />
          <AlertTitle>{unstaffed.join(' · ')}에 담당 매니저가 없습니다</AlertTitle>
          <AlertDescription>
            담당이 없으면 그 반 학생의 면담·독촉을 아무도 처리하지 않습니다. 대시보드의 조치
            필요에도 같은 신호가 올라옵니다.
          </AlertDescription>
        </Alert>
      )}

      {/*
        **이력을 보고 있다는 것을 화면이 말한다.** 액션이 사라진 이유가 안 보이면
        *"왜 여기선 못 바꾸지"* 를 찾게 된다 — 못 하는 일을 흐리게 두지 않는 대신(C1)
        왜 없는지를 밝히는 자리다(반 탭의 `개강 후에는…`과 같은 처리).
      */}
      {locked && (
        <Alert className="mb-4">
          <AlertTitle>{cohort?.name} 담당 이력을 보고 있습니다</AlertTitle>
          <AlertDescription>
            끝난 기수라 담당을 바꾸거나 계정을 정지할 수 없습니다.
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
              {cohort?.name} · 활성{' '}
              <b className="text-fg-muted font-semibold">{counts.ACTIVE ?? 0}</b> · 초대 대기{' '}
              {counts.INVITED ?? 0} · 정지 {counts.INACTIVE ?? 0}
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
          label="상태"
          value={status}
          options={withAll(MANAGER_STATUS_LABEL)}
          onChange={setStatus}
        />
        <FilterSelect
          label="정렬"
          value={sort}
          options={SORT_OPTIONS}
          onChange={(v) => setSort(v as ManagerSort)}
          className="min-w-32"
        />
      </div>

      {page.isPending ? (
        <Loading label="매니저를 불러오는 중" />
      ) : page.isError ? (
        <LoadFailed label="매니저를 불러오지 못했습니다" onRetry={() => void page.refetch()} />
      ) : page.data.content.length === 0 ? (
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
        /* 옛 값을 그리는 동안 그 사실을 숨기지 않는다 — `_shared/listQuery` */
        <div {...staleProps(page.isPlaceholderData)}>
          <Table className="table-fixed">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {/*
                    **한 칸에 두 값을 쌓지 않는다**(E11). 이메일을 이름 밑에, 정지 사유를
                    상태 밑에 붙였더니 그 행만 두 줄이 되어 표가 들쭉날쭉했다(실측 57 ↔ 60px).
                    둘 다 제 열로 뺀다 — 명단 탭과 같은 판단이다(OP06-6·OP06-9).
                  */}
                <TableHead className="w-28">매니저</TableHead>
                <TableHead className="w-52">이메일</TableHead>
                {/*
                    **기수와 담당 반을 갈랐다** — [[OP06-15]]로 목록이 한 기수만 담게 되면서
                    가능해졌다. OP06-12에서 합쳤던 이유(겸임하면 `7기·8기` + `E반, G반, A반`이
                    되어 A반이 어느 기수 것인지 사라진다)가 **범위가 한 기수라 없어졌다** —
                    한 행에 기수가 하나뿐이면 쪼개도 짝이 안 깨진다.
                  */}
                <TableHead className="w-20">기수</TableHead>
                <TableHead className="w-36">담당 반</TableHead>
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
              {page.data.content.map((m) => (
                <TableRow key={m.managerId}>
                  {/* 가입 전이면 이름이 없다 — `—`가 아니라 무엇을 기다리는지 쓴다(F3) */}
                  <TableCell className="font-semibold">{m.name ?? '가입 대기'}</TableCell>
                  <TableCell className="text-fg-muted truncate text-xs">{m.email}</TableCell>
                  {/*
                      소속 기수 — 목록 범위가 곧 이 값이라 모든 행이 같다. **그래도 적는다**:
                      담당 반이 어느 기수 것인지 행 안에서 읽혀야 하고, 기수를 바꿔 가며
                      보는 화면이라 지금 무엇을 보고 있는지가 표에도 있어야 한다.
                    */}
                  <TableCell className="text-fg-muted text-xs">{m.cohortName ?? '—'}</TableCell>
                  <TableCell className="text-fg-muted truncate text-xs">
                    {m.classroomNames.length > 0 ? (
                      m.classroomNames.join(', ')
                    ) : (
                      <span className="text-fg-subtle">미배정</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {m.assignedTraineeCount}
                  </TableCell>
                  <TableCell>
                    <ManagerStatusBadge status={m.status} />
                  </TableCell>
                  <TableCell className="text-fg-muted text-xs">
                    {formatLastSeen(m.lastLoginAt, now) ?? '—'}
                  </TableCell>
                  {/*
                    정지면 사유, 초대 대기면 **언제 누가 초대했나**(OP06-11-⑥). 초대 대기 행은
                    최근 접속도 담당도 비어서, 이것이 없으면 `재발송`을 눌러야 할지
                    판단할 근거가 아무것도 없다.

                    ⚠ **지난 기수 수(`pastCohorts`)가 사라졌다.** 목이 만들던 값인데 서버
                    응답에 없다 — 목록이 한 기수 범위라 다른 기수 담당 이력은 이 조회로
                    알 수 없다. 없는 값을 세지 않는다(10차 요청).
                  */}
                  <TableCell className="text-fg-muted truncate text-xs">
                    {m.status === 'INACTIVE'
                      ? '정지'
                      : m.status === 'INVITED' && m.invitedAt
                        ? `${m.invitedAt.slice(0, 10)} 초대${m.invitedByName ? ` · ${m.invitedByName}` : ''}`
                        : ''}
                  </TableCell>
                  <TableCell className="text-right">
                    {/* 상태마다 할 수 있는 일이 다르다 — 흐린 버튼을 두지 않는다(C1) */}
                    {/* 버튼 수가 행마다 달라도 높이는 같아야 한다(명단 탭과 같은 처리) */}
                    <div className="flex h-[30px] items-center justify-end">
                      {locked || !organizationId ? null : (
                        <RowActions
                          manager={m}
                          onAssign={() => setAssigning(m)}
                          onSuspend={() => setPending({ kind: 'suspend', manager: m })}
                          onCancel={() => setPending({ kind: 'cancel', manager: m })}
                          onResend={() =>
                            action.run(
                              () =>
                                resendInvite.mutateAsync({
                                  path: { organizationId, tokenId: m.pendingInvitationTokenId! },
                                }),
                              () => `${m.email}로 초대를 다시 보냈어요`,
                              `${m.email}로 초대를 보내지 못했습니다`,
                            )
                          }
                          onReactivate={() =>
                            action.run(
                              () =>
                                updateStatus.mutateAsync({
                                  path: { organizationId, managerId: m.managerId },
                                  body: { status: 'ACTIVE' },
                                }),
                              () => `${displayName(m)}을 다시 활성화했어요`,
                              `${displayName(m)}을 활성화하지 못했습니다`,
                            )
                          }
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/*
            **헤더 수와 다를 수 있다.** 헤더의 `9명`은 기관 전체 모집단이고 여기 `7명`은
            기수·필터를 적용한 결과다(스펙 명시) — 같아 보여야 하는 값이 아니다.
          */}
          <TableFooterBar
            range={`1–${page.data.content.length} / ${page.data.totalElements}명`}
            page={1}
            totalPages={1}
            onPageChange={() => {}}
          />
        </div>
      )}

      <InviteManagerDialog open={inviteOpen} onOpenChange={setInviteOpen} />

      {organizationId && scope.cohortId && (
        <ManagerClassroomsDialog
          manager={assigning}
          organizationId={organizationId}
          cohortId={scope.cohortId}
          onOpenChange={(v) => !v && setAssigning(null)}
          onSaved={() => setAssigning(null)}
        />
      )}

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(v) => !v && setPending(null)}
        title={
          pending?.kind === 'suspend'
            ? `${displayName(pending.manager)}을 정지할까요?`
            : `${pending?.manager.email ?? ''} 초대를 취소할까요?`
        }
        description={
          pending?.kind === 'suspend'
            ? `정지하면 로그인할 수 없고 담당 반이 풀립니다${
                heldClasses(pending.manager)
                  ? ` — ${heldClasses(pending.manager)}이(가) 담당 없음이 됩니다`
                  : ''
              }. 계정과 지난 기수 담당 기록은 남고, 다시 활성화해도 담당 반은 자동으로 돌아오지 않습니다.`
            : /*
                **초대 취소에서 반 이야기가 사라졌다**(OP06-11-③) — 가입 전에는 반을 못 맡으므로
                맡겨 둔 반이 있을 수 없다.
              */
              '아직 가입 전이라 계정이 만들어지지 않았습니다. 취소하면 목록에서 사라지고, 필요하면 같은 주소로 다시 초대할 수 있습니다.'
        }
        confirmLabel={pending?.kind === 'suspend' ? '정지' : '초대 취소'}
        destructive
        onConfirm={async () => {
          if (!pending || !organizationId) return
          if (pending.kind === 'suspend') {
            /*
              **정지하면 담당 반이 서버에서 함께 풀린다**(9차 R7 — 같은 트랜잭션).
              화면이 반마다 따로 부르면 중간에 실패했을 때 절반만 풀린다.
            */
            await updateStatus.mutateAsync({
              path: { organizationId, managerId: pending.manager.managerId },
              body: { status: 'INACTIVE' },
            })
          } else {
            await cancelInvite.mutateAsync({
              path: { organizationId, tokenId: pending.manager.pendingInvitationTokenId! },
            })
          }
          setPending(null)
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

  if (manager.status === 'INACTIVE')
    return (
      <Button variant="ghost" size="sm" onClick={() => void onReactivate()}>
        재활성
      </Button>
    )

  return (
    <>
      <Button variant="ghost" size="sm" onClick={onAssign}>
        {manager.classroomNames.length > 0 ? '담당 변경' : '반 배정'}
      </Button>
      {/*
        **정지 버튼을 서버 값으로 잠근다**(9차 R7). 마지막 활성 매니저면 `suspendable`이
        false로 오고, 누르면 409 `LAST_MANAGER`다 — 화면이 세지 않는다(규칙이 바뀌면
        조용히 틀린다). 흐리게 두되 `title`로 이유를 준다(C1이 금지한 것은 **이유 없는**
        흐린 버튼이다).
      */}
      <Button
        variant="ghost"
        size="sm"
        className="ml-1"
        disabled={!manager.suspendable}
        title={manager.suspendable ? undefined : '기관의 마지막 활성 매니저라 정지할 수 없습니다'}
        onClick={onSuspend}
      >
        정지
      </Button>
    </>
  )
}
