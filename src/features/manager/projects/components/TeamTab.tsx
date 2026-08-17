import { useState } from 'react'
import { Lock, LockOpen, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHead,
  TableRow,
} from '@/components/ui/Table'
import { errorCopy } from '@/lib/errorCopy'
import { useTeams, useCreateTeam, useConfirmTeams, useReopenTeams } from '../_/api/api'
import { TEAM_STAGE_LABEL, type Team, type TeamFormationStage } from '../_/api/types'
import TeamEditDialog from './TeamEditDialog'
import TeamAutoAssignDialog from './TeamAutoAssignDialog'

/*
  MG-08 팀 편성 탭 — 5국면 상태머신(정의서 §3·§6).

  국면별로 무엇이 가능한지가 전부 다르다:
  ① 편성 전(NOT_STARTED)     자동 배분 · 팀 추가 — 제출 잠김
  ② 편성 중(FORMING)         팀 편집 자유 — `팀 편성 완료` 비활성 — 제출 잠김
  ③ 전원 배정(READY_TO_CONFIRM) 팀 편집 자유 — `팀 편성 완료` 활성 — 제출 잠김
  ④ 확정됨(CONFIRMED)        🔒 · `편성 다시 열기` — 제출 열림
  ⑤ 종료(CLOSED)             🔒 · 편성 액션 전부 잠김

  "자동 배분"은 팀이 하나도 없을 때만 보인다(정의서 §5) — 이미 짜인 팀을
  뒤엎는 액션을 상시 노출하지 않는다.

  ⚠ **국면을 서버가 준다**(`teamFormationStage`) — 목은 `teams.length`·
  `unassigned.length`에서 화면이 파생했다. 목의 5국면과 값이 1:1인데 ⑤만 다르다:
  목의 `SUBMITTING`(제출 시작됨)이 서버에는 없고 대신 `CLOSED`(종료된 회차)가 있다.
  제출이 시작됐는지는 `submissionOpened`로 따로 오므로 국면에 섞지 않는다.

  🔴 **쓰기가 실패하면 말한다**(하드닝 실측). 확정을 가로채 409를 만들었더니 화면이
  **아무 말도 안 했다** — 눌렀고, 실패했고, 버튼만 원래대로 돌아갔다. 사용자는 됐는지
  안 됐는지 알 수 없다. `lib/errorCopy`가 코드·상태를 보고 문구를 정한다(원인을
  추측해 하나로 묶지 않는다 — OP 반 추가에서 이미 겪은 것).

  🔴 **팀 삭제 버튼을 뺐다.** 서버에 삭제 오퍼레이션이 없다(팀 생성·수정·확정·
  다시 열기·자동 배분·팀원 배정/해제만 있다). 목에는 `deleteTeam`이 있었지만
  화면이 지어낸 성공은 새로 고치면 사라진다. 32차 요청서로 올린다.

  ⚠ **반 열이 생겼다.** 담당 반이 여럿이면 팀 번호가 반마다 1부터 다시 시작해
  한 목록에 `1팀`이 반 수만큼 나온다(30차 R4). 반 없이는 팀을 구분할 수 없다.
*/

type Props = {
  projectId: string
  /** 제출 현황이 준다 — 아직 못 읽었으면 없다 */
  stage: string | undefined
  locked: boolean
  /** 이미 제출한 팀 수 — 확정 경고 문구가 이 값으로 갈린다(아래) */
  submittedTeamCount: number
}

