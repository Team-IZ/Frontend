import { useState } from 'react'
import { Check, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { useAutoAssignTeams } from '../_/api/api'

/*
  자동 배분 모달 — 와이어프레임(#team-auto) 그대로: 팀 크기 · 섞는 방법,
  그리고 배분하기.

  🔴 **"지난 회차 겹침 회피"를 뺐다.** 목이 화면에서 20회 재추첨하던 규칙인데
  `AutoAssignTeamsRequest`에 그 파라미터가 없다(`teamSize`·`skillBalanced` 둘뿐).
  못 피한 팀을 알려주던 경고도 함께 사라졌다 — 응답이 `TeamResponse[]`라 어느 팀이
  겹쳤는지 오지 않는다. 32차 요청서로 올린다.

  ⚠ **팀 크기가 범위가 아니라 값 하나다.** 목은 "3~4명" 같은 범위를 골라 화면이
  분배를 계산했는데 서버는 목표 인원 하나를 받는다 — 나머지 처리는 서버 몫이라
  화면이 미리 나눠 보여주지 않는다(같은 규칙이 양쪽에 생긴다).

  ⚠ **실력 섞기에 선택 조건을 걸지 않는다.** 목은 "직전 회차 기록이 없으면 무작위만"
  이었는데 그 기록이 있는지는 화면이 알 수 없다(팀·미배정 응답에 도달 단계가 없다).
  기록이 없을 때 어떻게 되는지는 서버가 정한다.
*/

/** 목표 인원 — 서버가 값 하나를 받는다 */
const TEAM_SIZES = [2, 3, 4, 5, 6]

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  unassignedCount: number
  /** 담당 반이 여럿이면 서버가 반을 하나로 못 정한다(400 `MANAGER_CLASSROOM_AMBIGUOUS`) */
  ambiguousClassroom: boolean
}

const items = Object.fromEntries(TEAM_SIZES.map((n) => [String(n), `${n}명씩`]))

export default function TeamAutoAssignDialog({
  open,
  onOpenChange,
  projectId,
  unassignedCount,
  ambiguousClassroom,
}: Props) {
  const [teamSize, setTeamSize] = useState(4)
  const [skillBalanced, setSkillBalanced] = useState(false)

  const autoAssign = useAutoAssignTeams()

  function handleAssign() {
    autoAssign.mutate(
      { path: { projectId }, body: { teamSize, skillBalanced } },
      { onSuccess: () => onOpenChange(false) },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>자동 배분 · {unassignedCount}명</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {ambiguousClassroom && (
            <Alert variant="warning">
              <AlertTriangle />
              <AlertTitle>담당 반이 여럿이라 자동 배분을 쓸 수 없습니다</AlertTitle>
              <AlertDescription>반마다 팀을 직접 추가해 편성하세요.</AlertDescription>
            </Alert>
          )}

          <div>
            <p className="text-fg-muted mb-1.5 text-xs font-bold">팀 크기</p>
            <Select
              value={String(teamSize)}
              onValueChange={(v) => v && setTeamSize(Number(v))}
              items={items}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEAM_SIZES.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}명씩
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-fg-subtle mt-1.5 text-2xs">
              딱 나눠지지 않는 인원은 서버가 남는 팀에 붙입니다.
            </p>
          </div>

          <div>
            <p className="text-fg-muted mb-1.5 text-xs font-bold">섞는 방법</p>
            <div className="flex flex-col gap-1.5">
              <RadioRow
                checked={!skillBalanced}
                onSelect={() => setSkillBalanced(false)}
                title="무작위"
                desc="그냥 섞어서 나눕니다"
              />
              <RadioRow
                checked={skillBalanced}
                onSelect={() => setSkillBalanced(true)}
                title="실력 섞기"
                desc="직전 회차 도달 단계가 한쪽에 몰리지 않게 나눕니다"
              />
            </div>
          </div>

          <p className="text-fg-subtle text-2xs">
            결과가 마음에 안 들면 다시 실행하거나 팀 편집으로 바꾸면 돼요.
          </p>
        </div>

        <DialogFooter className="sm:justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button disabled={autoAssign.isPending || ambiguousClassroom} onClick={handleAssign}>
            {autoAssign.isPending ? '배분 중…' : '배분하기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RadioRow({
  checked,
  onSelect,
  title,
  desc,
}: {
  checked: boolean
  onSelect: () => void
  title: string
  desc: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex items-start gap-2 rounded-md border px-3 py-2 text-left transition-colors',
        checked ? 'border-primary-border bg-primary-soft' : 'border-border bg-surface',
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex size-4 flex-none items-center justify-center rounded-full border',
          checked ? 'border-primary bg-primary text-white' : 'border-border-strong bg-surface',
        )}
      >
        {checked && <Check className="size-3" />}
      </span>
      <span className="flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="text-fg-subtle block text-2xs">{desc}</span>
      </span>
    </button>
  )
}
