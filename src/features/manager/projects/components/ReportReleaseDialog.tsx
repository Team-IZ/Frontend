import { useMemo, useState } from 'react'
import { Check, Send } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Alert, AlertTitle, AlertDescription, AlertAction } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils/cn'
import { errorCopy } from '@/lib/errorCopy'
import {
  splitReports,
  useManagedReports,
  usePublishReports,
  type DisclosureScope,
  type ManagedReport,
} from '../_/api/reports'

/*
  리포트 공개 모달 — MG-08 결과 탭 우상단 버튼이 연다.

  **「발행」과 「공개」는 다른 사건이다**(스펙 명시).

    발행  publishedAt    회차 마감 후 서버가 한꺼번에 한다. 매니저 손이 안 간다
    공개  releaseStatus  매니저가 연다 — **이 호출이 없으면 발행돼도 영원히 잠겨 있다**

  🔴 **처음엔 결과 탭 요약 안에 인라인 섹션으로 붙였다가 걷어냈다.** 17명 이름이 그대로
  펼쳐져 요약을 밀어냈고, 왼쪽 레일이 이미 같은 사람들을 나열하고 있어 **같은 목록이 한
  화면에 두 번** 있었다. 그리고 상태 보기와 액션이 한 덩어리라 「지금 어떤가」와 「무엇을
  할까」가 안 갈렸다.

  지금 구조는 오퍼레이터 프로젝트 생성과 같다 — **밖에는 상태 한 줄과 버튼 하나**,
  안에서 대상·범위를 정하고 실행한다(D14 계열: 이미 있는 관례를 따른다).

  ⚠ **되돌릴 수 없는 일이 아니다** — 열었다 닫는 것은 `PRIVATE`이다. 그래서 확인 모달을
  한 겹 더 세우지 않는다(`async-states` §4-1). 이 모달 자체가 「무엇을 여는지」를 보여주는
  실행 화면이고, 닫히는 것이 성공 피드백이다.
*/

const SCOPE: { value: DisclosureScope; title: string; desc: string }[] = [
  { value: 'FULL', title: '전체 공개', desc: '개념별 도달 단계 · 문답 · 해설까지 전부' },
  { value: 'SUMMARY', title: '요약만 공개', desc: '도달 단계만 — 문답·해설은 빠집니다' },
]

