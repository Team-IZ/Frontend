import { useCallback, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
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
import { cn } from '@/lib/utils/cn'
import { listClasses, listRoster, resendTraineeInvites } from '../_/api/api'
import { ACCOUNT_STATUS_LABEL } from '../_/labels'
import { ROSTER_PAGE_SIZE } from '../_/rules'
import type { AccountStatus, RosterSort, Trainee } from '../_/api/types'
import { COHORT_ID } from '../_/cohortScope'
import SectionHeader from '../_/components/SectionHeader'
import TableFooterBar from '../_/components/TableFooterBar'
import ResultBanner from '../_/components/ResultBanner'
import { useActionResult } from '../_/actionResult'
import { Loading, LoadFailed } from '../_/components/AsyncState'
import { AccountStatusBadge } from '../_/components/StatusBadges'
import { FilterSelect, SearchBox } from '../_/components/AdminFilters'
import { ALL, UNASSIGNED, asQuery, withAll } from '../_/filterState'
import AddRosterDialog from './components/AddRosterDialog'
import DeactivateTraineeDialog from './components/DeactivateTraineeDialog'

/*
  ③ 명단 — 기수의 교육생 전체. 범위는 **선택 기수**다.

  **반과 탭을 나눴다**(op-06-admin.md OP06-1) — 두 표가 한 뷰포트에 안 들어갔다. 대신 여기서
  반을 알아야 하는 것이 둘 있다: 필터 드롭다운과 소속 반 열. 그래서 **반 목록을 여기서도
  조회한다** — 탭이 갈렸으므로 부모가 내려줄 수 없고, 각 탭이 자기가 그릴 것을 부른다.

  **배정은 여기서 하지 않는다.** 표가 아니라 작업이라 모드로 연다 — 여러 번 반복하는 동안
  좌우(반·미배정 인원)가 동시에 보여야 한다(OP-06 §3). 여기 있는 `반 배정 →`은 그 모드로
  가는 문이고, **고른 사람을 들고 간다**(선택이 리셋되면 방금 한 일을 다시 한다).

  한 명만 옮기는 것은 행의 `반 변경`이 빠르다 — 모드는 여러 명을 넣을 때 쓴다.
*/
const SORT_OPTIONS = [
  { value: 'NAME', label: '이름순' },
  { value: 'RECENT', label: '최근 등록순' },
]

type Props = {
  /** 명단이 바뀌었다 — 탭 이름 옆 개수 갱신 */
  onCountsChange: () => void
}

export default function RosterTab({ onCountsChange }: Props) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  /*
    **입력값과 조회값을 가른다.** 입력칸은 `search`(즉시 반응), 조회는 `query`(멈춘 뒤).
    안 가르면 한 글자마다 요청이 나가고, 입력칸이 `query`를 보면 타이핑이 끊긴다.
  */
  const query = useDebounced(search)
  /*
    **반 탭에서 인원을 누르고 들어올 수 있다**(`?class=c-a`). 탭이 갈린 뒤 반 → 명단으로
    가는 유일한 길이라, 들어오자마자 그 반으로 좁혀져 있어야 한다.

    처음 한 번만 읽는다 — 그 뒤 드롭다운을 바꾸는 것은 사용자이고, 주소를 따라 되돌리면
    필터를 못 푼다. 탭을 옮기면 이 컴포넌트가 새로 마운트되므로 값이 남지 않는다.
  */
  const [params] = useSearchParams()
  const [classId, setClassId] = useState(params.get('class') ?? ALL)
  const [account, setAccount] = useState(ALL)
  const [sort, setSort] = useState<RosterSort>('NAME')
  const [page, setPage] = useState(1)
  /*
    **선택은 `Set`이다.** 표를 그릴 때마다 행마다 `includes`를 돌면 O(n²)가 된다 —
    25행이면 안 느끼지만 배정 모드는 `범위=전체`로 250명을 연다.
  */
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [addOpen, setAddOpen] = useState(false)
  /** 중도 이탈 처리 대상(OP06-7-①). 한 명씩이라 대상 자체를 상태로 둔다 */
  const [deactivating, setDeactivating] = useState<Trainee | null>(null)
  /** 벌크 액션·명단 추가 결과 — 성공·실패가 같은 배너 자리를 쓴다 */
  const action = useActionResult()

  const load = useCallback(
    () =>
      listRoster({
        cohortId: COHORT_ID,
        search: query || undefined,
        // `미배정`은 반 하나가 아니라 조건이다 — 같은 드롭다운에서 왔지만 쿼리가 갈린다
        classId: classId === UNASSIGNED ? undefined : asQuery(classId),
        scope: classId === UNASSIGNED ? 'UNASSIGNED' : undefined,
        account: asQuery<AccountStatus>(account),
        sort,
        page,
      }),
    [query, classId, account, sort, page],
  )
  const roster = useAsync(load)

  /** 필터 드롭다운용 반 목록 — 명단과 달리 필터·페이지에 안 걸리므로 따로 조회한다 */
  const loadRooms = useCallback(() => listClasses(COHORT_ID), [])
  const rooms = useAsync(loadRooms).data ?? []

  /** 필터를 바꾸면 1쪽으로 돌아간다 — 3쪽을 보다 검색하면 결과가 1쪽뿐이라 빈 화면이 된다 */
  const narrow = (fn: () => void) => {
    fn()
    setPage(1)
    setSelected(new Set())
  }

  const rows = roster.data?.items ?? []
  const total = roster.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / ROSTER_PAGE_SIZE))
  const narrowed = query.trim().length > 0 || classId !== ALL || account !== ALL

  /** 지금 쪽 전체 선택 — 250명 전체가 아니다. 보이지 않는 것을 고르게 하지 않는다 */
  const allOnPage = rows.length > 0 && rows.every((t) => selected.has(t.id))

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })

  const refresh = () => {
    roster.reload()
    onCountsChange()
    setSelected(new Set())
  }

  return (
    <>
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
        title="명단"
        /* 헤더는 **필터와 무관한 기수 전체**다 — 걸러 보는 동안 이 수가 따라 움직이면
           지금 보는 것이 전체인지 일부인지 알 수 없다. 필터 결과는 푸터에 있다 */
        count={roster.data ? `${roster.data.cohortTotal}명` : undefined}
        breakdown={
          roster.data && (
            <>
              7기
              {roster.data.unassigned > 0 && (
                <>
                  {' · '}
                  <b className="text-warning font-semibold">미배정 {roster.data.unassigned}</b>
                </>
              )}
            </>
          )
        }
        action={
          <>
            {/*
              미배정이 있을 때만 모드로 가는 문을 둔다 — 배정할 사람이 없는데 버튼이 있으면
              눌러 보고 완료 화면만 만난다(C6).
            */}
            {(roster.data?.unassigned ?? 0) > 0 && (
              <Button variant="ghost" onClick={() => navigate('/operator/admin/assign')}>
                반 배정하기 →
              </Button>
            )}
            <Button onClick={() => setAddOpen(true)}>+ 명단 추가</Button>
          </>
        }
      />

      {/*
        툴바 자리 — **필터와 벌크바가 같은 칸을 나눠 쓴다.**

        벌크바를 표 위에 끼워 넣었더니 첫 체크에 표가 밀려서(배정 모드에서 58px 실측)
        두 번째 클릭이 조준한 사람이 아니라 윗사람에게 떨어졌다. 그렇다고 자리를 늘
        비워 두면 표가 44px 내려가 열 번째 줄과 푸터가 접힌 아래로 넘어간다.

        **겹쳐 둔다** — 둘을 같은 그리드 칸(`row/col-start-1`)에 넣으면 칸 높이가 둘 중
        큰 쪽으로 고정되어 **무엇을 켜도 표가 안 움직인다.**

        필터가 가려지는 것은 손해가 아니다 — 필터를 바꾸면 `narrow()`가 선택을 비우므로
        고른 상태에서는 어차피 쓸 수 없는 컨트롤이었다. 다시 쓰려면 `선택 해제`가 이 줄에 있다.
      */}
      <div className="mb-3 grid">
        <div
          className={cn(
            'col-start-1 row-start-1 flex flex-wrap items-center gap-2',
            selected.size > 0 && 'invisible',
          )}
        >
          <SearchBox
            value={search}
            onChange={(v) => narrow(() => setSearch(v))}
            placeholder="이름 · 이메일 검색"
            label="교육생 검색"
          />
          {/*
          **`미배정`이 이 드롭다운에 있어야 한다.** 헤더가 `미배정 3`으로 경고해 놓고
          그것으로 좁힐 길이 없었다(검토 기준 ④ — 알려 주고 못 찾게 두지 않는다).
          배정 모드로 가면 볼 수는 있지만, 그것은 *작업*이지 *조회*가 아니다.

          같은 축(소속 반)이라 필터를 하나 더 만들지 않고 값으로 넣는다 — `전체 · 미배정 ·
          A반 …`. 서버 쿼리에서만 갈린다(`scope` ↔ `classId`).
        */}
          <FilterSelect
            label="반"
            value={classId}
            options={[
              { value: ALL, label: '전체' },
              { value: UNASSIGNED, label: '미배정' },
              ...rooms.map((c) => ({ value: c.id, label: c.name })),
            ]}
            onChange={(v) => narrow(() => setClassId(v))}
          />
          <FilterSelect
            label="계정"
            value={account}
            options={withAll(ACCOUNT_STATUS_LABEL)}
            onChange={(v) => narrow(() => setAccount(v))}
            className="min-w-32"
          />
          <FilterSelect
            label="정렬"
            value={sort}
            options={SORT_OPTIONS}
            onChange={(v) => narrow(() => setSort(v as RosterSort))}
            className="min-w-32"
          />
        </div>

        {/* 같은 칸의 다른 층. `visibility:hidden`이라 안 보일 때는 탭 순서에서도 빠진다 */}
        <div
          className={cn(
            'bg-primary-soft border-primary-border col-start-1 row-start-1 flex items-center gap-2 rounded-md border px-3',
            selected.size === 0 && 'invisible',
          )}
        >
          <b className="text-primary text-sm font-semibold">{selected.size}명 선택</b>
          <Button
            size="sm"
            onClick={() =>
              // 고른 사람을 들고 모드로 간다 — 리셋되면 방금 한 선택을 다시 해야 한다(§3)
              navigate('/operator/admin/assign', { state: { traineeIds: [...selected] } })
            }
          >
            반 배정 →
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              const sent = await action.run(
                () => resendTraineeInvites([...selected]),
                // 실제로 나간 수를 쓴다 — 활성 계정에는 초대가 나가지 않는다
                (n) =>
                  n > 0
                    ? `${n}명에게 활성화 초대를 다시 보냈어요`
                    : '초대 대기 중인 사람이 없어 아무것도 보내지 않았어요',
                '초대를 보내지 못했습니다',
              )
              // 실패하면 선택을 남긴다 — 다시 시도할 대상이 그것이다
              if (sent !== undefined) setSelected(new Set())
            }}
          >
            초대 재발송
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => setSelected(new Set())}
          >
            선택 해제
          </Button>
        </div>
      </div>

      {roster.loading ? (
        <Loading label="명단을 불러오는 중" />
      ) : roster.failed ? (
        <LoadFailed label="명단을 불러오지 못했습니다" onRetry={roster.reload} />
      ) : rows.length === 0 ? (
        narrowed ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>
                {query ? `"${query}"와 맞는 사람이 없습니다` : '조건에 맞는 사람이 없습니다'}
              </EmptyTitle>
              {/* **필터 전 모집단**을 적는다 — `total`을 쓰면 `0명에서 찾았습니다`가 된다 */}
              <EmptyDescription>
                7기 {roster.data?.cohortTotal ?? 0}명에서 찾았습니다.
              </EmptyDescription>
            </EmptyHeader>
            <Button
              variant="ghost"
              onClick={() =>
                narrow(() => {
                  setSearch('')
                  setClassId(ALL)
                  setAccount(ALL)
                })
              }
            >
              필터 해제
            </Button>
          </Empty>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>아직 등록된 교육생이 없습니다</EmptyTitle>
              <EmptyDescription>
                CSV로 한 번에 넣거나 직접 입력할 수 있습니다. 등록과 동시에 활성화 초대가 나갑니다.
              </EmptyDescription>
            </EmptyHeader>
            <Button onClick={() => setAddOpen(true)}>+ 명단 추가</Button>
          </Empty>
        )
      ) : (
        <>
          <Table className="table-fixed">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10">
                  <Checkbox
                    checked={allOnPage}
                    aria-label="이 쪽 전체 선택"
                    onCheckedChange={() =>
                      setSelected(allOnPage ? new Set() : new Set(rows.map((t) => t.id)))
                    }
                  />
                </TableHead>
                {/*
                  **이메일을 이름 밑에 겹쳐 쓰지 않는다**(E11 — 칸 하나에 값 하나).
                  한 칸에 둘을 쌓으면 행 높이가 두 줄이 되어 한 화면에 들어가는 사람이
                  절반이 되고, **이메일로 훑을 수가 없다** — 세로로 안 맞으니 눈이 매
                  줄마다 이름을 건너뛰어야 한다. 계정 문제를 볼 때 실제로 훑는 것이 그 열이다.
                */}
                <TableHead className="w-32">교육생</TableHead>
                <TableHead className="w-56">이메일</TableHead>
                <TableHead className="w-32">소속 반</TableHead>
                <TableHead className="w-28">계정</TableHead>
                {/*
                  **정렬 옵션에 `최근 등록순`이 있는데 등록일이 행에 없었다**(E2) — 왜 그
                  순서인지 물을 데가 없다. 기수 탭의 `기간` → `시작 ~ 종료`와 같은 자리다.
                  중도 합류를 가려내는 값이기도 하다 — 개강일이 아닌 사람이 곧 그 사람이다.
                */}
                <TableHead className="w-32">등록일</TableHead>
                {/*
                  **비고 — 한 칸에 두 줄을 쌓지 않는다**(E11). 비활성 사유·일자를 `계정`
                  배지 밑에 붙였더니 그 행만 두 줄이 되어 표가 들쭉날쭉했다. 값이 드물게
                  차는 열이지만, 드문 값이야말로 **제자리가 있어야** 눈에 걸린다.
                */}
                <TableHead className="w-44">비고</TableHead>
                {/* 마지막 열(액션)이 남는 폭을 흡수한다 */}
                <TableHead className="text-right">
                  <span className="sr-only">액션</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((t) => {
                const checked = selected.has(t.id)
                return (
                  <TableRow key={t.id} className={cn(checked && 'bg-primary-soft')}>
                    <TableCell>
                      <Checkbox
                        checked={checked}
                        aria-label={`${t.name} 선택`}
                        onCheckedChange={() => toggle(t.id)}
                      />
                    </TableCell>
                    <TableCell className="font-semibold">{t.name}</TableCell>
                    <TableCell className="text-fg-muted truncate text-xs">{t.email}</TableCell>
                    <TableCell
                      className={cn('text-xs', t.className ? 'text-fg-muted' : 'text-warning')}
                    >
                      {/*
                        **`A반 · 3팀`에서 팀을 뺐다**(OP06-6). 팀은 프로젝트마다 재편성되는
                        **회차의 속성**이라 사람에 고정으로 붙지 않는다(01-design-checklist).
                        한 기수에 회차가 여럿이면 회차 이름 없는 `3팀`은 무엇도 안 가리킨다.
                        매니저용 명단(MG-05)이 같은 이유로 팀 열을 이미 뺐다.
                      */}
                      {t.className ?? '미배정'}
                    </TableCell>
                    <TableCell>
                      <AccountStatusBadge status={t.account} />
                    </TableCell>
                    <TableCell className="text-fg-muted text-xs tabular-nums">
                      {t.registeredAt}
                    </TableCell>
                    <TableCell className="text-fg-muted truncate text-xs">
                      {t.statusNote ?? ''}
                    </TableCell>
                    {/*
                      **비활성 하나만 남겼다.** 반 이동은 여러 명을 한 번에 하는 일이라
                      벌크바의 `반 배정 →`이 맡는다 — 행마다 버튼을 두면 250행에 그 버튼이
                      250개 생기고, 정작 훑어야 하는 값이 밀린다.
                    */}
                    <TableCell className="text-right">
                      {/*
                        **버튼이 없는 행도 같은 높이여야 한다.** 비활성 행에만 버튼이
                        없으니 그 줄만 43px이 되어(다른 줄 53px) 표가 들쭉날쭉했다 —
                        높이를 버튼이 아니라 **칸이** 정하게 한다.
                      */}
                      <div className="flex h-[30px] items-center justify-end">
                        {t.account !== 'INACTIVE' && (
                          <Button variant="ghost" size="sm" onClick={() => setDeactivating(t)}>
                            비활성
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          <TableFooterBar
            range={`${(page - 1) * ROSTER_PAGE_SIZE + 1}–${
              (page - 1) * ROSTER_PAGE_SIZE + rows.length
            } / ${total}명${selected.size > 0 ? ` · ${selected.size}명 선택` : ''}`}
            page={page}
            totalPages={totalPages}
            // 쪽을 넘겨도 선택은 남긴다 — 여러 쪽에서 골라 한 번에 배정하는 동선이 있다
            onPageChange={setPage}
          />
        </>
      )}

      <DeactivateTraineeDialog
        target={deactivating}
        onOpenChange={(v) => !v && setDeactivating(null)}
        onDone={(t, reason) => {
          // 이름 뒤에 조사를 붙이지 않는다 — `을(를)`도 읽기 나쁘다(OP06-6와 같은 이유)
          action.setResult({ text: `비활성 처리했어요 — ${t.name} · ${reason}` })
          refresh()
        }}
      />

      <AddRosterDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdded={(result) => {
          action.setResult({
            text:
              `${result.added}명을 등록하고 활성화 초대를 보냈어요` +
              (result.skipped > 0 ? ` · 이미 등록된 ${result.skipped}명은 건너뛰었어요` : ''),
          })
          refresh()
        }}
      />
    </>
  )
}
