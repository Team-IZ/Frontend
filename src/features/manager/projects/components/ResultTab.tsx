import { useMemo, useState } from 'react'
import { AlertTriangle, Send } from 'lucide-react'
import type { UseQueryResult } from '@tanstack/react-query'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils/cn'
import ReportReleaseDialog from './ReportReleaseDialog'
import {
  pickByTrainee,
  splitReports,
  useManagedReports,
  type ManagedReport,
} from '../_/api/reports'
import { Button } from '@/components/ui/Button'
import { Alert, AlertTitle } from '@/components/ui/Alert'
import { Skeleton } from '@/components/ui/Skeleton'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import {
  RESULT_STATUS_LABEL,
  retryTargetCount,
  type EvaluationSummary,
  type ResultStatus,
} from '../_/api/types'
import PersonResultPanel from './PersonResultPanel'

/*
  MG-08 결과 탭 — 마스터-디테일(정의서 §3 "좌측 개인 목록이 이 탭의 본체다").
  좌측 첫 줄 "프로젝트 종합"이 요약·집단 미달·개념별 표를 담당하고, 그 아래
  개인 목록을 클릭하면 오른쪽이 그 사람의 결과로만 바뀐다(앵커 스크롤 없음).

  개념별 분포는 여기서 그리지 않는다 — 반 × 개념 패턴은 MG-02 히트맵 소관이다.

  🔴 **다시 보기 활성화·비활성화 섹션 전체를 뺐다.** 서버에 그 오퍼레이션이 없고,
  `retrySentAt`·`retryDueAt`·`retryTakenAt`에 대응하는 필드도 없다 — 목이 화면
  안에서만 굴리던 상태다. 32차 요청서로 올린다.

  ⚠ **「발행」 버튼은 없다 — 대신 「공개」가 있다**(`ReportRelease`). 둘은 다른 사건이다.
  발행(`reportPublished`·`publishedAt`)은 회차 마감 후 서버가 한꺼번에 하고 매니저 손이
  안 간다. 매니저가 하는 것은 **교육생에게 여는 일**(`PUT /reports/{id}/disclosure`)이고,
  그 호출이 없으면 발행돼도 리포트는 영원히 잠겨 있다(스펙).
  한때 「발행 버튼을 뺐다」고만 적어 뒀는데, 뺀 것이 아니라 **서버에 그런 오퍼레이션이
  없었던 것**이고 공개 쪽은 처음부터 있었다.

  ⚠ **`resultAvailable`로 빈 상태를 가른다** — 목은 `result === null`이었다.
  아직 아무도 응시를 마치지 않은 것과 조회 실패는 다른 상태다.

  ⚠ **응시 안 한 사람도 목록에 있다.** 서버 `trainees[]`는 담당 반 전원이고
  `resultStatus`로 갈린다. `AVAILABLE`이 아니면 합격·불합격을 말하지 않는다
  (스펙 🔴) — 목록의 "막힘 N" 배지 자리에 상태 라벨을 대신 넣는다.
*/

type Props = {
  projectId: string
  query: UseQueryResult<EvaluationSummary>
}

