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
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { errorCopy } from '@/lib/errorCopy'
import { useAutoAssignTeams } from '../_/api/api'

/*
  자동 배분 모달 — 계약이 `AutoAssignTeamsRequest` 셋이라 화면도 셋이다:
  `classId`(부모가 정한다) · `teamSize` · `skillBalanced`.

  **스펙이 정본이다.** 기획 문서는 이 화면보다 앞서 쓰였고 그 뒤로 계약이 여러 번
  바뀌었다 — 거기 적힌 배분 규칙(겹침 회피 재추첨, 실력 섞기 선택 조건, 미배정에
  도달 단계 표시)은 요청 스키마에도 응답에도 자리가 없다. **없는 것을 빚으로 적어
  두지 않는다** — 화면이 배분 규칙을 도로 갖는 순간 같은 판정이 두 곳에 생긴다.

  ⚠ **`teamSize`는 범위가 아니라 값 하나다.** 나머지 인원 처리는 서버 몫이라
  화면이 미리 나눠 보여주지 않는다.

  ⚠ **`skillBalanced`에 선택 조건을 걸지 않는다.** 직전 회차 기록이 있는지는 화면이
  알 수 없어(응답에 도달 단계가 없다) 비활성으로 막을 근거가 없다. 대신 **고르면
  조건을 말한다** — 스펙이 "근거 없이 '실력 섞기'라 표시하지 않기 위해 화면에는 이
  경우를 안내하는 것을 권한다"고 적고 있다.

  두 라벨은 **스펙 문구 그대로**다 — `skillBalanced` 설명이
  "true면 직전 회차 도달 단계 기준 실력 섞기, false면 무작위"이다.
*/

/*
  고를 수 있는 목표 인원.

  ⚠ **스펙에는 `minimum: 1`뿐이고 상한이 없다** — 이 목록은 화면이 정한 범위다.
  1은 넣지 않았다(한 명짜리 팀은 팀이 아니다). 서버는 받으므로 기획에서 값이
  나오면 여기만 바꾼다.
*/
const TEAM_SIZES = [2, 3, 4, 5, 6]

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  /**
   * 배분할 반 — **필수다**(33차 백엔드). 대상 인원도 선행 조건도 이 반 기준이 된다.
   *
   * 종전에는 서버가 매니저의 담당 반을 역산했고 반이 둘이면 400이었다. 그 폴백이
   * 사라져 부르는 쪽이 정한다 — 반이 안 정해졌으면 `TeamTab`이 이 모달을 안 연다.
   */
  classId: string
  unassignedCount: number
}

const items = Object.fromEntries(TEAM_SIZES.map((n) => [String(n), `${n}명씩`]))

export default function TeamAutoAssignDialog({
  open,
  onOpenChange,
  projectId,
  classId,
  unassignedCount,
}: Props) {
  /* 기본 5명 — 사용자 지시. 스펙은 `minimum: 1`만 정하고 기본값을 정하지 않는다 */
  const [teamSize, setTeamSize] = useState(5)
  const [skillBalanced, setSkillBalanced] = useState(false)

  const autoAssign = useAutoAssignTeams()

  function handleAssign() {
    autoAssign.mutate(
      { path: { projectId }, body: { classId, teamSize, skillBalanced } },
      { onSuccess: () => onOpenChange(false) },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-110">
        <DialogHeader>
          <DialogTitle>자동 배분 · {unassignedCount}명</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {/* 🔴 실패를 말한다(하드닝 실측) — 배분이 거절돼도 모달만 열려 있었다 */}
          {autoAssign.error !== null &&
            (() => {
              const copy = errorCopy(autoAssign.error, { subject: '팀', action: '배분' })
              /*
                🔴 **실측 — `AUTO_ASSIGN_NOT_ALLOWED` 하나가 서로 다른 두 원인을 덮는다**
                (`api:check`의 generic-only 경고와 같은 계열). 33차 전에는 "이미 확정·종료됐다"
                뜻이었는데, 지금은 "**그 반에 이미 팀이 있다**"도 같은 코드로 온다 — 정적
                문구가 전자만 말해서, 실제로 후자가 나면 사용자가 엉뚱한 원인을 본다.

                서버가 `message`에 그때그때 맞는 문장을 실어 준다(`AddRosterDialog`와 같은
                패턴) — 있으면 그대로, 없으면 정적 문구로 물러선다.
              */
              const message = (autoAssign.error as { message?: string }).message
              return (
                <Alert variant="danger">
                  <AlertTitle>{copy.title}</AlertTitle>
                  <AlertDescription>{message ?? copy.description}</AlertDescription>
                </Alert>
              )
            })()}

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
            {/*
              스펙이 정한 것만 쓴다 — 만들어지는 팀 수는 `ceil(반 인원 / teamSize)`다.

              🔴 종전 문구는 "딱 나눠지지 않는 인원은 **서버가 남는 팀에 붙입니다**"였는데
              **스펙에 나머지 분배 규칙이 없다.** 4·4·4·1인지 4·4·3·3인지 계약이 말한 적
              없는 것을 화면이 단정하고 있었다.
            */}
            <p className="text-fg-subtle mt-1.5 text-2xs">
              미배정 인원을 이 크기로 나눠 올림한 만큼 팀이 만들어집니다.
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
            {/*
              🔴 **스펙이 이 안내를 화면에 두라고 적고 있다** — "1차 프로젝트이거나 직전
              회차에 응시 기록이 하나도 없으면 무작위로 조용히 대체된다. 근거 없이
              '실력 섞기'라 표시하지 않기 위해 화면에는 이 경우를 안내하는 것을 권한다."

              **미리 막지는 못한다.** 기록이 있는지는 화면이 알 수 없어(응답에 도달 단계가
              없다) 조건부로 띄울 근거가 없다 — 그래서 고른 사람에게만 조건을 말해 준다.
              「일어날 수 있는 일」을 미리 알리는 것과 「일어난 일」을 사후에 단정하는 것은
              다르다.
            */}
            {skillBalanced && (
              <p className="text-fg-subtle mt-1.5 text-2xs">
                직전 회차 응시 기록이 없으면(1차 프로젝트 등) 무작위로 배분됩니다.
              </p>
            )}
          </div>

          <p className="text-fg-subtle text-2xs">
            결과가 마음에 안 들면 다시 실행하거나 팀 편집으로 바꾸면 돼요.
          </p>
        </div>

        <DialogFooter className="sm:justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button disabled={autoAssign.isPending} onClick={handleAssign}>
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
