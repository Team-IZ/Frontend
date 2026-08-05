import { useState } from 'react'
import { AlertTriangle, Send } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Alert, AlertTitle } from '@/components/ui/Alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/AlertDialog'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import {
  cancelRetry,
  deadlinePassed,
  publishReport,
  retryStatus,
  stuckConceptCount,
  type PersonResult,
  type ProjectResult,
} from '../mockData'
import PersonResultPanel from './PersonResultPanel'
import RetrySendDialog from './RetrySendDialog'

/*
  MG-08 결과 탭 — 마스터-디테일(정의서 §3 "좌측 개인 목록이 이 탭의 본체다").
  좌측 첫 줄 "프로젝트 종합"이 요약·집단 미달·개념별 표를 담당하고, 그 아래
  개인 목록을 클릭하면 오른쪽이 그 사람의 결과로만 바뀐다(앵커 스크롤 없음, CLAUDE.md §6).

  개념별 분포는 여기서 그리지 않는다 — 반 × 개념 패턴은 MG-02 히트맵 소관이다
  (정의서 §3 "결과 탭 — 집단 미달만 경고하고 나머지는 히트맵으로").

  ⚠ 렌더 비교 반영
  · 발행 전엔 "다시 보기 대상" 카드가 실제 값 대신 "—발행 후 정해짐"이다(와이어
    "아직 응시하지 않은 인원은 집계에서 빠져 있어요. 발행하면 그 시점 값으로
    고정됩니다") — 발행 전 숫자를 이미 확정된 것처럼 보여주지 않는다.
  · 다시 보기 발송은 인라인 체크리스트가 아니라 버튼이 여는 모달(`RetrySendDialog`,
    와이어프레임 #retry-send)로 바꿨다.
  · 발송해도 화면이 안 바뀐다는 지적(사용자) — 발송 전/후가 카운트 문구 하나로만
    갈려서 **누구에게 보냈는지·기한이 언제인지·응시했는지**가 안 보였다. 발송된
    사람은 이름·기한·응시 여부(`retryTakenAt`) 3열 표로 뜨게 했다 — 미발송
    인원만 발송 버튼 아래 남는다.
  · "반 종합" → "프로젝트 종합"(사용자 지시). 이 프로젝트는 A반·B반·C반이 섞여
    있어서 애초에 "반" 단위 통계가 아니다 — 반별 분포가 필요하면 그건 MG-02
    히트맵 소관(위 참고)이라 이름만 실제 내용에 맞게 바꿨다.
  · "막힌 개념 2개 이상" 카드 삭제 → **"불합격 인원"**(= `retryTargetCount`,
    개념 1개 이상 2단 미달)으로 교체. "다시 보기 대상"은 이제 그 불합격 인원 +
    **마감이 지나도록 응시를 안 한 인원**(`notStartedCount`)의 합이다(사용자
    지시) — 코드 분석이 아직 안 끝나 응시 자체가 안 열린 `BLOCKED`는 안 셈친다,
    그건 독촉 대상이지 다시 보기 대상이 아니다. 다만 지금 발송 모달은 여전히
    "응시했지만 불합격"한 사람만 다룬다 — 한 번도 응시 안 한 사람에게 보낼 것은
    "다시" 보기가 아니라 최초 안내(독촉)라 다른 액션이다.
  · **다시 보기 발송은 리포트 발행 후에만**(사용자 지시) — "다시 보기 대상"
    카드가 이미 발행 전엔 "발행 후 정해짐"으로 숫자를 안 보여주는데, 발송
    자체는 막혀 있지 않아 발행 전 숫자로 보낼 수 있는 모순이 있었다. 발송
    섹션 전체를 `result.reportPublished`로 게이팅해 카드와 행동을 일치시켰다.
  · **리포트 발행 — 마감 전 클릭 시 경고**(사용자 지시). 마감 전에 발행하면
    그 뒤 들어오는 제출·응시가 반영 안 된 채로 굳는다 — `deadlinePassed`로
    확인해 아직 안 지났으면 `AlertDialog`로 한 번 더 확인받는다("그래도
    발행"을 눌러야 실제로 발행된다). 마감이 이미 지났으면(대부분의 경우)
    평소처럼 바로 발행된다.
  · **용어 — "다시 보기"를 전부 "재응시"로 바꿨다**(사용자 지시). 카드
    라벨·섹션 헤더·버튼 문구가 대상이고 `retryTarget`·`retrySentAt` 같은
    코드 식별자는 그대로 둔다.
  · **재응시 발송 버튼 — 전원 발송해도 계속 노출**(사용자 지시). 전엔
    `unsentCandidates.length > 0`일 때만 버튼이 떴는데, 전부 보내고 나면
    버튼 자체가 사라져서 다이얼로그를 다시 열 방법이 없었다. `!locked`만
    게이팅 조건으로 남겨 항상 눌러서 열 수 있게 했다.
  · **발송 현황 표 배지 — `retryStatus()`로 통일**(사용자 지시). 이 표는
    이제 `RetrySendDialog`와 같은 함수(`retryStatus`)로 상태를 계산한다 —
    두 화면이 서로 다른 기준으로 "봤다/안 봤다"를 판단해 어긋나는 걸 막는다.
  · **재응시 발송 취소**(사용자 지시). 발송 현황 표에 "취소" 액션을 추가했다
    — **"재응시 발송 완료"(아직 안 봄)에만** 뜨고 **"재응시 완료"(이미
    봄)에는 안 뜬다**(사용자 지시 "재응시 완료한 경우는 제외") — 이미 벌어진
    일은 되돌릴 게 없다. `cancelRetry()`(`mockData.ts`)가 `retrySentAt`·
    `retryDueAt`을 지워 그 사람을 다시 "재응시 가능"으로 돌린다. 눌러도
    바로 취소되지 않고 `AlertDialog`로 한 번 더 확인받는다 — 학생에게 이미
    안내된 기한을 지우는 되돌리기 비싼 행동이라 "그래도 발행" 경고와 같은
    패턴을 썼다.
*/