export default function ResultTab({ projectId, query }: Props) {
  const [selected, setSelected] = useState<string>('summary')
  /*
    개인 행에 붙일 공개 상태. **모달과 같은 조회다** — 쿼리 키가 같아 캐시를 공유하고,
    모달에서 열면 이 레일도 같이 갱신된다(무효화가 한 번에 닿는다).

    🔴 누구에게 열었는지는 **모달을 열지 않고도 알아야 하는 상태**다. 한때 「같은 목록이
    두 번」이라며 명단을 통째로 걷어냈는데, 왼쪽 레일은 「채점 결과」 축이라 공개 상태를
    갖고 있지 않았다 — 중복이 아니라 **빠진 축**이었다.
  */
  const reports = useManagedReports({ roundId: query.data?.assessmentRoundId })
  const releaseByUser = useMemo(
    () => new Map(pickByTrainee(reports.data ?? []).map((r) => [r.traineeUserId, r])),
    [reports.data],
  )

  if (!query.data && !query.isError) {
    /* 실측 — 틀 578 · 왼쪽 목록 폭 basis-64 · 항목 36px(27개는 스크롤이라 16개만 그린다) */
    return (
      <div
        aria-hidden
        className="border-border bg-surface flex h-[578px] overflow-hidden rounded-md border"
      >
        <div className="border-border bg-surface-2 flex-none basis-64 border-r py-2">
          {Array.from({ length: 16 }, (_, i) => (
            <div key={i} className="flex h-9 items-center justify-between px-4">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-8" />
            </div>
          ))}
        </div>
        <div className="min-w-0 flex-1 p-5">
          <Skeleton className="mb-3 h-4 w-40" />
          <Skeleton className="mb-2 h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
    )
  }

  if (query.isError || !query.data) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>결과를 불러오지 못했습니다</EmptyTitle>
          <EmptyDescription>잠시 후 다시 시도해 주세요.</EmptyDescription>
        </EmptyHeader>
        <Button variant="ghost" onClick={() => void query.refetch()}>
          다시 시도
        </Button>
      </Empty>
    )
  }

  const result = query.data

  if (!result.resultAvailable) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>아직 결과가 없어요</EmptyTitle>
          <EmptyDescription>팀 편성·제출·응시가 끝나야 개념별 집계가 생깁니다.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="border-border bg-surface flex overflow-hidden rounded-md border">
      <div className="border-border bg-surface-2 max-h-[36rem] flex-none basis-64 overflow-y-auto border-r py-2">
        {/*
          `aria-current`를 단다 — 선택 표시가 **왼쪽 2px 선과 글자색뿐**이라 눈으로만
          보인다. 27개 중 어느 것이 열려 있는지 스크린리더가 말할 수 있어야 한다.
        */}
        <button
          type="button"
          aria-current={selected === 'summary'}
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
            <span className="text-fg-subtle text-2xs">{result.summary.totalCount}명</span>
          </div>
        </button>

        <div className="bg-border my-2 h-px" />
        <p className="text-fg-subtle px-4 py-1 text-2xs font-bold tracking-wide uppercase">개인</p>

        {result.trainees.map((t) => {
          const on = t.userId === selected
          const status = t.resultStatus as ResultStatus
          return (
            <button
              key={t.userId}
              type="button"
              aria-current={on}
              onClick={() => setSelected(t.userId)}
              className={
                on
                  ? 'shadow-[inset_2px_0_0_var(--color-primary)] block w-full bg-white px-4 py-2 text-left'
                  : 'block w-full px-4 py-2 text-left hover:bg-white'
              }
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={
                    on ? 'text-primary text-xs font-bold' : 'text-fg-muted text-xs font-bold'
                  }
                >
                  {t.name}
                </span>
                {/*
                  응시를 마친 사람만 "막힘 N"을 말한다 — 그 밖에는 왜 결과가 없는지를
                  대신 적는다(응시 중인 사람이 "막힘 0"으로 보이면 통과한 것처럼 읽힌다)
                */}
                <span className="flex flex-none items-center gap-1.5">
                  {/*
                    공개 상태 — **색만으로 말하지 않는다**(화면 규칙). 짧은 글자를 쓰고,
                    발행 전이면 아무것도 안 붙인다(열 수 없는 것에 상태를 달면 「닫혀
                    있다」로 읽힌다).
                  */}
                  <ReleaseMark report={releaseByUser.get(t.userId)} />
                  {/*
                    🔴 **`—`가 정반대로 읽혔다**(사용자 지적). 표에서 대시는 「값 없음」인데
                    여기서는 **「응시 완료 · 막힌 개념 0」**, 즉 가장 좋은 결과였다. 같은 열에
                    「응시 중」·「중단」이 섞여 있어 아직 안 한 상태로 보였다.

                    이 열이 쓰는 어휘를 스펙에 맞춰 정리한다.

                      판정 축   합격 · 불합격   응시를 마친 사람에게만 붙는다(스펙 🔴)
                      근거 축   막힌 개념 N개   개념별 표가 「막힌 사람」이라 부르는 그 값
                      상태 축   응시 중 · 중단 · 미응시 · 무효

                    실측으로 `failedCount`(불합격 4명)와 막힘>0인 사람이 같다 — **막힘 N은
                    불합격의 근거**다. 그래서 불합격인 사람에게는 판정 대신 **근거를 보여
                    준다**(매니저가 다음에 할 일이 거기서 나온다). 판정 이름은 툴팁에 남긴다.

                    막힘이 없으면 판정이 아니라 **상태**를 말한다 — 「합격」은 이 레일이
                    답하는 질문(누구를 봐야 하나)과 결이 다르다.
                  */}
                  <span
                    className={cn(
                      'text-2xs',
                      status === 'AVAILABLE' && t.stuckConceptCount > 0
                        ? 'text-warning font-semibold'
                        : 'text-fg-subtle',
                    )}
                    title={
                      status === 'AVAILABLE' && t.stuckConceptCount > 0
                        ? `불합격 — 막힌 개념 ${t.stuckConceptCount}개`
                        : undefined
                    }
                  >
                    {status === 'AVAILABLE'
                      ? t.stuckConceptCount > 0
                        ? `막힘 ${t.stuckConceptCount}`
                        : '응시 완료'
                      : RESULT_STATUS_LABEL[status]}
                  </span>
                </span>
              </div>
            </button>
          )
        })}
      </div>

      <div className="max-h-[36rem] min-w-0 flex-1 overflow-y-auto">
        {selected === 'summary' ? (
          <SummaryPane result={result} />
        ) : (
          <PersonResultPanel projectId={projectId} userId={selected} />
        )}
      </div>
    </div>
  )
}

