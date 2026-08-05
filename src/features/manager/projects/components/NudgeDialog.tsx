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
import { ROSTER, nudgeTeam, nudgePerson, type ProjectDetail, type Team } from '../mockData'

/*
  독촉 보내기 — 와이어프레임(#nudge) 그대로 **일괄 모달**. 전엔 행마다 개별
  "독촉" 버튼이었는데, 실제로 여러 팀·개인을 한 번에 독촉해야 하는 상황(마감
  임박)엔 일괄 쪽이 맞다(사용자 지시로 렌더 비교 후 교체).

  그룹 3종 — 미제출 팀 / 분석 실패 팀 / 기한 임박 개인. 문구는 상태별로 고정이다
  (`mockData.ts` "독촉 — 상태별 고정 문구, 커스텀 없음" 주석과 같은 원칙) —
  체크박스로 그룹째 빼는 것만 된다, 개별 메시지는 여기서 쓰지 않는다.

  ⚠ "미응시" → "기한 임박"으로 교체(사용자 지시). 전엔 `NOT_STARTED`(응시를
  아예 시작 안 한 사람)만 대상이었는데, 이제 **응시 완료(`DONE`)를 제외한
  모든 개인**으로 넓혔다 — `AVAILABLE`(응시 가능, 카운트다운 중)도 포함해야
  "기간이 얼마 남지 않았다"는 말이 실제로 맞다.
  · **`BLOCKED`는 그대로 뺀다** — "응시 자체가 열리지 않은 상태"(타입 주석)라
    "응시 가능한 날짜가 N일 남았습니다"를 보내면 사실과 다르다(재응시 발송
    모달의 "이미 다시 봤어요" 오표기와 같은 종류의 문제라 같은 원칙으로 뺐다).
    사용자 지시("응시 완료한 개인을 제외한 모든 개인")를 문자 그대로 따르면
    `BLOCKED`도 포함되지만, 그 문구를 보낼 근거 데이터(기한)조차 없어 판단으로
    제외했다 — 필요하면 확인받고 되돌린다.
  · `NOT_STARTED`엔 원래 `deadlineLabel`이 없었다(`mockData.ts` 참고 — 이제
    같은 팀 `AVAILABLE` 팀원과 같은 값으로 채워 넣었다. 응시 창은 팀의 코드
    분석 완료 시점에 함께 열리므로 같은 팀이면 마감도 같다).

  ⚠ 문구는 **"응시 가능한 기간이 얼마 남지 않았습니다."** 하나로 고정이다.
  한 번은 사람마다 남은 시간을 "N일"·"N시간 남음"으로 정확히 갈라 문구별로
  줄을 나눠 보여준 적이 있는데, 목록이 4~5줄로 늘어져 오히려 안 읽힌다는
  지적을 받고(사용자 — "일일히 나열하니까 보기 별로다") **문장 하나로
  되돌렸다.** 다른 두 그룹과 같은 `GroupRow` 단일 문구 패턴을 그대로 쓴다 —
  정확한 남은 기간은 제출 현황 표(`SubmissionTab`)의 "미응시 / D-2"류
  표기에서 이미 보여주고 있어 이 모달에서 또 안 보여줘도 된다.
*/

const ROSTER_NAME: Record<string, string> = Object.fromEntries(ROSTER.map((p) => [p.id, p.name]))

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  detail: ProjectDetail
  onSent: () => void
}

