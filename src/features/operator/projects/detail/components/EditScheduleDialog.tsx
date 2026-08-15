import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { useUpdateSchedule } from '@/api/projectExecution/useProjectExecutionMutations'
import { canOnlyExtendDue, formatDue, toSchedule } from '../../rules'
import SchedulePicker, { type ScheduleValue } from '../../components/SchedulePicker'
import type { CohortScope, ProjectDetail } from '../../types'

/*
  일정 수정 — **사람이 정하는 것은 둘뿐이다**(시작 · 제출 마감). 각각 날짜와 시각을 받는다.

  응시 창·재시험 창·리포트 발행은 규칙에서 파생된다. 값으로 저장하면 규칙이 바뀔 때
  이미 만든 회차만 옛 값을 들고 남는다 — 일정 탭이 그 넷을 **읽기 전용으로** 그리는
  것과 같은 이유다.

  ▸ **생성 모달과 같은 입력이다**(`SchedulePicker`). 그래서 `list/`에 있던 것을
    `components/`로 올렸다 — 상세가 같은 것을 쓰면 공유물이다(mock-first §3-1).
  ▸ **`시작 > 마감`은 대부분 달력이 막는다.** 다만 **같은 날이면 날짜로 못 가르므로**
    시각까지 봐야 한다 — 그 판정은 `toSchedule`이 하고, 저장 버튼 옆에 이유를 쓴다.
  ▸ **기수 기간 밖도 달력이 막는다**(#64 ②). 기수가 끝났는데 회차가 도는 상태를 막는다.

  ⚠ **다음 회차보다 늦은 마감은 막지 않는다**(#64 ①ㆍ미결).

    재시험 창이 `3일 또는 다음 프로젝트 제출일 중 빠른 쪽`이라, 이번 마감이 다음 회차
    마감보다 늦으면 **재시험 창이 열리지 않는다.** 막을지 경고만 할지 정해지지 않아
    화면은 **사실만 쓴다** — 판정 문구를 만들면 화면이 기준을 정하는 것이 된다(E8).
    그래도 **조용하지는 않게** 한다: 조용히 사라지는 것이 이 결함의 성질이다.
*/
type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: ProjectDetail
  /** 기수 기간 — 달력이 이 밖을 못 고르게 막는다. 아직 안 왔으면 상한 없이 연다 */
  cohort?: CohortScope
  /** 다음 회차 제출 마감 — 재시험 창이 이 값을 참조한다(위 ⚠) */
  nextDueAt: string | null
  nextProjectName: string | null
}

const EMPTY: ScheduleValue = { startAt: undefined, dueAt: undefined }

export default function EditScheduleDialog({
  open,
  onOpenChange,
  project,
  cohort,
  nextDueAt,
  nextProjectName,
}: Props) {
  const [schedule, setSchedule] = useState<ScheduleValue>(EMPTY)
  const [failed, setFailed] = useState(false)
  const save = useUpdateSchedule()

  // 열 때마다 저장된 일정에서 시작한다. 미설정이면 빈 칸으로 연다
  useEffect(() => {
    if (!open) return
    setSchedule({
      startAt: new Date(project.startDate),
      dueAt: project.endDate ? new Date(project.endDate) : undefined,
    })
    setFailed(false)
  }, [open, project.startDate, project.endDate])

  /*
    **진행 중이면 마감을 앞당길 수 없다.** 달력의 하한을 현재 마감으로 올려 애초에 못
    고르게 하고(만들 수 없는 것은 검증할 필요가 없다), 같은 날 시각까지는 아래에서 막는다.
  */
  const extendOnly = canOnlyExtendDue(project.status)
  const period = toSchedule(schedule.startAt, schedule.dueAt)
  const pulledIn = !!period && extendOnly && !!project.endDate && period.endDate < project.endDate
  const changed =
    !!period && (period.startDate !== project.startDate || period.endDate !== project.endDate)

  /** 재시험 창이 열리지 않는 조합 — 판정이 아니라 두 날짜를 나란히 놓은 것이다 */
  const afterNext = !!period && !!nextDueAt && period.endDate > nextDueAt

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85svh] flex-col sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>일정 수정</DialogTitle>
        </DialogHeader>

        <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-1">
          {failed && (
            <Alert variant="danger">
              <AlertTitle>저장하지 못했습니다. 잠시 후 다시 시도해 주세요.</AlertTitle>
            </Alert>
          )}

          <SchedulePicker
            value={schedule}
            onChange={(patch) => setSchedule((prev) => ({ ...prev, ...patch }))}
            min={extendOnly && project.endDate ? project.endDate : (cohort?.startDate ?? undefined)}
            max={cohort?.endDate ?? undefined}
          />

          {extendOnly && (
            <p className="text-fg-subtle text-xs">
              응시가 시작돼 <b className="text-fg-muted font-semibold">마감을 미루는 것만</b>{' '}
              됩니다.
            </p>
          )}

          {/*
            **사실 두 줄로 끝낸다.** `늦추지 마세요`·`권장하지 않습니다` 같은 말을 붙이면
            화면이 기준을 만드는 것이고(E8), 실제로 그렇게 잡아야 하는 회차가 있는지
            기획에서 답을 못 댄다. 무슨 일이 일어나는지만 쓰고 판단은 사람이 한다.
          */}
          {afterNext && nextProjectName && nextDueAt && (
            <Alert variant="warning">
              <AlertTitle>재시험 창이 열리지 않습니다</AlertTitle>
              <AlertDescription>
                재시험 창은{' '}
                <b className="font-semibold">3일 또는 다음 프로젝트 제출일 중 빠른 쪽</b>
                까지입니다. 다음 프로젝트 {nextProjectName}의 마감이{' '}
                <b className="font-semibold tabular-nums">{formatDue(nextDueAt)}</b>이라 이번 마감이
                더 늦습니다.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="items-center justify-between sm:justify-between">
          {/* 왜 저장할 수 없는지를 버튼 옆에 쓴다 — 흐린 버튼만 두면 이유를 모른다 */}
          <p className="text-fg-subtle text-xs">
            {!period
              ? schedule.startAt && schedule.dueAt
                ? '제출 마감이 시작보다 앞설 수 없습니다'
                : '시작과 제출 마감을 모두 골라야 합니다'
              : pulledIn
                ? '마감을 앞당길 수 없습니다 — 미루는 것만 됩니다'
                : changed
                  ? '재시험 창·리포트 발행이 새 마감 기준으로 바뀝니다'
                  : '변경된 것이 없습니다'}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={save.isPending}>
              취소
            </Button>
            <Button
              disabled={!changed || pulledIn || save.isPending}
              onClick={async () => {
                setFailed(false)
                try {
                  await save.mutateAsync({
                    path: { projectId: project.projectId },
                    body: { startDate: period!.startDate, endDate: period!.endDate },
                  })
                  onOpenChange(false)
                } catch {
                  // 고른 날짜를 유지한다 — 저장 실패로 날아가면 처음부터 다시 골라야 한다(F5)
                  setFailed(true)
                }
              }}
            >
              {save.isPending && <Spinner className="size-3.5" />}
              저장
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