export default function TeamTab({ projectId, stage, locked, submittedTeamCount }: Props) {
  const [autoAssignOpen, setAutoAssignOpen] = useState(false)
  const [editTeam, setEditTeam] = useState<Team | null>(null)
  const [addingTeam, setAddingTeam] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')

  const teamList = useTeams(projectId)
  const createTeam = useCreateTeam()
  const confirmTeams = useConfirmTeams()
  const reopenTeams = useReopenTeams()

  if (teamList.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="size-6" aria-label="팀을 불러오는 중" />
      </div>
    )
  }

  if (teamList.isError || !teamList.data) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>팀을 불러오지 못했습니다</EmptyTitle>
          <EmptyDescription>잠시 후 다시 시도해 주세요.</EmptyDescription>
        </EmptyHeader>
        <Button variant="ghost" onClick={() => void teamList.refetch()}>
          다시 시도
        </Button>
      </Empty>
    )
  }

  const { unassignedMembers, unassignedCount } = teamList.data
  const phase = (stage ?? 'NOT_STARTED') as TeamFormationStage

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

  const canEdit =
    !locked && (phase === 'NOT_STARTED' || phase === 'FORMING' || phase === 'READY_TO_CONFIRM')

  /* 담당 반이 여럿이면 자동 배분이 400(MANAGER_CLASSROOM_AMBIGUOUS)이다 */
  const classIds = new Set(teams.map((t) => t.classId))
  const autoAssignAmbiguous = classIds.size > 1

  /* 쓰기 넷 중 마지막으로 실패한 것 — 하나만 띄운다(연달아 누르면 마지막 것이 맞다) */
  const failure = confirmTeams.error ?? reopenTeams.error ?? createTeam.error
  const failureAction = confirmTeams.error
    ? '확정'
    : reopenTeams.error
      ? '다시 열기'
      : createTeam.error
        ? '추가'
        : undefined

  function handleCreateTeam() {
    const name = newTeamName.trim() || `${teams.length + 1}팀`
    createTeam.mutate(
      { path: { projectId }, body: { name } },
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
      <div className="flex flex-wrap items-center gap-2">
        <PhaseBadge phase={phase} locked={locked} />
        <span className="text-fg-subtle text-xs">
          {teams.length}팀 · 미배정 {unassignedCount}명
        </span>

        <div className="ml-auto flex gap-2">
          {!locked && phase === 'NOT_STARTED' && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setAddingTeam(true)}>
                팀 추가
              </Button>
              <Button size="sm" onClick={() => setAutoAssignOpen(true)}>
                자동 배분
              </Button>
            </>
          )}
          {!locked && (phase === 'FORMING' || phase === 'READY_TO_CONFIRM') && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setAddingTeam(true)}>
                팀 추가
              </Button>
              <Button
                size="sm"
                onClick={() => confirmTeams.mutate({ path: { projectId } })}
                disabled={phase !== 'READY_TO_CONFIRM' || confirmTeams.isPending}
              >
                {confirmTeams.isPending ? '확정 중…' : '팀 편성 완료'}
              </Button>
            </>
          )}
          {!locked && phase === 'CONFIRMED' && (
            <Button
              variant="ghost"
              size="sm"
              disabled={reopenTeams.isPending}
              onClick={() => reopenTeams.mutate({ path: { projectId } })}
            >
              <LockOpen className="size-3.5" />
              편성 다시 열기
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
      {!locked && phase === 'READY_TO_CONFIRM' && (
        <Alert variant="warning">
          <AlertTriangle />
          {submittedTeamCount > 0 ? (
            <>
              <AlertTitle>확정 전인데 이미 {submittedTeamCount}팀이 제출했습니다</AlertTitle>
              <AlertDescription>
                편성을 바꾸면 낸 코드와 팀이 어긋날 수 있습니다. 확정만 하고 팀은 건드리지 마세요.
              </AlertDescription>
            </>
          ) : (
            <>
              <AlertTitle>확정하면 학생들이 코드를 제출할 수 있게 되고, 팀은 잠깁니다</AlertTitle>
              <AlertDescription>
                제출이 시작되기 전까지는 `편성 다시 열기`로 되돌릴 수 있습니다.
              </AlertDescription>
            </>
          )}
        </Alert>
      )}

      {!locked && unassignedCount > 0 && phase !== 'NOT_STARTED' && (
        <Alert variant="warning">
          <AlertTriangle />
          <AlertTitle>미배정 {unassignedCount}명이 남아 있어 제출이 열리지 않습니다</AlertTitle>
          <AlertDescription>
            {unassignedMembers.map((p) => p.name).join(', ')} — 팀을 눌러 편집하면 여기서 배정할 수
            있습니다.
          </AlertDescription>
        </Alert>
      )}

      {teams.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>아직 팀이 없어요</EmptyTitle>
            <EmptyDescription>자동 배분을 누르거나 팀을 하나씩 추가하세요.</EmptyDescription>
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
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!canEdit}
                      onClick={() => setEditTeam(team)}
                    >
                      편집
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {editTeam && (
        <TeamEditDialog
          open={!!editTeam}
          onOpenChange={(o) => !o && setEditTeam(null)}
          projectId={projectId}
          team={editTeam}
          unassigned={unassignedMembers}
        />
      )}

      <TeamAutoAssignDialog
        open={autoAssignOpen}
        onOpenChange={setAutoAssignOpen}
        projectId={projectId}
        unassignedCount={unassignedCount}
        ambiguousClassroom={autoAssignAmbiguous}
      />

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

function PhaseBadge({ phase, locked }: { phase: TeamFormationStage; locked: boolean }) {
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
    <div className="border-border bg-surface-2 flex items-center gap-2 rounded-md border p-3">
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="예: 9팀"
        className="border-border-strong bg-surface flex-1 rounded-md border px-3 py-1.5 text-sm"
      />
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
