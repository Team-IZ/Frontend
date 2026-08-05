import { useState } from 'react'
import { Lock, LockOpen, AlertTriangle, Trash2 } from 'lucide-react'
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
  TEAM_PHASE_LABEL,
  ROSTER,
  confirmTeamFormation,
  reopenTeamFormation,
  createTeam,
  deleteTeam,
  withParticle,
  type ProjectDetail,
  type Team,
} from '../mockData'
import TeamEditDialog from './TeamEditDialog'
import TeamAutoAssignDialog from './TeamAutoAssignDialog'

const ROSTER_NAME: Record<string, string> = Object.fromEntries(ROSTER.map((p) => [p.id, p.name]))

/*
  MG-08 팀 편성 탭 — 5국면 상태머신(정의서 §3·§6).

  국면별로 무엇이 가능한지가 전부 다르다:
  ① 편성 전(팀 0)      자동 배분 · 팀 추가 — 제출 잠김
  ② 편성 중(미배정 有)  팀 편집 자유 — `팀 편성 완료` 비활성 — 제출 잠김
  ③ 전원 배정          팀 편집 자유 — `팀 편성 완료` 활성 — 제출 잠김
  ④ 확정됨             🔒 · `편성 다시 열기` — 제출 열림(아직 아무도 안 냄)
  ⑤ 제출 시작됨        🔒 · `편성 다시 열기` 버튼 자체가 사라진다 — 팀 이동만

  "자동 배분"은 팀이 하나도 없을 때만 보인다(정의서 §5) — 이미 짜인 팀을
  뒤엎는 액션을 상시 노출하지 않는다.

  ⚠ 렌더 비교 반영 — 팀 목록을 카드 그리드에서 **표**(팀/인원/팀원/제출/편집)로
  바꿨다. 와이어프레임이 표로 그린다(CLAUDE.md §6 "리스트는 표" 표준과도 맞는다).
  자동 배분도 버튼 한 번에 바로 실행하지 않고 모달(`TeamAutoAssignDialog`)을
  띄운다 — 와이어프레임 "자동 배분 모달"(팀 크기·섞는 방법·겹침 회피)을 그대로.
*/

type Props = {
  projectId: string
  detail: ProjectDetail
  onReload: () => void
}