/**
 * 개인 행의 공개 표시. 발행 전에는 아무것도 안 그린다 — 열 수 없는 것에 「닫힘」을
 * 달면 매니저가 닫아 둔 것처럼 읽힌다.
 */
function ReleaseMark({ report }: { report?: ManagedReport }) {
  if (!report?.publishedAt) return null
  /*
    🔴 **작은 글자로는 안 보였다**(스크린샷으로 확인). 오른쪽 「막힘 1 · —」과 붙어
    한 덩어리로 읽혔다 — 둘은 다른 축이라(공개 여부 · 채점 결과) 모양을 갈라야 한다.
    면을 깔아 칩으로 만들고, **색만으로 말하지 않게** 글자는 남긴다.
  */
  const open = report.bodyVisible
  return (
    <span
      className={cn(
        'rounded-full px-1.5 py-px text-2xs font-bold',
        open ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning',
      )}
      title={
        open
          ? `${report.scope === 'SUMMARY' ? '요약' : '전체'} 공개`
          : '아직 교육생이 볼 수 없습니다'
      }
    >
      {open ? '공개' : '비공개'}
    </span>
  )
}

function SummaryPane({ result }: { result: EvaluationSummary }) {
  const s = result.summary
  const [releaseOpen, setReleaseOpen] = useState(false)
  /* 버튼 옆 숫자만 쓴다 — 목록은 모달이 갖는다 */
  const reports = useManagedReports({ roundId: result.assessmentRoundId })
  const split = splitReports(reports.data ?? [])

  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-bold">프로젝트 종합</h3>
        <Badge variant={result.reportPublished ? 'success' : 'neutral'}>
          {result.reportPublished ? '발행 완료' : '발행 전'}
        </Badge>

        {/*
          🔴 **「발행」과 「공개」를 나란히 두되 섞이지 않게 한다.** 위 배지는 서버가 한
          발행이고, 오른쪽 버튼은 매니저가 하는 공개다 — 같은 줄에 두면 한 사건으로
          읽히므로 **오른쪽 끝으로 밀고 숫자를 붙여** 다른 축임을 드러낸다.

          목록은 모달 안에 있다(`ReportReleaseDialog` 머리말) — 여기서 이름을 늘어놓으면
          왼쪽 레일이 이미 가진 목록이 한 화면에 두 번 생긴다.
        */}
        <span className="ml-auto flex items-center gap-2">
          {reports.data && (
            <span className="text-fg-muted text-xs tabular-nums">
              공개 <b className="text-fg font-bold">{split.opened.length}</b>/
              {split.published.length}
            </span>
          )}
          {/* 이 탭에서 매니저가 하는 유일한 쓰기 액션이라 주 버튼(파랑)이다 */}
          <Button size="sm" onClick={() => setReleaseOpen(true)}>
            <Send />
            리포트 공개
          </Button>
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="응시" value={`${s.attendedCount}명`} />
        <SummaryCard label="불합격 인원" value={`${s.failedCount}명`} />
        {/*
          발행 전엔 합을 보여주지 않는다 — 아직 응시 안 한 인원이 빠진 임시 값이고,
          서버가 이 합을 미리 계산하지 않는 이유도 그 화면 규칙 때문이다
        */}
        <SummaryCard
          label="다시 보기 대상"
          value={result.reportPublished ? `${retryTargetCount(s)}명` : '—'}
          caption={result.reportPublished ? '불합격 + 미응시' : '발행 후 정해짐'}
        />
      </div>

      {!result.reportPublished && (
        <p className="text-fg-subtle text-2xs">
          아직 응시하지 않은 인원은 집계에서 빠져 있어요. 발행하면 그 시점 값으로 고정됩니다.
        </p>
      )}

      <ReportReleaseDialog
        assessmentRoundId={result.assessmentRoundId}
        open={releaseOpen}
        onOpenChange={setReleaseOpen}
      />

      {result.classWarnings.length > 0 && (
        <div className="flex flex-col gap-2">
          {result.classWarnings.map((w) => (
            <Alert key={w.conceptId} variant="warning">
              <AlertTriangle />
              <AlertTitle>
                {w.concept} — 반 절반 이상이 여기서 막혔어요 ({w.stuckCount}/{w.assessedCount})
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
                <tr key={a.conceptId} className="border-border border-b last:border-0">
                  <td className="px-3 py-2 font-bold">{a.concept}</td>
                  <td className="px-3 py-2">
                    {a.stuckCount === 0 ? (
                      <span className="text-fg-subtle">—</span>
                    ) : (
                      <span className="text-warning">
                        {a.stuckCount}명{' '}
                        <span className="text-fg-subtle">
                          · {a.stuck.map((p) => p.name).join(', ')}
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {a.notInCodeCount === 0 ? (
                      <span className="text-fg-subtle">—</span>
                    ) : (
                      <span className="text-fg-muted">
                        {a.notInCodeCount}명{' '}
                        <span className="text-fg-subtle">
                          · {a.notInCode.map((p) => p.name).join(', ')}
                        </span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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
