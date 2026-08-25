import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Lock, LockOpen, AlertTriangle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/InputGroup'
import { ButtonGroup } from '@/components/ui/ButtonGroup'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import TableSkeleton from '@/components/common/TableSkeleton'
import StaleBlock from '@/components/common/StaleBlock'
import { Spinner } from '@/components/ui/Spinner'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHead,
  TableRow,
} from '@/components/ui/Table'
import { errorCopy } from '@/lib/errorCopy'
import { useManagedClassrooms } from '@/stores/cohortScope'
import {
  useTeams,
  useSubmissionStatus,
  useCreateTeam,
  useConfirmTeams,
  useReopenTeams,
  useDisbandTeam,
} from '../_/api/api'
import { TEAM_STAGE_LABEL, type Team, type TeamFormationStage } from '../_/api/types'
import TeamEditDialog from './TeamEditDialog'
import TeamAutoAssignDialog from './TeamAutoAssignDialog'

/*
  MG-08 팀 편성 탭 — `teamFormationStage` 5국면 상태머신(서버가 판정한다).

  국면별로 무엇이 가능한지가 전부 다르다:
  ① 편성 전(NOT_STARTED)     자동 배분 · 팀 추가 — 제출 잠김
  ② 편성 중(FORMING)         팀 편집 자유 — `팀 편성 완료` 비활성 — 제출 잠김
  ③ 전원 배정(READY_TO_CONFIRM) 팀 편집 자유 — `팀 편성 완료` 활성 — 제출 잠김
  ④ 확정됨(CONFIRMED)        🔒 · `편성 다시 열기` — 제출 열림
  ⑤ 종료(CLOSED)             🔒 · 편성 액션 전부 잠김

  "자동 배분"은 **그 반에 팀이 하나도 없을 때만** 보인다 — 서버의 실행 조건이 그것이라
  (`NOT_STARTED`), 조건을 못 채운 버튼을 그리지 않는 것뿐이다. 이미 짜인 팀을 뒤엎는
  액션을 상시 노출하지 않는 이유이기도 하다.

  ⚠ **국면을 서버가 준다**(`teamFormationStage`) — 화면이 `teams.length`·
  `unassigned.length`에서 파생하지 않는다. 제출이 시작됐는지는 `submissionOpened`로
  따로 오므로 국면에 섞지 않는다.

  🔴 **쓰기가 실패하면 말한다**(하드닝 실측). 확정을 가로채 409를 만들었더니 화면이
  **아무 말도 안 했다** — 눌렀고, 실패했고, 버튼만 원래대로 돌아갔다. 사용자는 됐는지
  안 됐는지 알 수 없다. `lib/errorCopy`가 코드·상태를 보고 문구를 정한다(원인을
  추측해 하나로 묶지 않는다 — OP 반 추가에서 이미 겪은 것).

  🟢 **팀 해체가 돌아왔다**(32차 R14①). 한때 서버에 자리가 없어 뺐던 버튼이다 —
  인원 0명짜리 팀이 제출 현황에서 「미제출 ⚠」로 잡혀 조치가 필요한 것처럼 보이는데
  지울 방법이 없었다.

  팀원은 **미배정으로 돌아간다**(서버가 그렇게 한다). 정상 접수된 제출이 있는 팀은
  `409 TEAM_SUBMISSION_LOCKED`라 해체할 수 없다 — 해체하면 그 제출이 팀 없이 뜬다.

  ⚠ **확인 모달을 거친다**(화면 규칙 H) — 편성을 바꾸는 액션이고, 무엇이 일어나는지
  (팀원이 미배정으로 돌아간다)를 문장으로 말한다.

  ⚠ **반 열이 생겼다.** 담당 반이 여럿이면 팀 번호가 반마다 1부터 다시 시작해
  한 목록에 `1팀`이 반 수만큼 나온다(30차 R4). 반 없이는 팀을 구분할 수 없다.

  🔴 **한 번에 한 반을 본다**(33차 백엔드). 팀 생성·자동 배분·확정·다시 열기가
  `classId`를 **필수로** 받게 바뀌었고, 확정 판정도 그 반 기준이다. 그래서 이 탭은
  국면·미배정·팀 목록·쓰기를 **같은 반으로 맞춰** 읽는다 — 하나라도 범위가 다르면
  「지금 무엇을 할 수 있는가」가 두 가지로 갈린다. 고른 반은 주소(`?class=`)가 갖고,
  담당 반이 하나뿐이면 고를 것이 없어 세그먼트를 그리지 않는다.
*/