type Props = {
  projectId: string
  result: ProjectResult | null
  locked: boolean
  onReload: () => void
  /** 이 프로젝트의 제출 마감 — 리포트 발행이 마감 전인지 판정하는 데만 쓴다(사용자 지시) */
  dueAt: string | null
}

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']

/** `retryDueAt`("YYYY-MM-DDTHH:mm") → "YYYY-MM-DD (요일) HH:mm" */
function formatDueAt(dueAt: string): string {
  const [datePart, timePart] = dueAt.split('T')
  const weekday = WEEKDAY[new Date(`${datePart}T00:00:00`).getDay()]
  return `${datePart} (${weekday}) ${timePart}`
}

export default function ResultTab({ projectId, result, locked, onReload, dueAt }: Props) {
  const [selected, setSelected] = useState<string>('summary')

  if (!result) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>아직 결과가 없어요</EmptyTitle>
          <EmptyDescription>팀 편성·제출·응시가 끝나야 개념별 집계가 생깁니다.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  const active = result.people.find((p) => p.person.id === selected)

  return (
    <div className="border-border bg-surface flex overflow-hidden rounded-md border">
      <div className="border-border bg-surface-2 max-h-[36rem] flex-none basis-64 overflow-y-auto border-r py-2">
        <button
          type="button"
          onClick={() => setSelected('summary')}
          className={
            selected === 'summary'
              ? 'shadow-[inset_2px_0_0_var(--color-primary)] block w-full bg-white px-4 py-2.5 text-left'
              : 'block w-full px-4 py-2.5 text-left hover:bg-white'
          }
        >
          <div className="flex items-center justify-between">
            <b
              className={
                selected === 'summary'
                  ? 'text-primary text-xs font-bold'
                  : 'text-fg-muted text-xs font-bold'
              }
            >
              프로젝트 종합
            </b>
            <span className="text-fg-subtle text-2xs">{result.totalCount}명</span>
          </div>
        </button>

        <div className="bg-border my-2 h-px" />
        <p className="text-fg-subtle px-4 py-1 text-2xs font-bold tracking-wide uppercase">개인</p>

        {result.people.map((p) => {
          const stuck = stuckConceptCount(p)
          const on = p.person.id === selected
          return (
            <button
              key={p.person.id}
              type="button"
              onClick={() => setSelected(p.person.id)}
              className={
                on
                  ? 'shadow-[inset_2px_0_0_var(--color-primary)] block w-full bg-white px-4 py-2 text-left'
                  : 'block w-full px-4 py-2 text-left hover:bg-white'
              }
            >
              <div className="flex items-center justify-between">
                <span
                  className={
                    on ? 'text-primary text-xs font-bold' : 'text-fg-muted text-xs font-bold'
                  }
                >
                  {p.person.name}
                </span>
                <span className="text-fg-subtle text-2xs">{stuck > 0 ? `막힘 ${stuck}` : '—'}</span>
              </div>
            </button>
          )
        })}
      </div>

      <div className="max-h-[36rem] min-w-0 flex-1 overflow-y-auto">
        {selected === 'summary' ? (
          <SummaryPane
            projectId={projectId}
            result={result}
            locked={locked}
            onReload={onReload}
            dueAt={dueAt}
          />
        ) : active ? (
          <PersonResultPanel result={active} />
        ) : null}
      </div>
    </div>
  )
}

