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
import { useFindManagers } from '@/api/member/useMemberQueries'
import { useFindClassrooms } from '@/api/academic/useAcademicQueries'
import { useUpdateManagers } from '@/api/academic/useAcademicMutations'
import type { findClassrooms_Item } from '@/api/academic/academicTypes'
import Loading from '@/components/common/Loading'

/*
  이 반을 누가 맡나 — **반 하나에 매니저 여럿**이라 체크박스다.

  ## 목이 틀렸던 자리
  목은 `managerId`·`managerName` 한 쌍이라 **반 하나에 담당 한 명**을 전제했고 라디오였다.
  서버는 `ClassroomResponse.managers`가 배열이고 `PATCH .../managers`가
  `managerIds[]`를 받는다 — 공동 담당이 처음부터 가능한 모델이었다.

  ## 저장이 전체 교체다
  *"보낸 목록이 그대로 최종 상태가 된다(부분 추가·삭제 아님)"* — 그래서 **지금 담당이
  미리 체크돼 있어야** 한다. 안 켜고 저장하면 남아 있던 담당이 통째로 풀린다.
  빈 배열이면 전체 해제이고, 그때 `담당 없음` 경고가 다시 켜진다.

  ## 가입 전 매니저는 후보에 없다
  로그인을 못 해 그 반의 면담·독촉을 처리할 수 없는데 반에는 id가 박혀 `담당 없음`
  경고에 안 잡힌다 — 경고가 막으려던 상황을 배정이 만든다. 그래서 `status=ACTIVE`만 받는다.
*/
export default function ClassManagersDialog({
  room,
  cohortId,
  onOpenChange,
  onSaved,
}: {
  /** 담당을 정할 반. null이면 닫힌 상태다 */
  room: findClassrooms_Item | null
  cohortId: string
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const open = room !== null
  /*
    **기수로 좁히지 않는다.** 매니저 목록의 `cohortId`는 *가장 최근 초대*의 기수라
    시드 계정처럼 초대 이력이 없으면 `null`이고, 그걸로 거르면 후보가 통째로 사라진다
    (실측: 9기로 좁히면 7명이지만 그 값은 담당 반에서 파생된 것이다).
    기관 매니저 전원 중에서 고른다 — 담당은 이 조작으로 정해지는 것이지 미리 정해져
    있는 것이 아니다.
  */
  const managers = useFindManagers({ query: { status: 'ACTIVE', size: 100 } }, { enabled: open })
  const update = useUpdateManagers()

  /*
    **`classroomNames`를 그대로 쓰지 않는다.** 그 값은 기관 전 기수의 담당이라, 다른 기수
    D반을 맡은 사람 옆에 `D반`이 뜨면 **이 기수 D반을 이미 맡은 것처럼 읽힌다**(실측으로
    그렇게 나왔다). 이 기수 반 목록에서 다시 센다 — 탭이 이미 받아 둔 조회라 캐시에서 나온다.
  */
  const classrooms = useFindClassrooms({ path: { cohortId } }, { enabled: open })
  const heldHere = new Map<string, string[]>()
  for (const c of classrooms.data?.classrooms ?? [])
    for (const m of c.managers)
      if (m.memberId) heldHere.set(m.memberId, [...(heldHere.get(m.memberId) ?? []), c.name])
  const [failed, setFailed] = useState(false)

  const current = (room?.managers ?? []).map((m) => m.memberId).filter((id) => id !== undefined)
  const [picked, setPicked] = useState<ReadonlySet<string> | null>(null)
  const ids = picked ?? new Set(current)

  // 다이얼로그는 닫아도 언마운트되지 않는다 — 열 때 서버 값으로 되돌린다
  useEffect(() => {
    if (open) {
      setPicked(null)
      setFailed(false)
    }
  }, [open])

  const toggle = (id: string) =>
    setPicked(() => {
      const next = new Set(ids)
      if (!next.delete(id)) next.add(id)
      return next
    })

  /** 안 바꾼 것은 저장할 것이 없다 */
  const changed =
    picked !== null && (ids.size !== current.length || current.some((id) => !ids.has(id)))

  const save = async () => {
    if (!room) return
    setFailed(false)
    try {
      await update.mutateAsync({
        path: { cohortId, classroomId: room.classroomId },
        body: { managerIds: [...ids] },
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
            담당 매니저
            <span className="text-fg-subtle text-xs font-normal"> · {room?.name}</span>
          </DialogTitle>
        </DialogHeader>

        {/* **지금 값을 먼저 적는다** — 무엇을 바꾸는지 모르는 채로 고르게 두지 않는다 */}
        <p className="text-fg-muted -mt-1 mb-2 text-xs">
          현재{' '}
          {current.length > 0 ? (
            <b className="text-fg font-semibold">
              {room?.managers.map((m) => m.name ?? m.email).join(' · ')}
            </b>
          ) : (
            <b className="text-warning font-semibold">담당 없음</b>
          )}{' '}
          · 체크를 모두 풀면 담당 없음이 됩니다
        </p>

        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          {failed && (
            <Alert variant="danger" className="mb-3">
              <AlertTitle>저장하지 못했습니다. 다시 시도해 주세요.</AlertTitle>
            </Alert>
          )}

          {managers.isPending ? (
            <Loading label="매니저를 불러오는 중" />
          ) : (
            <div className="border-border divide-border divide-y rounded-md border">
              {(managers.data?.content ?? []).map((m) => (
                <label
                  key={m.managerId}
                  className={cn(
                    'flex cursor-pointer items-center gap-2.5 p-2.5 text-sm',
                    ids.has(m.managerId) && 'bg-primary-soft',
                  )}
                >
                  <Checkbox
                    checked={ids.has(m.managerId)}
                    onCheckedChange={() => toggle(m.managerId)}
                  />
                  <span className="font-medium">{m.name ?? m.email}</span>
                  {/*
                    **이 기수에서** 무엇을 맡고 있는지가 판단 근거다 — 한 사람에게 몰리는
                    것이 보인다. 다른 기수 담당은 여기서 답하지 않는다(범위가 기수다).
                  */}
                  <span className="text-fg-subtle ml-auto truncate text-xs">
                    {heldHere.get(m.managerId)?.join(', ') ?? '이 기수 담당 없음'}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={update.isPending}>
            취소
          </Button>
          <Button disabled={update.isPending || !changed} onClick={() => void save()}>
            {update.isPending && <Spinner className="size-3.5" />}
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
