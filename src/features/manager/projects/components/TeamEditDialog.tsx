import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Checkbox } from '@/components/ui/Checkbox'
import { Button } from '@/components/ui/Button'
import { useAssignTeamMember, useRemoveTeamMember } from '../_/api/api'
import type { Team, UnassignedMember } from '../_/api/types'

/*
  팀 편집 — 좌우 리스트 + 이동 버튼(dual-list, 정의서 §3). 25명·8팀 규모라
  OP-06(250명·모드)과 달리 모달 하나로 충분하다. 칩(알약) 대신 체크박스
  목록을 쓴 이유도 정의서 그대로 — 인원이 늘면 칩은 줄바꿈이 지저분하고
  선택 상태가 안 보인다.

  🔴 **`moveOnly`(다른 팀에서 데려오기)를 뺐다.** 목의 ⑤ 제출 시작됨 국면 전용
  기능이었는데 서버 `teamFormationStage`에 그 국면이 없다 — 확정 뒤에는 편성이
  잠기고, 되돌리려면 `편성 다시 열기`를 거친다. 없는 국면을 위해 화면이 다른 팀
  전원을 훑는 목록을 유지하지 않는다.

  ⚠ **직전 회차 도달 단계(`직전 3단`)를 뺐다.** 목이 자동 배분 정렬 기준으로
  들고 있던 값인데 `TeamMemberResponse`·`UnassignedMemberResponse` 둘 다 이름과
  ID만 준다. 실력 섞기는 이제 서버가 하므로(`skillBalanced`) 화면이 그 값을
  보여줄 근거도 없다.

  ⚠ **배정과 해제가 쓰는 ID가 다르다** — 배정은 `projectMembershipId`(참여 ID),
  해제는 `traineeId`(사용자 ID)다. 한 사람이 두 ID를 갖고 있어 섞으면 404가 난다.
*/

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  team: Team
  unassigned: UnassignedMember[]
}

export default function TeamEditDialog({ open, onOpenChange, projectId, team, unassigned }: Props) {
  const [checkedMembers, setCheckedMembers] = useState<Set<string>>(new Set())
  const [checkedCandidates, setCheckedCandidates] = useState<Set<string>>(new Set())

  const assign = useAssignTeamMember()
  const remove = useRemoveTeamMember()
  const busy = assign.isPending || remove.isPending

  function toggle(set: Set<string>, setSet: (s: Set<string>) => void, id: string) {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSet(next)
  }

  function unassignChecked() {
    for (const traineeId of checkedMembers) {
      remove.mutate({ path: { projectId, teamId: team.teamId, traineeId } })
    }
    setCheckedMembers(new Set())
  }

  function addChecked() {
    for (const projectMembershipId of checkedCandidates) {
      assign.mutate({ path: { projectId, teamId: team.teamId }, body: { projectMembershipId } })
    }
    setCheckedCandidates(new Set())
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85svh] flex-col sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{team.name} 편집</DialogTitle>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-hidden">
          <div className="border-border flex flex-col overflow-hidden rounded-md border">
            <div className="bg-surface-2 border-border text-fg-muted border-b px-3 py-2 text-xs font-bold">
              팀원 {team.members.length}명
            </div>
            <div className="flex-1 overflow-y-auto">
              {team.members.length === 0 && (
                <p className="text-fg-subtle p-3 text-xs">아직 아무도 없습니다</p>
              )}
              {/* 해제는 사용자 ID로 한다 */}
              {team.members.map((p) => (
                <label
                  key={p.userId}
                  className="border-border flex items-center gap-2 border-b px-3 py-2 text-sm last:border-0"
                >
                  <Checkbox
                    checked={checkedMembers.has(p.userId)}
                    onCheckedChange={() => toggle(checkedMembers, setCheckedMembers, p.userId)}
                  />
                  <span className="flex-1">{p.name}</span>
                </label>
              ))}
            </div>
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
          </div>

          <div className="border-border flex flex-col overflow-hidden rounded-md border">
            <div className="bg-surface-2 border-border text-fg-muted border-b px-3 py-2 text-xs font-bold">
              미배정 ({unassigned.length}명)
            </div>
            <div className="flex-1 overflow-y-auto">
              {unassigned.length === 0 && (
                <p className="text-fg-subtle p-3 text-xs">미배정 인원이 없습니다</p>
              )}
              {/* 배정은 참여 ID로 한다 */}
              {unassigned.map((p) => (
                <label
                  key={p.projectMembershipId}
                  className="border-border flex items-center gap-2 border-b px-3 py-2 text-sm last:border-0"
                >
                  <Checkbox
                    checked={checkedCandidates.has(p.projectMembershipId)}
                    onCheckedChange={() =>
                      toggle(checkedCandidates, setCheckedCandidates, p.projectMembershipId)
                    }
                  />
                  <span className="flex-1">{p.name}</span>
                </label>
              ))}
            </div>
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
          </div>
        </div>

        <DialogFooter className="sm:justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
