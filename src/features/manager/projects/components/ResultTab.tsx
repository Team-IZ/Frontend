import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import type { UseQueryResult } from '@tanstack/react-query'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Alert, AlertTitle } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
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

  🔴 **리포트 발행 버튼도 뺐다.** `reportPublished`는 읽기 전용으로만 온다.
  발행 확인 다이얼로그(응시 인원 경고·마감 전 경고)도 함께 빠졌다.

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

  if (query.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="size-6" aria-label="결과를 불러오는 중" />
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
                <span className="text-fg-subtle flex-none text-2xs">
                  {status === 'AVAILABLE'
                    ? t.stuckConceptCount > 0
                      ? `막힘 ${t.stuckConceptCount}`
                      : '—'
                    : RESULT_STATUS_LABEL[status]}
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

function SummaryPane({ result }: { result: EvaluationSummary }) {
  const s = result.summary

  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-bold">프로젝트 종합</h3>
        <Badge variant={result.reportPublished ? 'success' : 'neutral'}>
          {result.reportPublished ? '발행 완료' : '발행 전'}
        </Badge>
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
