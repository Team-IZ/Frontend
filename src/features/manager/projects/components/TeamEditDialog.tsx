import { useState } from 'react'
import { ArrowLeftRight, AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Alert, AlertTitle } from '@/components/ui/Alert'
import { Checkbox } from '@/components/ui/Checkbox'
import { Button } from '@/components/ui/Button'
import { moveMember, withParticle, ROSTER, type ProjectDetail, type Team } from '../mockData'

/*
  팀 편집 — 좌우 리스트 + 이동 버튼(dual-list, 정의서 §3). 25명·8팀 규모라
  OP-06(250명·모드)과 달리 모달 하나로 충분하다. 칩(알약) 대신 체크박스
  목록을 쓴 이유도 정의서 그대로 — 인원이 늘면 칩은 줄바꿈이 지저분하고
  선택 상태가 안 보인다.

  `moveOnly`(⑤ 제출 시작됨) — 팀이 이미 잠긴 뒤라 자유 편집이 아니라 **다른
  팀에서 한 명씩 데려오는 것만** 된다. 데려오면 그 사람은 새 팀이 낸 코드로
  응시하게 되므로 건마다 경고 확인을 받는다(정의서 §3).
*/

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  team: Team
  detail: ProjectDetail
  moveOnly: boolean
  onSaved: () => void
}

const byId = (id: string) => ROSTER.find((p) => p.id === id)

export default function TeamEditDialog({
  open,
  onOpenChange,
  projectId,
  team,
  detail,
  moveOnly,
  onSaved,
}: Props) {
  const [checkedMembers, setCheckedMembers] = useState<Set<string>>(new Set())
  const [checkedCandidates, setCheckedCandidates] = useState<Set<string>>(new Set())
  const [confirmMoveId, setConfirmMoveId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const members = team.memberIds.map(byId).filter((p) => p !== undefined)
  const otherTeamMembers = detail.teams
    .filter((t) => t.id !== team.id)
    .flatMap((t) => t.memberIds.map((id) => ({ person: byId(id), fromTeam: t.name })))
    .filter(
      (x): x is { person: NonNullable<ReturnType<typeof byId>>; fromTeam: string } => !!x.person,
    )

  function toggle(set: Set<string>, setSet: (s: Set<string>) => void, id: string) {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSet(next)
  }

  async function unassignChecked() {
    setBusy(true)
    for (const id of checkedMembers) await moveMember(projectId, id, null)
    setCheckedMembers(new Set())
    onSaved()
    setBusy(false)
  }

  async function addChecked() {
    setBusy(true)
    for (const id of checkedCandidates) await moveMember(projectId, id, team.id)
    setCheckedCandidates(new Set())
    onSaved()
    setBusy(false)
  }

  async function moveToThisTeam(id: string) {
    setBusy(true)
    await moveMember(projectId, id, team.id)
    setBusy(false)
    setConfirmMoveId(null)
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85svh] flex-col sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{team.name} 편집</DialogTitle>
        </DialogHeader>

        {moveOnly && (
          <Alert variant="warning">
            <AlertTriangle />
            <AlertTitle>
              제출이 시작돼 팀은 잠겼습니다 — 다른 팀에서 데려오는 것만 됩니다
            </AlertTitle>
          </Alert>
        )}

        <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-hidden">
          <div className="border-border flex flex-col overflow-hidden rounded-md border">
            <div className="bg-surface-2 border-border text-fg-muted border-b px-3 py-2 text-xs font-bold">
              팀원 {members.length}명
            </div>
            <div className="flex-1 overflow-y-auto">
              {members.length === 0 && (
                <p className="text-fg-subtle p-3 text-xs">아직 아무도 없습니다</p>
              )}
              {members.map((p) => (
                <label
                  key={p.id}
                  className="border-border flex items-center gap-2 border-b px-3 py-2 text-sm last:border-0"
                >
                  {!moveOnly && (
                    <Checkbox
                      checked={checkedMembers.has(p.id)}
                      onCheckedChange={() => toggle(checkedMembers, setCheckedMembers, p.id)}
                    />
                  )}
                  <span className="flex-1">{p.name}</span>
                  {p.prevReach !== null && (
                    <span className="text-fg-subtle text-2xs">직전 {p.prevReach}단</span>
                  )}
                </label>
              ))}
            </div>
            {!moveOnly && (
              <div className="border-border border-t p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  disabled={checkedMembers.size === 0 || busy}
                  onClick={unassignChecked}
                >
                  미배정으로 보내기
                </Button>
              </div>
            )}
          </div>

          <div className="border-border flex flex-col overflow-hidden rounded-md border">
            <div className="bg-surface-2 border-border text-fg-muted border-b px-3 py-2 text-xs font-bold">
              {moveOnly
                ? `다른 팀 (${otherTeamMembers.length}명)`
                : `미배정 (${detail.unassigned.length}명)`}
            </div>
            <div className="flex-1 overflow-y-auto">
              {moveOnly ? (
                <>
                  {otherTeamMembers.length === 0 && (
                    <p className="text-fg-subtle p-3 text-xs">데려올 사람이 없습니다</p>
                  )}
                  {otherTeamMembers.map(({ person: p, fromTeam }) => (
                    <div
                      key={p.id}
                      className="border-border flex items-center gap-2 border-b px-3 py-2 text-sm last:border-0"
                    >
                      <span className="flex-1">{p.name}</span>
                      <span className="text-fg-subtle text-2xs">{fromTeam}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-1.5"
                        aria-label={`${p.name}을 ${team.name}으로 이동`}
                        onClick={() => setConfirmMoveId(p.id)}
                      >
                        <ArrowLeftRight className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  {detail.unassigned.length === 0 && (
                    <p className="text-fg-subtle p-3 text-xs">미배정 인원이 없습니다</p>
                  )}
                  {detail.unassigned.map((p) => (
                    <label
                      key={p.id}
                      className="border-border flex items-center gap-2 border-b px-3 py-2 text-sm last:border-0"
                    >
                      <Checkbox
                        checked={checkedCandidates.has(p.id)}
                        onCheckedChange={() =>
                          toggle(checkedCandidates, setCheckedCandidates, p.id)
                        }
                      />
                      <span className="flex-1">{p.name}</span>
                      {p.prevReach !== null && (
                        <span className="text-fg-subtle text-2xs">직전 {p.prevReach}단</span>
                      )}
                    </label>
                  ))}
                </>
              )}
            </div>
            {!moveOnly && (
              <div className="border-border border-t p-2">
                <Button
                  size="sm"
                  className="w-full"
                  disabled={checkedCandidates.size === 0 || busy}
                  onClick={addChecked}
                >
                  이 팀에 추가
                </Button>
              </div>
            )}
          </div>
        </div>

        {confirmMoveId && (
          <Alert variant="warning">
            <AlertTriangle />
            <AlertTitle>
              {withParticle(byId(confirmMoveId)?.name ?? '', '을', '를')} {team.name}으로
              이동할까요?
            </AlertTitle>
            <div className="mt-2 flex items-center gap-2">
              <p className="text-warning flex-1 text-xs">
                이 사람은 앞으로 {withParticle(team.name, '이', '가')} 낸 코드로 응시하게 됩니다.
              </p>
              <Button variant="ghost" size="sm" onClick={() => setConfirmMoveId(null)}>
                취소
              </Button>
              <Button size="sm" disabled={busy} onClick={() => moveToThisTeam(confirmMoveId)}>
                이동
              </Button>
            </div>
          </Alert>
        )}

        <DialogFooter className="sm:justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
