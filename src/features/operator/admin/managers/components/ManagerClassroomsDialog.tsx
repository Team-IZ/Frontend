import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Alert, AlertTitle } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils/cn'
import { useFindClassrooms } from '@/api/academic/useAcademicQueries'
import { useReplaceManagerClassrooms } from '@/api/member/useMemberMutations'
import type { findManagers_Item } from '@/api/member/memberTypes'
import Loading from '@/components/common/Loading'

/*
  이 매니저가 맡을 반을 정한다 — **매니저 하나 = 반 여럿**이라 체크박스다.

  ## 왜 반 쪽 모달과 갈라져 있나
  반 쪽에서 열면 `이 반을 누가 맡나`라 매니저 **하나**를 고르고(라디오), 여기서는 반
  **여럿**을 고른다. **컨트롤 모양이 관계를 말해야 한다**(E10) — 한때 둘 다 라디오였고
  저장도 반 기준 API 하나로 처리해서, 매니저 쪽에서 반 하나를 고르면 기존 담당은 그대로
  둔 채 **하나가 더 붙었다**(실측: `B반, D반` → F반 선택 → `B반, D반, F반`).

  ## 저장이 한 번이다
  `PUT .../managers/{id}/classrooms`가 **보낸 목록을 그대로 최종 상태로** 만든다(9차 Q3-①).
  한 트랜잭션이라 절반만 반영되는 상태가 없다 — 반마다 나눠 부르면 중간에 실패했을 때
  일부는 붙고 일부는 안 붙은 채로 남는다. 빈 배열이면 담당 전체 해제다.

  ## 가입 전 매니저는 여기 못 온다
  로그인을 못 해 그 반의 면담·독촉을 처리할 수 없는데 반에는 id가 박혀 `담당 없음`
  경고에 안 잡힌다 — 호출부가 `ACTIVE`일 때만 이 모달을 연다.
*/
export default function ManagerClassroomsDialog({
  manager,
  organizationId,
  cohortId,
  onOpenChange,
  onSaved,
}: {
  /** 담당을 정할 매니저. null이면 닫힌 상태다 */
  manager: findManagers_Item | null
  organizationId: string
  /** 고를 수 있는 반의 범위 — 상단 스위처가 가리키는 기수 */
  cohortId: string
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const open = manager !== null
  const classes = useFindClassrooms({ path: { cohortId } }, { enabled: open })
  const replace = useReplaceManagerClassrooms()
  const [failed, setFailed] = useState(false)

  /*
    **지금 맡은 반이 미리 체크돼 있다** — 그래야 체크를 풀어 담당을 뺄 수 있다.
    목록의 `managers[]`로 판정한다(이름이 아니라 id — 동명이인이면 엉뚱한 반이 켜진다).
  */
  const current = (classes.data?.classrooms ?? [])
    .filter((c) => manager && c.managers.some((m) => m.memberId === manager.managerId))
    .map((c) => c.classroomId)

  const [picked, setPicked] = useState<ReadonlySet<string> | null>(null)
  const rooms = picked ?? new Set(current)

  // 다이얼로그는 닫아도 언마운트되지 않는다 — 열 때 서버 값으로 되돌린다
  useEffect(() => {
    if (open) {
      setPicked(null)
      setFailed(false)
    }
  }, [open])

  const toggle = (id: string) =>
    setPicked(() => {
      const next = new Set(rooms)
      if (!next.delete(id)) next.add(id)
      return next
    })

  /** 안 바꾼 것은 저장할 것이 없다 */
  const changed =
    picked !== null && (rooms.size !== current.length || current.some((id) => !rooms.has(id)))

  const save = async () => {
    if (!manager) return
    setFailed(false)
    try {
      await replace.mutateAsync({
        path: { organizationId, managerId: manager.managerId },
        body: { classroomIds: [...rooms] },
      })
      onSaved()
      onOpenChange(false)
    } catch {
      setFailed(true)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80svh] flex-col sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>
            담당할 반
            <span className="text-fg-subtle text-xs font-normal">
              {' · '}
              {manager?.name ?? manager?.email}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* **지금 값을 먼저 적는다** — 무엇을 바꾸는지 모르는 채로 고르게 두지 않는다 */}
        <p className="text-fg-muted -mt-1 mb-2 text-xs">
          현재 <b className="text-fg font-semibold">{current.length}개 반</b> 담당 · 체크를 풀면 그
          반은 담당 없음이 됩니다
        </p>

        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          {failed && (
            <Alert variant="danger" className="mb-3">
              <AlertTitle>저장하지 못했습니다. 다시 시도해 주세요.</AlertTitle>
            </Alert>
          )}

          {classes.isPending ? (
            <Loading label="반을 불러오는 중" />
          ) : (
            <div className="border-border divide-border divide-y rounded-md border">
              {(classes.data?.classrooms ?? []).map((room) => {
                /*
                  **네 상태를 가른다.** 담당 유무만 보면 이미 자기가 맡은 반에도
                  `담당 없음`이 뜬다 — 체크는 켜져 있는데 옆 글자가 아니라고 말한다.

                  ⚠ **반 하나에 매니저가 여럿일 수 있다**(`managers[]`가 배열이다). 그래서
                  남이 맡은 반을 체크해도 `교체됩니다`가 아니라 **함께 담당**이다 — 이
                  API는 이 사람의 배정만 더하고 뺀다(반 기준 API가 목록을 통째로 바꾸는
                  것과 다르다).
                */
                const others = room.managers.filter((m) => m.memberId !== manager?.managerId)
                const mine = room.managers.length !== others.length
                const otherNames = others.map((m) => m.name ?? m.email).join(', ')
                const checked = rooms.has(room.classroomId)
                /*
                  **지금 누가 맡고 있나**를 먼저 쓴다. `함께 담당`은 체크한 뒤에야 참이
                  되는 말이라(예고), 안 켠 줄에 붙이면 이미 그런 것처럼 읽힌다.
                */
                const who = mine
                  ? others.length > 0
                    ? `나 · ${otherNames}`
                    : '내가 담당'
                  : otherNames || '담당 없음'
                return (
                  <label
                    key={room.classroomId}
                    className={cn(
                      'flex cursor-pointer items-center gap-2.5 p-2.5 text-sm',
                      rooms.has(room.classroomId) && 'bg-primary-soft',
                    )}
                  >
                    <Checkbox
                      checked={rooms.has(room.classroomId)}
                      onCheckedChange={() => toggle(room.classroomId)}
                    />
                    <span className="font-medium">{room.name}</span>
                    <span
                      className={cn(
                        'ml-auto text-xs',
                        // 담당이 아예 없는 반은 **조치 대상**이라 눈에 띄어야 한다
                        room.managerAssignmentRequired ? 'text-warning' : 'text-fg-subtle',
                      )}
                    >
                      {who} · {room.traineeCount}명
                      {checked && !mine && others.length > 0 && ' · 함께 담당'}
                    </span>
                  </label>
                )
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={replace.isPending}>
            취소
          </Button>
          <Button disabled={replace.isPending || !changed} onClick={() => void save()}>
            {replace.isPending && <Spinner className="size-3.5" />}
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