function SummaryPane({
  projectId,
  result,
  locked,
  onReload,
  dueAt,
}: {
  projectId: string
  result: ProjectResult
  locked: boolean
  onReload: () => void
  dueAt: string | null
}) {
  const retryCandidates = result.people.filter((p) => p.concepts.some((c) => c.retryTarget))
  const sentCandidates = retryCandidates.filter((p) => p.retrySentAt)
  const unsentCandidates = retryCandidates.filter((p) => !p.retrySentAt)
  const [publishing, setPublishing] = useState(false)
  const [retryOpen, setRetryOpen] = useState(false)
  const [publishWarnOpen, setPublishWarnOpen] = useState(false)
  // 재응시 발송 취소 확인 대상 — "재응시 발송 완료"만 여기 담긴다("재응시 완료"는
  // 취소 버튼 자체가 안 뜬다, 사용자 지시). null이면 확인 다이얼로그 닫힘
  const [cancelTarget, setCancelTarget] = useState<PersonResult | null>(null)
  const [cancelling, setCancelling] = useState(false)

  async function handlePublish() {
    setPublishing(true)
    await publishReport(projectId)
    onReload()
    setPublishing(false)
  }

  async function handleCancelRetry() {
    if (!cancelTarget) return
    setCancelling(true)
    await cancelRetry(projectId, cancelTarget.person.id)
    setCancelTarget(null)
    setCancelling(false)
    onReload()
  }

  function handlePublishClick() {
    if (deadlinePassed(dueAt)) {
      handlePublish()
    } else {
      // 마감 전이라 바로 발행하지 않고 한 번 더 확인받는다(사용자 지시) — "그래도
      // 발행"을 눌러야 실제로 publishReport가 호출된다
      setPublishWarnOpen(true)
    }
  }

  async function handleConfirmPublish() {
    setPublishWarnOpen(false)
    await handlePublish()
  }

  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-bold">프로젝트 종합</h3>
        <Badge variant={result.reportPublished ? 'success' : 'neutral'}>
          {result.reportPublished ? '발행 완료' : '발행 전'}
        </Badge>
        {!locked && !result.reportPublished && (
          <Button size="sm" className="ml-auto" disabled={publishing} onClick={handlePublishClick}>
            {publishing ? '발행 중…' : '리포트 발행'}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="응시" value={`${result.attendedCount}명`} />
        <SummaryCard label="불합격 인원" value={`${result.retryTargetCount}명`} />
        <SummaryCard
          label="재응시 대상"
          value={
            result.reportPublished ? `${result.retryTargetCount + result.notStartedCount}명` : '—'
          }
          caption={result.reportPublished ? '불합격 + 미응시' : '발행 후 정해짐'}
        />
      </div>

      {!result.reportPublished && (
        <p className="text-fg-subtle text-2xs">
          아직 응시하지 않은 인원은 집계에서 빠져 있어요. 발행하면 그 시점 값으로 고정됩니다.
        </p>
      )}

      {result.classWarnings.length > 0 && (
        <div className="flex flex-col gap-2">
          {result.classWarnings.map((w) => (
            <Alert key={w.concept} variant="warning">
              <AlertTriangle />
              <AlertTitle>
                {w.concept} — 반 절반 이상이 여기서 막혔어요 ({w.ratioLabel})
              </AlertTitle>
            </Alert>
          ))}
        </div>
      )}

      <div>
        <p className="text-fg-muted mb-1.5 text-xs font-bold">개념별</p>
        <div className="border-border overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-2 border-border border-b">
                <th className="text-fg-muted px-3 py-2 text-left text-xs font-semibold">개념</th>
                <th className="text-fg-muted px-3 py-2 text-left text-xs font-semibold">
                  막힌 사람
                </th>
                <th className="text-fg-muted px-3 py-2 text-left text-xs font-semibold">
                  코드에 없던 사람
                </th>
              </tr>
            </thead>
            <tbody>
              {result.conceptAggregates.map((a) => (
                <tr key={a.concept} className="border-border border-b last:border-0">
                  <td className="px-3 py-2 font-bold">{a.concept}</td>
                  <td className="px-3 py-2">
                    {a.stuckCount === 0 ? (
                      <span className="text-fg-subtle">—</span>
                    ) : (
                      <span className="text-warning">
                        {a.stuckCount}명{' '}
                        <span className="text-fg-subtle">· {a.stuckNames.join(', ')}</span>
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {a.notInCodeCount === 0 ? (
                      <span className="text-fg-subtle">—</span>
                    ) : (
                      <span className="text-fg-muted">
                        {a.notInCodeCount}명{' '}
                        <span className="text-fg-subtle">· {a.notInCodeNames.join(', ')}</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {!result.reportPublished && retryCandidates.length > 0 && (
        <p className="text-fg-subtle text-2xs">재응시는 리포트 발행 후에 보낼 수 있어요.</p>
      )}

      {result.reportPublished && retryCandidates.length > 0 && (
        <div>
          <p className="text-fg-muted mb-1.5 text-xs font-bold">
            재응시{' '}
            <span className="text-fg-subtle font-normal">
              발송 {sentCandidates.length}명 · 미발송 {unsentCandidates.length}명
            </span>
          </p>

          {sentCandidates.length > 0 && (
            <div className="border-border mb-2 overflow-hidden rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-2 border-border border-b">
                    <th className="text-fg-muted px-3 py-1.5 text-left text-xs font-semibold">
                      이름
                    </th>
                    <th className="text-fg-muted px-3 py-1.5 text-left text-xs font-semibold">
                      기한
                    </th>
                    <th className="text-fg-muted px-3 py-1.5 text-left text-xs font-semibold">
                      응시
                    </th>
                    <th className="text-fg-muted px-3 py-1.5 text-left text-xs font-semibold" />
                  </tr>
                </thead>
                <tbody>
                  {sentCandidates.map((p) => (
                    <tr key={p.person.id} className="border-border border-b last:border-0">
                      <td className="px-3 py-1.5 font-semibold">{p.person.name}</td>
                      <td className="text-fg-muted px-3 py-1.5 text-xs">
                        {p.retryDueAt ? formatDueAt(p.retryDueAt) : '—'}
                      </td>
                      <td className="px-3 py-1.5">
                        <Badge variant={p.retryTakenAt ? 'success' : 'neutral'}>
                          {retryStatus(p)}
                        </Badge>
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        {/* 재응시 완료는 취소 대상이 아니다(사용자 지시) — 이미 벌어진
                            일이라 되돌릴 게 없다 */}
                        {!p.retryTakenAt && !locked && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCancelTarget(p)}
                            className="px-2 py-1"
                          >
                            취소
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!locked && (
            <Button size="sm" onClick={() => setRetryOpen(true)}>
              <Send className="size-3.5" />
              재응시 발송
            </Button>
          )}
        </div>
      )}

      <RetrySendDialog
        open={retryOpen}
        onOpenChange={setRetryOpen}
        projectId={projectId}
        result={result}
        onSent={onReload}
      />

      <AlertDialog open={publishWarnOpen} onOpenChange={setPublishWarnOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-warning-soft text-warning">
              <AlertTriangle />
            </AlertDialogMedia>
            <AlertDialogTitle>제출 마감 전인데 발행할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              {dueAt ? `마감(${dueAt.replace('T', ' ')})이` : '마감이'} 아직 지나지 않았어요. 지금
              발행하면 마감 전에 새로 제출되거나 다시 응시한 결과가 반영되지 않은 채로 굳습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={publishing}>취소</AlertDialogCancel>
            <AlertDialogAction disabled={publishing} onClick={handleConfirmPublish}>
              {publishing ? '발행 중…' : '그래도 발행'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && !cancelling && setCancelTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-warning-soft text-warning">
              <AlertTriangle />
            </AlertDialogMedia>
            <AlertDialogTitle>재응시 발송을 취소할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelTarget?.person.name}
              {cancelTarget?.retryDueAt
                ? `에게 안내된 기한(${formatDueAt(cancelTarget.retryDueAt)})이`
                : '에게 안내된 기한이'}{' '}
              사라지고 "재응시 가능" 상태로 돌아갑니다. 다시 보내려면 발송을 새로 해야 해요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>닫기</AlertDialogCancel>
            <AlertDialogAction disabled={cancelling} onClick={handleCancelRetry}>
              {cancelling ? '취소하는 중…' : '발송 취소'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  caption,
}: {
  label: string
  value: string
  caption?: string
}) {
  return (
    <div className="border-border bg-surface-2 rounded-md border px-3 py-2.5">
      <p className="text-fg-subtle text-2xs">{label}</p>
      <p className="text-fg text-lg font-bold">{value}</p>
      {caption && <p className="text-fg-subtle text-2xs">{caption}</p>}
    </div>
  )
}
