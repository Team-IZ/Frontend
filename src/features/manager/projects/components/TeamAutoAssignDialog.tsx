import { useState } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Checkbox } from '@/components/ui/Checkbox'
import { Button } from '@/components/ui/Button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { TEAM_SIZE_RANGES, autoAssignTeams, planAutoAssign, type TeamSizeRange } from '../mockData'

/*
  자동 배분 모달 — 와이어프레임(#team-auto) 그대로: 팀 크기(범위) · 섞는 방법
  (무작위/실력 섞기) · 지난 회차 겹침 회피, 실시간 미리보기 + 배분하기.

  이전엔 버튼 하나로 바로 실행했는데(값 고정), 사용자가 "와이어프레임쪽으로
  바꿔달라"고 명시해 옵션을 실제로 mockData의 `autoAssign` 로직에 흘려보내는
  형태로 다시 짰다 — 모달에서 고른 값이 배분 결과에 실제로 반영된다.
*/

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  unassignedCount: number
  /** 직전 회차 기록이 하나도 없으면 "실력 섞기"를 고를 수 없다(와이어 "1차라면 무작위만") */
  canMixByReach: boolean
  onAssigned: (conflicted: string[]) => void
}

const items = Object.fromEntries(TEAM_SIZE_RANGES.map((r) => [String(r.max), r.label]))

export default function TeamAutoAssignDialog({
  open,
  onOpenChange,
  projectId,
  unassignedCount,
  canMixByReach,
  onAssigned,
}: Props) {
  const [range, setRange] = useState<TeamSizeRange>(TEAM_SIZE_RANGES[1])
  const [mixByReach, setMixByReach] = useState(canMixByReach)
  const [avoidOverlap, setAvoidOverlap] = useState(true)
  const [assigning, setAssigning] = useState(false)

  const preview = planAutoAssign(unassignedCount, range.max)
  const previewLabel = preview.sizes.map((s) => `${s.size}명 ${s.count}팀`).join(' · ')

  async function handleAssign() {
    setAssigning(true)
    try {
      const { conflicted } = await autoAssignTeams(projectId, {
        maxSize: range.max,
        mixByReach: mixByReach && canMixByReach,
        avoidOverlap,
      })
      onOpenChange(false)
      onAssigned(conflicted)
    } finally {
      setAssigning(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>자동 배분 · {unassignedCount}명</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <div>
            <p className="text-fg-muted mb-1.5 text-xs font-bold">팀 크기</p>
            <div className="flex items-center gap-2">
              <Select
                value={String(range.max)}
                onValueChange={(v) => {
                  const found = TEAM_SIZE_RANGES.find((r) => String(r.max) === v)
                  if (found) setRange(found)
                }}
                items={items}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEAM_SIZE_RANGES.map((r) => (
                    <SelectItem key={r.max} value={String(r.max)}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-fg-subtle text-xs">
                → {preview.teamCount}팀 · {previewLabel}
              </span>
            </div>
            <p className="text-fg-subtle mt-1.5 text-2xs">
              인원이 딱 나눠지지 않아 범위로 고릅니다 — 단일 인원으로 고정하면 남는 사람이 생겨요.
            </p>
          </div>

          <div>
            <p className="text-fg-muted mb-1.5 text-xs font-bold">섞는 방법</p>
            <div className="flex flex-col gap-1.5">
              <RadioRow
                checked={!mixByReach}
                onSelect={() => setMixByReach(false)}
                title="무작위"
                desc="그냥 섞어서 나눕니다"
              />
              <RadioRow
                checked={mixByReach}
                disabled={!canMixByReach}
                onSelect={() => canMixByReach && setMixByReach(true)}
                title="실력 섞기"
                desc="직전 회차 도달 단계가 한쪽에 몰리지 않게 나눕니다"
              />
            </div>
            <p className="text-fg-subtle mt-1.5 text-2xs">
              {canMixByReach
                ? '이번은 직전 기록이 있어 실력 섞기를 쓸 수 있어요.'
                : '직전 회차 기록이 없어 무작위만 쓸 수 있습니다.'}
            </p>
          </div>

          <label className="flex items-start gap-2">
            <Checkbox checked={avoidOverlap} onCheckedChange={() => setAvoidOverlap((v) => !v)} />
            <span className="flex-1">
              <span className="block text-sm font-semibold">지난 회차와 겹치지 않게</span>
              <span className="text-fg-subtle block text-2xs">
                2명 이상 겹치는 팀은 다시 뽑아요 — 안 되면 그대로 두고 알려드립니다
              </span>
            </span>
          </label>

          <p className="text-fg-subtle text-2xs">
            결과가 마음에 안 들면 다시 실행하거나 팀 편집으로 바꾸면 돼요.
          </p>
        </div>

        <DialogFooter className="sm:justify-between">
          <p className="text-fg-subtle self-center text-xs">
            {unassignedCount}명이 {preview.teamCount}팀으로 나뉩니다
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button disabled={assigning} onClick={handleAssign}>
              {assigning ? '배분 중…' : '배분하기'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RadioRow({
  checked,
  disabled,
  onSelect,
  title,
  desc,
}: {
  checked: boolean
  disabled?: boolean
  onSelect: () => void
  title: string
  desc: string
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'flex items-start gap-2 rounded-md border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
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