export default function ReportReleaseDialog({
  assessmentRoundId,
  open,
  onOpenChange,
}: {
  assessmentRoundId: string
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const list = useManagedReports({ roundId: assessmentRoundId })
  const { publish, done, total, isPending } = usePublishReports()
  const [scope, setScope] = useState<DisclosureScope>('FULL')
  const [failed, setFailed] = useState<ManagedReport[]>([])

  const split = useMemo(() => splitReports(list.data ?? []), [list.data])

  /* 이미 연 것의 범위를 바꾸는 것도 같은 호출이라, 대상은 「안 열린 것 + 범위가 다른 것」이다 */
  const targets = useMemo(
    /* `split`이 이미 사람 단위라(`pickByTrainee`) 같은 사람에게 두 번 보내지 않는다 */
    () => [...split.closed, ...split.opened.filter((r) => r.scope !== scope)],
    [split, scope],
  )

  const run = async () => {
    /*
      ⚠ **다시 누르기 전에 앞선 실패를 지운다.** 안 지우면 두 번째 시도에서 성공한
      사람이 「열지 못했습니다」에 그대로 남아, 실제로 열렸는데 안 열린 것처럼 읽힌다.
    */
    setFailed([])
    const res = await publish(
      targets.map((r) => r.reportId),
      scope,
    )
    const byId = new Map(targets.map((r) => [r.reportId, r]))
    setFailed(res.failed.map((f) => byId.get(f.reportId)!).filter(Boolean))
    if (res.failed.length === 0) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>리포트 공개</DialogTitle>
          <DialogDescription>
            발행된 리포트를 교육생이 볼 수 있게 엽니다. 발행은 회차가 마감되면 서버가 한꺼번에
            합니다.
          </DialogDescription>
        </DialogHeader>

        {!list.data && !list.isError ? (
          <div className="flex justify-center py-8">
            <Spinner className="size-5" aria-label="공개 상태를 불러오는 중" />
          </div>
        ) : list.isError || !list.data ? (
          /*
            🔴 **다시 시도를 그릴지도 서버가 정한다**(규칙 I). 담당 밖 자원(404
            `MANAGER_SCOPE_NOT_FOUND`)에 버튼을 주면 같은 실패를 반복시킨다.
            `errorCopy`를 한 번만 불러 `tone`·`retry`까지 같이 쓴다.
          */
          (() => {
            const copy = errorCopy(list.error, { subject: '공개 상태' })
            return (
              <Alert variant={copy.tone === 'pending' ? 'info' : 'danger'}>
                <AlertTitle>{copy.title}</AlertTitle>
                <AlertDescription>{copy.description}</AlertDescription>
                {copy.retry && (
                  <AlertAction>
                    <Button variant="ghost" size="sm" onClick={() => void list.refetch()}>
                      다시 시도
                    </Button>
                  </AlertAction>
                )}
              </Alert>
            )
          })()
        ) : (
          <div className="flex flex-col gap-4">
            {/* 지금 상태 — 숫자 셋이면 충분하다. 이름을 늘어놓지 않는다 */}
            <div className="border-border bg-surface-2 grid grid-cols-3 rounded-md border">
              <Stat label="열림" value={split.opened.length} />
              <Stat label="안 열림" value={split.closed.length} tone={split.closed.length > 0} />
              <Stat label="발행 전" value={split.pending} muted />
            </div>

            {split.published.length === 0 ? (
              <p className="text-fg-subtle text-xs">
                아직 발행된 리포트가 없습니다 — 회차가 마감되면 서버가 발행합니다.
              </p>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  {SCOPE.map((s) => (
                    <ScopeRow
                      key={s.value}
                      checked={scope === s.value}
                      onSelect={() => setScope(s.value)}
                      title={s.title}
                      desc={s.desc}
                    />
                  ))}
                </div>

                {/* 누르면 무엇이 달라지는지 — 이름은 열 사람이 적을 때만 보여준다 */}
                {targets.length > 0 ? (
                  <p className="text-fg-muted text-xs">
                    <b className="text-fg font-bold">{targets.length}명</b>의 공개 범위가{' '}
                    <b className="text-fg font-bold">
                      {SCOPE.find((s) => s.value === scope)!.title}
                    </b>
                    로 바뀝니다
                    {targets.length <= 6 && (
                      <span className="text-fg-subtle">
                        {' — '}
                        {targets.map((r) => r.traineeName).join(' · ')}
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-fg-subtle text-xs">
                    이미 모두 {SCOPE.find((s) => s.value === scope)!.title} 상태입니다.
                  </p>
                )}

                {failed.length > 0 && (
                  <Alert variant="danger">
                    <AlertTitle>{failed.length}명은 열지 못했습니다</AlertTitle>
                    <AlertDescription>
                      {failed.map((r) => r.traineeName).join(' · ')} — 나머지는 열렸습니다. 다시
                      누르면 안 된 것만 시도합니다.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </div>
        )}

        <DialogFooter className="sm:justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
            닫기
          </Button>
          <Button disabled={isPending || targets.length === 0} onClick={() => void run()}>
            {/* 진행 중에는 몇 명까지 갔는지 — 한 건씩 보내므로 멈춘 게 아니라는 신호가 필요하다 */}
            {isPending ? (
              <>
                <Spinner className="size-3.5" />
                {done}/{total} 여는 중
              </>
            ) : (
              <>
                <Send />
                {targets.length}명 공개
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Stat({
  label,
  value,
  tone,
  muted,
}: {
  label: string
  value: number
  tone?: boolean
  muted?: boolean
}) {
  return (
    <div className="border-border flex flex-col items-center gap-0.5 border-r py-2.5 last:border-r-0">
      <span
        className={cn(
          'text-lg font-bold tabular-nums',
          tone ? 'text-warning' : muted ? 'text-fg-subtle' : 'text-fg',
        )}
      >
        {value}
      </span>
      <span className="text-fg-subtle text-2xs">{label}</span>
    </div>
  )
}

/** `TeamAutoAssignDialog`의 라디오 줄과 같은 모양 — 이 화면 안에서 두 번째다(D14) */
function ScopeRow({
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
      aria-pressed={checked}
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