export default function NudgeDialog({ open, onOpenChange, projectId, detail, onSent }: Props) {
  const unsubmitted = detail.teams.filter((t) => !detail.submissions[t.id]?.submittedAt)
  const failed = detail.teams.filter((t) => detail.submissions[t.id]?.analysisStatus === 'FAILED')
  // 기한 임박 = 응시 완료(DONE)를 제외한 모든 개인, 단 BLOCKED(응시 자체가 안 열린 상태)는
  // 제외한다(사용자 지시 + 판단, 위 docblock 참고)
  const dueSoon = detail.teams
    .flatMap((t) => t.memberIds)
    .filter((id) => {
      const status = detail.attendance[id]?.status
      return status === 'AVAILABLE' || status === 'NOT_STARTED'
    })

  const [checkUnsub, setCheckUnsub] = useState(unsubmitted.length > 0)
  const [checkFailed, setCheckFailed] = useState(failed.length > 0)
  const [checkDueSoon, setCheckDueSoon] = useState(dueSoon.length > 0)
  const [sending, setSending] = useState(false)

  const groupCount = [
    checkUnsub && unsubmitted.length > 0,
    checkFailed && failed.length > 0,
    checkDueSoon && dueSoon.length > 0,
  ].filter(Boolean).length
  const recipientCount =
    (checkUnsub ? unsubmitted.reduce((n, t) => n + t.memberIds.length, 0) : 0) +
    (checkFailed ? failed.reduce((n, t) => n + t.memberIds.length, 0) : 0) +
    (checkDueSoon ? dueSoon.length : 0)

  async function handleSend() {
    setSending(true)
    try {
      if (checkUnsub) for (const t of unsubmitted) await nudgeTeam(projectId, t.id)
      if (checkFailed) for (const t of failed) await nudgeTeam(projectId, t.id)
      if (checkDueSoon) for (const id of dueSoon) await nudgePerson(projectId, id)
      onOpenChange(false)
      onSent()
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>독촉 보내기</DialogTitle>
        </DialogHeader>

        <p className="text-fg-subtle -mt-2 text-xs">
          받는 사람 · 상태에 맞는 문구가 자동으로 갑니다
        </p>

        <div className="flex flex-col gap-3">
          {unsubmitted.length > 0 && (
            <GroupRow
              checked={checkUnsub}
              onToggle={() => setCheckUnsub((v) => !v)}
              title={`미제출 ${unsubmitted.length}팀`}
              names={unsubmitted.map((t) => teamLabel(t)).join(' · ')}
              suffix="팀원 전원에게"
              message="팀에서 한 명만 제출하면 돼요"
            />
          )}
          {failed.length > 0 && (
            <GroupRow
              checked={checkFailed}
              onToggle={() => setCheckFailed((v) => !v)}
              title={`분석 실패 ${failed.length}팀`}
              names={failed.map((t) => teamLabel(t)).join(' · ')}
              suffix="팀원 전원에게"
              message="저장소를 확인하고 다시 제출해 주세요"
            />
          )}
          {dueSoon.length > 0 && (
            <GroupRow
              checked={checkDueSoon}
              onToggle={() => setCheckDueSoon((v) => !v)}
              title={`기한 임박 ${dueSoon.length}명`}
              names={dueSoon.map((id) => ROSTER_NAME[id] ?? id).join(' · ')}
              suffix="개인에게"
              message="응시 가능한 기간이 얼마 남지 않았습니다."
            />
          )}
          {unsubmitted.length === 0 && failed.length === 0 && dueSoon.length === 0 && (
            <p className="text-fg-subtle py-4 text-center text-sm">
              지금은 독촉이 필요한 대상이 없어요.
            </p>
          )}
        </div>

        <p className="text-fg-subtle text-2xs">
          문구는 상태별로 정해져 있어요. 개별 메시지는 면담에서 나눕니다.
        </p>

        <DialogFooter className="sm:justify-between">
          <p className="text-fg-subtle self-center text-xs">
            {groupCount}그룹 · {recipientCount}명에게 발송
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button disabled={recipientCount === 0 || sending} onClick={handleSend}>
              {sending ? '보내는 중…' : '보내기'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function teamLabel(t: Team): string {
  return t.name
}

function GroupRow({
  checked,
  onToggle,
  title,
  names,
  suffix,
  message,
}: {
  checked: boolean
  onToggle: () => void
  title: string
  names: string
  suffix: string
  message: string
}) {
  return (
    <label className="border-border flex items-start gap-2 rounded-md border p-2.5">
      <Checkbox checked={checked} onCheckedChange={onToggle} className="mt-0.5" />
      <span className="flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="text-fg-muted block text-xs">
          {names} {suffix} — &quot;{message}&quot;
        </span>
      </span>
    </label>
  )
}