type Props = {
  projectId: string
  /**
   * 담당 반 목록을 읽는 기수 — 팀 **쓰기 넷이 `classId`를 요구한다**(33차 백엔드).
   * `useManagerCohort`가 미리 받아 둬서 이 화면에서 추가 요청이 나가지 않는다.
   */
  cohortId: string | undefined
}

export default function TeamTab({ projectId, cohortId }: Props) {
  const [autoAssignOpen, setAutoAssignOpen] = useState(false)
  /*
    🔴 **id만 들고, 팀 객체는 매 렌더 `teams`에서 다시 찾는다**(실측).

    한때 `useState<Team | null>`로 클릭 시점의 객체를 통째로 들고 있었다. 배정·해제는
    표를 갱신하는데(`teamList.data`가 새로 온다) 다이얼로그 안의 좌측 팀원 목록은 그
    스냅샷을 계속 그려서 **바뀌지 않았다** — 방금 뺀 사람이 팀원으로도, 미배정으로도
    동시에 보였다(우측은 `teamList.data`를 직접 읽어 갱신되므로 한쪽만 멈춘 것처럼
    보인다). 닫았다 다시 열면 그때는 맞았다 — 스냅샷이 열 때만 새로 찍혔기 때문이다.

    id로 바꾸면 매 렌더 `teams.find`가 최신 값을 돌려주므로 다이얼로그가 열려 있는
    동안에도 따라간다. 해체돼 사라지면 `find`가 `undefined`를 주므로 아래에서 자동으로
    닫힌다.
  */
  const [editTeamId, setEditTeamId] = useState<string | null>(null)
  const [addingTeam, setAddingTeam] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [disbandTarget, setDisbandTarget] = useState<Team | null>(null)
  const [params, setParams] = useSearchParams()

  const classrooms = useManagedClassrooms(cohortId)
  const classOptions = classrooms.data?.classrooms

  /*
    **고른 반은 주소가 갖는다**(규칙 J) — 새로 고쳐도, 링크를 받아도 같은 반이 열린다.
    주소의 값이 담당 반에 없으면 버린다(남이 보낸 링크·배정 변경) — 안 버리면 담당하지
    않는 반으로 조회해 403이다.

    담당 반이 **하나면 고를 것이 없다** — 그 반이다.
  */
  const fromUrl = params.get('class')
  const selectedClassId =
    classOptions?.find((c) => c.classroomId === fromUrl)?.classroomId ??
    classOptions?.[0]?.classroomId

  /*
    반이 하나뿐이면 **좁히지 않는다** — 담당 반 전체가 곧 그 반이라 결과가 같고,
    실으면 같은 데이터를 다른 캐시 키로 한 번 더 받는다(`_/api/api.ts` 주석).
  */
  const scopeClassId = classOptions && classOptions.length > 1 ? selectedClassId : undefined

  const teamList = useTeams(projectId, scopeClassId)
  /*
    🔴 **국면을 이 탭이 직접 읽는다** — 부모가 주던 값은 담당 반 **전체** 기준이라
    반이 둘이면 틀린다. B반은 전원 배정인데 D반에 미배정이 남으면 `FORMING`이 와서
    「팀 편성 완료」가 잠기는데, **서버는 B반 확정을 허용한다**(33차 3-4절 — 확정 판정도
    그 반 기준으로 바뀌었다). 백엔드가 푼 제약을 화면이 다시 걸게 된다.

    스펙이 `teamFormationStage`·`unassignedMemberCount`·`summary`를 **그 매니저가 보는
    범위의 값**이라고 적고 있어, `classId`를 실으면 그 반 기준으로 온다.

    반이 하나면 `scopeClassId`가 `undefined`라 부모와 **같은 쿼리 키**다 — 캐시를
    공유하므로 요청이 늘지 않는다.
  */
  const submission = useSubmissionStatus(projectId, scopeClassId)
  const sub = submission.data
  /*
    🔴 **셋 다 「아직 모른다」가 있다** — 제출 현황이 팀 목록보다 늦게 온다.
    `?? 'NOT_STARTED'` · `?? false`로 메웠더니 **종료된 회차에서 3.8초 동안 「편성 전」
    이라며 [팀 추가]·[자동 배분]이 열려 있었다**(실측 · 제출 조회를 6초 늦춰 재현).
    자동 배분은 팀을 다시 짜는 되돌릴 수 없는 쓰기다 — 서버가 막더라도 화면이
    권해서는 안 된다(규칙 C·F).

    그래서 `undefined`를 그대로 두고, **모르는 동안에는 액션 줄을 안 그린다.**
    표는 그려도 된다 — 읽기라 틀릴 것이 없다.
  */
  const stage = sub?.teamFormationStage
  const locked = sub?.locked
  const submittedTeamCount = sub?.summary.submittedTeamCount

  const createTeam = useCreateTeam()
  const confirmTeams = useConfirmTeams()
  const reopenTeams = useReopenTeams()
  const disbandTeam = useDisbandTeam()

  /*
    🔴 **실측 — 반을 바꿔도 실패 배너가 안 지워진다.** `useMutation`의 `error`는 다음
    `mutate`나 `reset()`까지 남는다. E반에서 팀 추가가 실패한 채로 G반으로 넘어가면
    G반 화면에 **E반 실패**("팀을 추가하지 못했습니다")가 그대로 떠 있었다 — 다른 반
    이야기를 하고 있는데 실패 문구만 안 지워진 것이라 원인을 잘못 짚게 만든다.
  */
  useEffect(() => {
    createTeam.reset()
    confirmTeams.reset()
    reopenTeams.reset()
    disbandTeam.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassId])

  /*
    **반 세그먼트 — 담당 반이 둘 이상일 때만 그린다.**

    팀은 반별로 짜고(33차) 확정도 반 단위다. 그래서 이 탭은 **한 번에 한 반**을 본다 —
    국면·미배정·팀 목록·쓰기가 전부 같은 반을 가리켜야 「지금 무엇을 할 수 있는가」가
    한 가지로 읽힌다. 반이 하나면 고를 것이 없어 그리지 않는다.

    🔴 **조회 상태 바깥에 둔다.** 아래 스켈레톤·에러가 `return`으로 빠져나가는데 그 안에
    세그먼트가 없으면, 반을 바꾸는 순간 세그먼트째 사라져 **돌아올 방법이 없다**(반을
    바꾸면 팀 목록을 다시 받으므로 반드시 그 상태를 지난다).
  */
  const classSegment = classOptions && classOptions.length > 1 && (
    <ButtonGroup aria-label="반">
      {classOptions.map((c) => (
        <Button
          key={c.classroomId}
          size="sm"
          variant={selectedClassId === c.classroomId ? 'primary' : 'ghost'}
          aria-pressed={selectedClassId === c.classroomId}
          onClick={() => {
            /* 쓰던 입력은 그 반의 것이다 — 안 닫으면 B반에 쓰던 이름이 D반에 만들어진다 */
            setAddingTeam(false)
            setNewTeamName('')
            setParams(
              (prev) => {
                const next = new URLSearchParams(prev)
                next.set('class', c.classroomId)
                return next
              },
              /* 반을 바꾸는 것은 탭 전환과 같은 결의 이동이다 — 히스토리를 쌓지 않는다 */
              { replace: true },
            )
          }}
        >
          {c.name}
        </Button>
      ))}
    </ButtonGroup>
  )

  if (!teamList.data && !teamList.isError) {
    /* 실측 — 머리 줄 30 + gap 16 · 표 헤더 38.5 · 행 53 · 6행. 열 폭은 헤더 그대로 */
    return (
      <div className="flex flex-col gap-4">
        {classSegment}
        <div className="flex h-[30px] items-center gap-2">
          <Skeleton className="h-[22px] w-16 rounded-full" />
          <Skeleton className="h-3 w-28" />
        </div>
        <TableSkeleton
          rows={6}
          cols={['w-[8%]', 'w-[8%]', 'w-[6%]', null, 'w-[10%]', 'w-[11%]']}
          rowH={53}
          footerH={0}
        />
      </div>
    )
  }

  if (teamList.isError || !teamList.data) {
    return (
      <div className="flex flex-col gap-4">
        {classSegment}
        <Empty>
          <EmptyHeader>
            <EmptyTitle>팀을 불러오지 못했습니다</EmptyTitle>
            <EmptyDescription>잠시 후 다시 시도해 주세요.</EmptyDescription>
          </EmptyHeader>
          <Button variant="ghost" onClick={() => void teamList.refetch()}>
            다시 시도
          </Button>
        </Empty>
      </div>
    )
  }

  const { unassignedMembers, unassignedCount } = teamList.data
  /** 아직 모르면 `undefined` — 국면을 모르는 채로 액션을 열지 않는다 */
  const phase = stage as TeamFormationStage | undefined
  /** 국면과 잠김을 **둘 다 알 때만** 액션 줄을 그린다 */
  const stageKnown = phase !== undefined && locked !== undefined

  /*
    🔴 **정렬은 화면이 한다.** 렌더에서 7·2·5·1·4·6·3팀 순으로 나왔다 — `findTeams`는
    순서를 약속하지 않는다(제출 현황만 "반 이름 → 팀 번호 순"이라고 스펙에 적혀 있다).
    표에 적힌 번호 그대로 못 읽는 목록은 쓸 수 없어 같은 기준으로 세운다. 서버가 낸
    판정을 뒤집는 게 아니라 표시 순서라 경계 문제가 아니다(정렬 파라미터도 없다).
  */
  const teams = [...teamList.data.teams].sort(
    (a, b) =>
      (a.className ?? '').localeCompare(b.className ?? '') ||
      Number(a.teamNumber) - Number(b.teamNumber),
  )

  /* 매 렌더 최신 값을 찾는다(`editTeamId` 주석) — 해체돼 사라졌으면 `undefined`라 닫힌다 */
  const editTeam = teams.find((t) => t.teamId === editTeamId)

  const canEdit =
    !locked && (phase === 'NOT_STARTED' || phase === 'FORMING' || phase === 'READY_TO_CONFIRM')

  /*
    **어느 반에 쓰는가** — 팀 생성·자동 배분·확정·다시 열기가 `classId`를 요구한다
    (33차 백엔드). 없으면 400 `VALIDATION_FAILED`다.

    🔴 **종전에는 이미 만들어진 팀에서 반을 역산했다**(`new Set(teams.map(t => t.classId))`).
    팀이 0개면 `size === 0`이라 「반이 하나」로 읽혀, **편성 전 화면에서 경고 없이
    자동 배분이 열려 있었다** — 누르면 400이다. 미프 5차가 정확히 그 상태였다.
    편성 전에 반을 알아야 하는데 팀에서 역산하면 편성 전에는 알 수가 없다.

    담당 반 목록을 근거로 바꾼다 — 팀이 0개여도 맞다.

    ⚠ 반 목록이 아직 안 왔으면 `undefined`다. 그 동안 쓰기를 열지 않는다 —
    `classId` 없이 나가면 400이라, 모르는 채로 권하지 않는다(규칙 C·F).
  */
  /** 쓰기에 실을 반 — 반 목록이 오기 전에는 `undefined`라 쓰기 액션을 그리지 않는다 */
  const writeClassId = selectedClassId

  /* 쓰기 넷 중 마지막으로 실패한 것 — 하나만 띄운다(연달아 누르면 마지막 것이 맞다) */
  const failure = confirmTeams.error ?? reopenTeams.error ?? createTeam.error ?? disbandTeam.error
  const failureAction = confirmTeams.error
    ? '확정'
    : reopenTeams.error
      ? '다시 열기'
      : createTeam.error
        ? '추가'
        : disbandTeam.error
          ? '해체'
          : undefined

  function handleCreateTeam() {
    if (!writeClassId) return
    const typed = newTeamName.trim()
    /* 번호는 **반 안에서** 1부터다(30차 R4) — 전체 팀 수로 세면 다음 번호가 어긋난다 */
    const name = typed
      ? withTeamSuffix(typed)
      : `${teams.filter((t) => t.classId === writeClassId).length + 1}팀`
    createTeam.mutate(
      { path: { projectId }, body: { classId: writeClassId, name } },
      {
        onSuccess: () => {
          setNewTeamName('')
          setAddingTeam(false)
        },
      },
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/*
        반이 맨 위다 — 아래 국면·팀 수·미배정이 **고른 반의 값**이라 무엇에 대한
        숫자인지가 먼저 읽혀야 한다. 스켈레톤·에러 분기도 같은 순서다.
      */}
      {classSegment}

      {/*
        🔴 **하드닝 실측(MG-08 3차)** — 반을 바꾸면 `classId`가 쿼리 키에 실려 새
        키가 된다. 새 키는 캐시가 없어 `teamList.data`가 통째로 `undefined`가 되고,
        위 스켈레톤 분기(`!teamList.data && !teamList.isError`)를 다시 타 방금 보던
        반의 표까지 스켈레톤 6행으로 지웠다 — 규칙 E가 "표를 비우지 말라"고 하는
        바로 그 증상인데, 원인이 필터가 아니라 **반 전환**이라 처음엔 안 걸렸다.

        **반 전환 말고도 같은 증상이 있다** — 확정·다시 열기를 누르면 서버가 처리를
        끝낼 때까지, 그리고 그 뒤 무효화된 조회가 새로 오기까지 표는 **버튼만 잠긴
        채 아무 말도 안 했다**(사용자 지적). `ClassesTab`(오퍼레이터 반 관리)이
        기수 전환에 쓰는 것과 같은 자리 — `isFetching`으로 보면 원인이 무엇이든
        (반 전환·확정·다시 열기·팀 추가·해체) 한 조건으로 다 걸린다.

        `useTeams`·`useSubmissionStatus`에 같은 프로젝트 안에서는 옛 값을 유지하는
        `placeholderData`를 달아 두었다(`_/api/api.ts`) — 그래서 여기서는 `data`가
        옛 값으로 계속 있고, `isFetching`으로 "그 사실을 숨기지 않는다."
      */}
      {/*
        ⚠ **`gap-4`는 `StaleBlock`이 아니라 안쪽 래퍼에 둔다.** `StaleBlock`의
        `className`은 자신의 바깥 `relative` 래퍼에 붙고, 실제 children은 그
        안쪽의 `transition-opacity` div 하나에만 담긴다 — 거기엔 레이아웃 클래스가
        없다. 여기 바로 `flex flex-col gap-4`를 줬더니 배지 줄 아래로 표까지 전부
        간격이 사라졌다(실측 · 사용자 지적).
      */}
      <StaleBlock
        stale={
          (teamList.isFetching && teamList.data !== undefined) ||
          (submission.isFetching && submission.data !== undefined) ||
          createTeam.isPending ||
          confirmTeams.isPending ||
          reopenTeams.isPending ||
          disbandTeam.isPending
        }
        label="반영하는 중"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <PhaseBadge phase={phase} locked={locked} />
            <span className="text-fg-subtle text-xs">
              {teams.length}팀 · 미배정 {unassignedCount}명
            </span>

            {/* 반이 정해져야 쓰기가 나간다(`writeClassId` 주석) — 모르면 액션 줄이 없다 */}
            <div className="ml-auto flex gap-2">
              {!locked && writeClassId && phase === 'NOT_STARTED' && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setAddingTeam(true)}>
                    팀 추가
                  </Button>
                  <Button size="sm" onClick={() => setAutoAssignOpen(true)}>
                    자동 배분
                  </Button>
                </>
              )}
              {!locked && writeClassId && (phase === 'FORMING' || phase === 'READY_TO_CONFIRM') && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setAddingTeam(true)}>
                    팀 추가
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      confirmTeams.mutate({ path: { projectId }, query: { classId: writeClassId } })
                    }
                    disabled={phase !== 'READY_TO_CONFIRM' || confirmTeams.isPending}
                  >
                    {confirmTeams.isPending ? '확정 중…' : '팀 편성 완료'}
                  </Button>
                </>
              )}
              {!locked && writeClassId && phase === 'CONFIRMED' && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={reopenTeams.isPending}
                  onClick={() =>
                    reopenTeams.mutate({ path: { projectId }, query: { classId: writeClassId } })
                  }
                >
                  <LockOpen className="size-3.5" />
                  {reopenTeams.isPending ? '여는 중…' : '편성 다시 열기'}
                </Button>
              )}
            </div>
          </div>

          {failure !== null &&
            failureAction !== undefined &&
            (() => {
              const copy = errorCopy(failure, { subject: '팀', action: failureAction })
              return (
                <Alert variant="danger">
                  <AlertTitle>{copy.title}</AlertTitle>
                  <AlertDescription>{copy.description}</AlertDescription>
                </Alert>
              )
            })()}

          {/*
        🔴 **제출이 이미 들어왔으면 다른 말을 한다**(하드닝 실측 · 32차).

        원래 문구는 「확정하면 학생들이 코드를 제출할 수 있게 되고」 · 「제출이
        시작되기 전까지는 되돌릴 수 있습니다」였는데, 실서버에 **확정 전 단계인데
        5팀이 이미 제출한** 회차가 있다. 그 상태에서 이 문구는 둘 다 사실이 아니고,
        「되돌려도 된다」고 읽혀 위험하다 — 되돌리면 이미 낸 팀이 어떻게 되는지를
        화면이 모른다.
      */}
          {stageKnown && !locked && phase === 'READY_TO_CONFIRM' && (
            <Alert variant="warning">
              <AlertTriangle />
              {/* 이 자리는 `stageKnown`을 지나왔으므로 제출 팀 수도 이미 왔다(같은 응답이다) */}
              {(submittedTeamCount ?? 0) > 0 ? (
                <>
                  <AlertTitle>확정 전인데 이미 {submittedTeamCount}팀이 제출했습니다</AlertTitle>
                  <AlertDescription>
                    편성을 바꾸면 낸 코드와 팀이 어긋날 수 있습니다. 확정만 하고 팀은 건드리지
                    마세요.
                  </AlertDescription>
                </>
              ) : (
                <>
                  <AlertTitle>
                    확정하면 학생들이 코드를 제출할 수 있게 되고, 팀은 잠깁니다
                  </AlertTitle>
                  <AlertDescription>
                    제출이 시작되기 전까지는 `편성 다시 열기`로 되돌릴 수 있습니다.
                  </AlertDescription>
                </>
              )}
            </Alert>
          )}

          {stageKnown && !locked && unassignedCount > 0 && phase !== 'NOT_STARTED' && (
            <Alert variant="warning">
              <AlertTriangle />
              <AlertTitle>미배정 {unassignedCount}명이 남아 있어 제출이 열리지 않습니다</AlertTitle>
              <AlertDescription>
                {unassignedMembers.map((p) => p.name).join(', ')} — 팀을 눌러 편집하면 여기서 배정할
                수 있습니다.
              </AlertDescription>
            </Alert>
          )}

          {teams.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>아직 팀이 없어요</EmptyTitle>
                {/* 지금 편성할 수 있을 때만 그 길을 말한다 — 잠긴 회차에 권하지 않는다(규칙 F) */}
                <EmptyDescription>
                  {canEdit
                    ? '자동 배분을 누르거나 팀을 하나씩 추가하세요.'
                    : '이 프로젝트는 팀이 편성되지 않은 채로 잠겼습니다.'}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">반</TableHead>
                  <TableHead className="w-20">팀</TableHead>
                  <TableHead className="w-16">인원</TableHead>
                  <TableHead>팀원</TableHead>
                  <TableHead className="w-24">상태</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map((team) => (
                  <TableRow key={team.teamId}>
                    <TableCell className="text-fg-muted text-xs">{team.className ?? '—'}</TableCell>
                    <TableCell className="font-bold">{team.name}</TableCell>
                    <TableCell className="text-fg-muted text-xs">{team.memberCount}명</TableCell>
                    <TableCell className="text-fg-muted text-xs">
                      {team.members.map((m) => m.name).join(' · ') || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={team.status === 'CONFIRMED' ? 'info' : 'neutral'}>
                        {team.status === 'CONFIRMED' ? '확정됨' : '편성 중'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!canEdit}
                          onClick={() => setEditTeamId(team.teamId)}
                        >
                          편집
                        </Button>
                        {/* 되돌릴 수 없는 것이 가장 오른쪽·빨강(화면 규칙 C) */}
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!canEdit || disbandTeam.isPending}
                          className="text-danger hover:bg-danger-soft p-1.5"
                          aria-label={`${team.className ?? ''} ${team.name} 해체`}
                          onClick={() => setDisbandTarget(team)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </StaleBlock>

      {editTeam && (
        <TeamEditDialog
          open={!!editTeam}
          onOpenChange={(o) => !o && setEditTeamId(null)}
          projectId={projectId}
          team={editTeam}
          /*
            🔴 **그 팀의 반 사람만 넣을 수 있다**(33차 백엔드) — 서버가 「배정하려는
            교육생이 그 팀과 같은 반인가」를 새로 검증해 아니면 400
            `PROJECT_MEMBERSHIP_NOT_FOUND`다.

            위에서 조회를 한 반으로 좁혔으므로 지금은 이미 그 반 사람뿐이다. 그래도
            거르는 것은 **이 다이얼로그가 서는 전제를 코드로 적어 두기 위해서**다 —
            스코프가 바뀌는 날 남의 반 사람이 조용히 목록에 섞이는 대신 여기서 걸린다.
          */
          unassigned={unassignedMembers.filter((m) => m.classId === editTeam.classId)}
        />
      )}

      {/* 반이 정해졌을 때만 연다 — 모달이 열렸다면 실을 `classId`가 있다는 뜻이다 */}
      {writeClassId && (
        <TeamAutoAssignDialog
          open={autoAssignOpen}
          onOpenChange={setAutoAssignOpen}
          projectId={projectId}
          classId={writeClassId}
          unassignedCount={unassignedCount}
        />
      )}

      <AlertDialog
        open={!!disbandTarget}
        onOpenChange={(o) => !o && !disbandTeam.isPending && setDisbandTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-danger-soft text-danger">
              <Trash2 />
            </AlertDialogMedia>
            <AlertDialogTitle>
              {disbandTarget?.className} {disbandTarget?.name}을 해체할까요?
            </AlertDialogTitle>
            {/* 무엇이 일어나는지 쓴다 — 「정말 하시겠습니까?」는 판단 근거를 안 준다 */}
            <AlertDialogDescription>
              {disbandTarget && disbandTarget.memberCount > 0
                ? `팀원 ${disbandTarget.memberCount}명은 미배정으로 돌아갑니다 — 다른 팀에 다시 넣거나 자동 배분으로 채울 수 있습니다.`
                : '팀원이 없어 되돌릴 것 없이 해체됩니다.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/*
            🔴 **하드닝 실측(MG-08 3차)** — 실패해도 이 모달은 안 닫히는데(규칙 H),
            실패 사유는 탭 본문의 공용 배너(위 `failure`)에만 떴다. 그 배너는 이
            모달의 오버레이 **뒤에** 있어 안 보인다 — "제출이 있어 해체할 수 없다"고
            서버가 답해도 사용자에게는 [해체]가 다시 눌릴 수 있는 빈 모달로만 보였다.
            같은 실패를 모달 안에도 보여준다(`TeamEditDialog`·`TeamAutoAssignDialog`와
            같은 자리).
          */}
          {disbandTeam.error !== null &&
            (() => {
              const copy = errorCopy(disbandTeam.error, { subject: '팀', action: '해체' })
              return (
                <Alert variant="danger">
                  <AlertTitle>{copy.title}</AlertTitle>
                  <AlertDescription>{copy.description}</AlertDescription>
                </Alert>
              )
            })()}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disbandTeam.isPending}>취소</AlertDialogCancel>
            <AlertDialogAction
              variant="danger"
              disabled={disbandTeam.isPending}
              onClick={() => {
                if (!disbandTarget) return
                disbandTeam.mutate(
                  { path: { projectId, teamId: disbandTarget.teamId } },
                  { onSuccess: () => setDisbandTarget(null) },
                )
              }}
            >
              {disbandTeam.isPending && <Spinner className="size-3.5" />}
              해체
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {addingTeam && (
        <NewTeamPrompt
          value={newTeamName}
          onChange={setNewTeamName}
          pending={createTeam.isPending}
          onCancel={() => {
            setAddingTeam(false)
            setNewTeamName('')
          }}
          onConfirm={handleCreateTeam}
        />
      )}
    </div>
  )
}

/** "9"를 쳐도 "9팀"이 된다 — 이미 "팀"으로 끝나면 그대로 둔다("9팀팀" 방지) */
function withTeamSuffix(name: string): string {
  return name.endsWith('팀') ? name : `${name}팀`
}

function PhaseBadge({
  phase,
  locked,
}: {
  phase: TeamFormationStage | undefined
  locked: boolean | undefined
}) {
  /* 아직 모르면 **자리만 잡는다** — 「편성 전」으로 메우면 종료된 회차를 그렇게 말한다 */
  if (phase === undefined || locked === undefined) {
    return <Skeleton className="h-[22px] w-16 rounded-full" />
  }
  if (locked) {
    return (
      <Badge variant="neutral">
        <Lock className="size-3" />
        종료됨
      </Badge>
    )
  }
  const sealed = phase === 'CONFIRMED' || phase === 'CLOSED'
  return (
    <Badge variant={sealed ? 'info' : 'neutral'}>
      {sealed && <Lock className="size-3" />}
      {TEAM_STAGE_LABEL[phase]}
    </Badge>
  )
}

function NewTeamPrompt({
  value,
  onChange,
  pending,
  onCancel,
  onConfirm,
}: {
  value: string
  onChange: (v: string) => void
  pending: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    /*
      `w-fit` — 아래 표와 같은 폭으로 늘어나면 입력칸도 같이 늘어나 숫자와 "팀"이
      멀리 떨어져 보인다(실측 · 사용자 지적). 카드를 내용만큼만 감싸면 둘이 붙어 보인다.
    */
    <div className="border-border bg-surface-2 flex w-fit items-center gap-2 rounded-md border p-3">
      {/*
        **"팀"은 우리가 붙인다.** 설명 문구가 아니라 입력칸 자체에 박아 둔다 — 같은
        패턴을 반 이름 입력(`AddClassDialog`의 "반")이 이미 쓰고 있다. 저장될 이름이
        칸 안에 그대로 보이므로 사용자가 따로 "팀"을 안 쳐도 되고, 쳐도
        `withTeamSuffix`가 중복을 막는다.

        ⚠ **고정폭(`w-32`)이 아니라 `field-sizing-content`다**(사용자 지적). 고정폭이면
        긴 이름이 잘리거나 칸을 벗어난다 — 짧으면 숫자 하나만큼, 길면 그만큼 늘어나야
        "팀"이 항상 글자 바로 뒤에 붙어 보인다. `Textarea`가 세로로 쓰는 것과 같은
        속성을 가로로 쓴다.
      */}
      <InputGroup className="h-9 w-fit">
        <InputGroupInput
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="9"
          className="field-sizing-content w-auto min-w-24 max-w-48 flex-none"
        />
        <InputGroupAddon align="inline-end">
          <InputGroupText>팀</InputGroupText>
        </InputGroupAddon>
      </InputGroup>
      <Button variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
        취소
      </Button>
      <Button size="sm" onClick={onConfirm} disabled={pending}>
        {pending && <Spinner className="size-3.5" />}
        추가
      </Button>
    </div>
  )
}