export default function TeamTab({ projectId, detail, onReload }: Props) {
  const [autoAssignOpen, setAutoAssignOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [conflicted, setConflicted] = useState<string[]>([])
  const [editTeam, setEditTeam] = useState<Team | null>(null)
  const [addingTeam, setAddingTeam] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Team | null>(null)
  const [deleting, setDeleting] = useState(false)

  const { teamPhase, teams, unassigned, locked } = detail
  const canEdit =
    !locked && (teamPhase === 'BEFORE' || teamPhase === 'FORMING' || teamPhase === 'READY')
  const canMoveOnly = !locked && teamPhase === 'SUBMITTING'
  const submissionsVisible = teamPhase === 'LOCKED' || teamPhase === 'SUBMITTING'

  function handleAutoAssigned(c: string[]) {
    setConflicted(c)
    onReload()
  }

  async function handleConfirm() {
    setConfirming(true)
    try {
      await confirmTeamFormation(projectId)
      onReload()
    } finally {
      setConfirming(false)
    }
  }

  async function handleReopen() {
    await reopenTeamFormation(projectId)
    onReload()
  }

  async function handleCreateTeam() {
    const name = newTeamName.trim() || `${teams.length + 1}팀`
    await createTeam(projectId, name)
    setNewTeamName('')
    setAddingTeam(false)
    onReload()
  }

  async function handleDeleteTeam() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteTeam(projectId, deleteTarget.id)
      setDeleteTarget(null)
      onReload()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <PhaseBadge phase={teamPhase} locked={locked} />
        <span className="text-fg-subtle text-xs">
          {teams.length}팀 · 미배정 {unassigned.length}명
        </span>

        <div className="ml-auto flex gap-2">
          {!locked && teamPhase === 'BEFORE' && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setAddingTeam(true)}>
                팀 추가
              </Button>
              <Button size="sm" onClick={() => setAutoAssignOpen(true)}>
                자동 배분
              </Button>
            </>
          )}
          {!locked && (teamPhase === 'FORMING' || teamPhase === 'READY') && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setAddingTeam(true)}>
                팀 추가
              </Button>
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={teamPhase !== 'READY' || confirming}
              >
                {confirming ? '확정 중…' : '팀 편성 완료'}
              </Button>
            </>
          )}
          {!locked && teamPhase === 'LOCKED' && (
            <Button variant="ghost" size="sm" onClick={handleReopen}>
              <LockOpen className="size-3.5" />
              편성 다시 열기
            </Button>
          )}
        </div>
      </div>

      {!locked && teamPhase === 'READY' && (
        <Alert variant="warning">
          <AlertTriangle />
          <AlertTitle>확정하면 학생들이 코드를 제출할 수 있게 되고, 팀은 잠깁니다</AlertTitle>
          <AlertDescription>
            제출이 시작되기 전까지는 `편성 다시 열기`로 되돌릴 수 있습니다.
          </AlertDescription>
        </Alert>
      )}

      {conflicted.length > 0 && (
        <Alert variant="warning">
          <AlertTriangle />
          <AlertTitle>
            {withParticle(conflicted.join(', '), '은', '는')} 직전 회차와 겹치는 인원을 완전히 못
            피했습니다
          </AlertTitle>
          <AlertDescription>
            20회 재추첨해도 겹침이 남아 그대로 두었습니다. 필요하면 팀 편집으로 직접 조정하세요.
          </AlertDescription>
        </Alert>
      )}

      {!locked && unassigned.length > 0 && teamPhase !== 'BEFORE' && (
        <Alert variant="warning">
          <AlertTriangle />
          <AlertTitle>미배정 {unassigned.length}명이 남아 있어 제출이 열리지 않습니다</AlertTitle>
          <AlertDescription>
            {unassigned.map((p) => p.name).join(', ')} — 팀을 눌러 편집하면 여기서 배정할 수
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
              <TableHead className="w-20">팀</TableHead>
              <TableHead className="w-16">인원</TableHead>
              <TableHead>팀원</TableHead>
              {submissionsVisible && <TableHead className="w-24">제출</TableHead>}
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams.map((team) => {
              const submitted = !!detail.submissions[team.id]?.submittedAt
              const canEditThis = canEdit || canMoveOnly
              return (
                <TableRow key={team.id}>
                  <TableCell className="font-bold">{team.name}</TableCell>
                  <TableCell className="text-fg-muted text-xs">{team.memberIds.length}명</TableCell>
                  <TableCell className="text-fg-muted text-xs">
                    {team.memberIds.map((id) => ROSTER_NAME[id] ?? id).join(' · ')}
                  </TableCell>
                  {submissionsVisible && (
                    <TableCell>
                      <Badge variant={submitted ? 'success' : 'warning'}>
                        {submitted ? '제출됨' : '미제출'}
                      </Badge>
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!canEditThis}
                        onClick={() => setEditTeam(team)}
                      >
                        편집
                      </Button>
                      {/* 삭제는 확정 전에만 — canMoveOnly(제출 시작됨)는 팀이 이미 잠긴 뒤라 뺀다 */}
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-danger hover:bg-danger-soft p-1.5"
                          aria-label={`${team.name} 삭제`}
                          onClick={() => setDeleteTarget(team)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      {editTeam && (
        <TeamEditDialog
          open={!!editTeam}
          onOpenChange={(o) => !o && setEditTeam(null)}
          projectId={projectId}
          team={editTeam}
          detail={detail}
          moveOnly={canMoveOnly}
          onSaved={onReload}
        />
      )}

      <TeamAutoAssignDialog
        open={autoAssignOpen}
        onOpenChange={setAutoAssignOpen}
        projectId={projectId}
        unassignedCount={unassigned.length}
        canMixByReach={unassigned.some((p) => p.prevReach !== null)}
        onAssigned={handleAutoAssigned}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && !deleting && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-danger-soft text-danger">
              <Trash2 />
            </AlertDialogMedia>
            <AlertDialogTitle>{deleteTarget?.name}을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && deleteTarget.memberIds.length > 0
                ? `팀원 ${deleteTarget.memberIds.length}명은 미배정으로 돌아갑니다 — 다른 팀에 다시 넣을 수 있습니다.`
                : '아직 팀원이 없어 되돌릴 것 없이 바로 지워집니다.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>취소</AlertDialogCancel>
            <AlertDialogAction variant="danger" disabled={deleting} onClick={handleDeleteTeam}>
              {deleting && <Spinner className="size-3.5" />}
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {addingTeam && (
        <NewTeamPrompt
          value={newTeamName}
          onChange={setNewTeamName}
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

function PhaseBadge({ phase, locked }: { phase: ProjectDetail['teamPhase']; locked: boolean }) {
  if (locked) {
    return (
      <Badge variant="neutral">
        <Lock className="size-3" />
        종료됨
      </Badge>
    )
  }
  const variant = phase === 'LOCKED' || phase === 'SUBMITTING' ? 'info' : 'neutral'
  return (
    <Badge variant={variant}>
      {(phase === 'LOCKED' || phase === 'SUBMITTING') && <Lock className="size-3" />}
      {TEAM_PHASE_LABEL[phase]}
    </Badge>
  )
}

function NewTeamPrompt({
  value,
  onChange,
  onCancel,
  onConfirm,
}: {
  value: string
  onChange: (v: string) => void
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
      <Button variant="ghost" size="sm" onClick={onCancel}>
        취소
      </Button>
      <Button size="sm" onClick={onConfirm}>
        추가
      </Button>
    </div>
  )
}
