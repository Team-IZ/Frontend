import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import type { UseQueryResult } from '@tanstack/react-query'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/Button'
import { Alert, AlertTitle } from '@/components/ui/Alert'
import { Skeleton } from '@/components/ui/Skeleton'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import {
  RESULT_STATUS_LABEL,
  retryTargetCount,
  type EvaluationSummary,
  type ResultStatus,
  type EvaluationTrainee,
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

  🔴 **「리포트 공개」 개념이 사라졌다.** 검증 세션 종료 → 리포트 발행 → 교육생이
  즉시 열람이라, 매니저가 여는 버튼(`PUT /reports/{id}/disclosure`)·모달·명단 상태가
  전부 없어졌다. 남는 가림막은 도달 2단 미만 개념의 `qa`·`explanation`뿐이고 그마저도
  다시 보기 완료 여부로 갈린다 — 리포트 단위가 아니라 **개념 단위**다(교육생 TR-04
  소관). 여기서는 `reportPublished` 배지만 남는다.

  ⚠ **`resultAvailable`로 빈 상태를 가른다** — 목은 `result === null`이었다.
  아직 아무도 응시를 마치지 않은 것과 조회 실패는 다른 상태다.

  ⚠ **응시 안 한 사람도 목록에 있다.** 서버 `trainees[]`는 담당 반 전원이고
  `resultStatus`로 갈린다. `AVAILABLE`이 아니면 합격·불합격을 말하지 않는다
  (스펙 🔴) — 목록의 "막힘 N" 배지 자리에 상태 라벨을 대신 넣는다.
*/

/*
  진행 상태별 글자 색 — **바로 위 진행 막대와 같은 언어를 쓴다.** 한 화면에서 같은
  개념에 다른 색을 주면 두 언어가 된다(막대는 중단=warning인데 레일은 회색인 식).

  🔴 **응시 완료와 응시 중은 색으로 가르지 않는다.** 둘 다 「지금 할 일 없음」이고,
  무엇보다 **다수가 회차 단계에 따라 뒤집힌다** — 실측 b227 담당 반:

    진행 중 회차   응시 중   48 / 54  (89%)
    종료 회차      응시 완료 51 / 52  (98%)

  어느 쪽에 색을 줘도 한쪽 단계에서 **목록 전체가 그 색**이 되어 색이 의미를 잃는다.
  그래서 색은 **두 단계 모두에서 소수인 예외**(중단·미응시·무효)와 막힘 칩이 갖고,
  정상 둘은 글자와 무게로 가른다.

  ⚠ `fg-muted`와 `fg-subtle`은 **서로 1.24:1**이라 색만으로는 사람
  눈에 같다(계산해서 확인했다). `font-medium`을 얹어 봤지만 **11px에서 무게 한 단계는
  확대해서 나란히 놓기 전에는 안 보인다**(렌더에서 확인).

  🔴 **그래서 「응시 완료」를 오히려 더 죽였다.** 이 레일이 답하는 질문은 *"누구를 봐야
  하나"* 인데, 실측 26명 중 **완료가 19명**이다 — 매니저가 볼 일 없는 다수가 가장 진한
  것이 뒤집힌 위계였다. 완료를 배경으로 밀면 남는 것(응시 중·중단·막힘)이 저절로 뜬다.

    응시 완료   가장 옅게        볼 일 없음. 19/26이라 이게 배경이 된다
    응시 중     한 단계 진하게    아직 안 끝남 — 마감이 다가오면 챙길 대상
    중단·미응시  경고색           지금 조치가 필요하다
*/
const STATUS_TONE: Record<ResultStatus, string> = {
  AVAILABLE: 'text-fg-subtle',
  IN_PROGRESS: 'text-fg-muted font-medium',
  INCOMPLETE: 'text-warning font-medium',
  NOT_ATTENDED: 'text-danger font-medium',
  INVALID: 'text-fg-subtle',
}

type Props = {
  projectId: string
  query: UseQueryResult<EvaluationSummary>
}

export default function ResultTab({ projectId, query }: Props) {
  const [selected, setSelected] = useState<string>('summary')

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
                {/*
                  🔴 **한 칸에 축 둘을 글자로 이어 붙이지 않는다**(사용자 지적).

                  이 자리에는 성격이 다른 값 둘이 온다.

                    진행 상태   응시 완료 · 응시 중 · 중단 · 미응시 · 무효
                                → **모두가 정확히 하나**를 갖는다
                    결과 신호   막힘 N
                                → **응시를 마친 사람에게만**, 그것도 0이면 없다

                  한때 이 둘을 한 텍스트로 합쳤다(`막힘 1`만 쓰거나 `응시 완료 · 막힘 1`로
                  잇거나). 앞은 **축이 섞여** 어떤 행은 상태를, 어떤 행은 신호를 말했고,
                  뒤는 행마다 길이가 들쭉날쭉해 **세로로 읽히지 않았다.**

                  **형태를 다르게 해서 푼다** — 상태는 늘 같은 자리의 텍스트, 막힘은 칩.
                  모양이 다르면 나란히 있어도 경쟁하지 않고, 칩이 붙은 행만 스캔에서 걸린다.
                */}
                {/*
                  🔴 **두 값이 같은 줄에서 서로를 밀어냈다**(확대해서 잡았다). 칩이 붙은
                  행만 「응시 완료」가 왼쪽으로 밀려서, 세로로 훑을 때 **글자 시작점이
                  행마다 달라진다** — 색·무게를 아무리 만져도 이건 정렬 문제라 안 고쳐진다.

                  **자리를 고정한다.** 상태는 늘 같은 열에서 시작하고(고정 폭 + 오른쪽
                  정렬), 칩은 그 오른쪽 바깥에 붙는다. 그러면 상태 텍스트가 한 줄로
                  가지런히 서고 칩만 튀어나와 스캔에 걸린다.

                  ⚠ 폭은 가장 긴 라벨(`응시 완료`)에 맞춘 값이라, 라벨을 늘리면 같이
                  키워야 한다.
                */}
                <span className="flex flex-none items-center gap-1.5">
                  {/*
                    ⚠ **모르는 값이 오면 빈칸이 된다** — 실제로 그랬다(가짜 값을 넣어
                    확인). 스펙의 `resultStatus`는 `enum`이 아니라 **`string`**이라
                    서버가 값을 늘려도 타입이 안 잡아 준다. 빈칸은 「상태 없음」처럼
                    보이는데 사실은 **화면이 모르는 것**이라, 코드를 그대로 드러내
                    이상하다는 것이 보이게 한다.
                  */}
                  <span
                    className={cn(
                      'w-11 text-right text-2xs',
                      STATUS_TONE[status] ?? 'text-fg-subtle',
                    )}
                  >
                    {RESULT_STATUS_LABEL[status] ?? status}
                  </span>
                  {/*
                    막힘 N — **이 레일에서 유일하게 「지금 눌러야 한다」는 신호**라 칩이다.
                    실측으로 `failedCount`와 막힘>0인 사람이 같다(4/4 회차) — 즉 이 값이
                    곧 불합격의 근거다. 판정 이름(「불합격」)은 툴팁에만 남긴다: 이 레일이
                    답하는 질문은 「누구를 봐야 하나」이지 합불이 아니다.
                  */}
                  {/*
                    ⚠ **칩이 없어도 자리를 비워 둔다**(고정 폭 + 빈 칸). 조건부로 넣었더니
                    칩이 있는 행만 상태 텍스트가 44px 왼쪽으로 밀려 **줄이 안 맞았다**
                    (실측 169 vs 213). 자리를 늘 잡아 두면 상태가 한 열에 서고, 칩은
                    그 오른쪽에서만 나타났다 사라진다.
                  */}
                  <span className="flex w-10 justify-end">
                    {status === 'AVAILABLE' && t.stuckConceptCount > 0 && (
                      <span
                        className="bg-warning-soft text-warning rounded-full px-1.5 py-px text-2xs font-bold tabular-nums"
                        title={`불합격 — 막힌 개념 ${t.stuckConceptCount}개`}
                      >
                        막힘 {t.stuckConceptCount}
                      </span>
                    )}
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

function SummaryPane({ result }: { result: EvaluationSummary }) {
  const s = result.summary

  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-bold">프로젝트 종합</h3>
        <Badge variant={result.reportPublished ? 'success' : 'neutral'}>
          {result.reportPublished ? '발행 완료' : '발행 전'}
        </Badge>
      </div>

      {/*
        🔴 **카드 셋이 전부 분모 없는 절대수였다**(실데이터로 잡았다). 6차는
        「응시 4명」이라고만 했는데 명단이 54명이고 48명이 아직 응시 중이다 —
        4명이 전부인지 54명 중 4명인지 화면만 봐서는 알 수 없었다.

        **이 화면이 답해야 하는 질문은 「누구를 봐야 하나」다.** 그러려면 먼저
        「몇 명이 아직 안 끝났나」가 보여야 하는데, 카드 셋에는 그 수가 어디에도
        없었다(응시 중 48 · 중단 2 · 무효 1이 통째로 빠졌다).

        그래서 **깔때기 한 줄**을 먼저 두고 카드는 그 안의 판정만 말한다.
        서버 `summary`에 진행 상태별 수가 없어 명단 행에서 센다 — 판정을 다시
        하는 것이 아니라 서버가 준 `resultStatus`를 그대로 묶는 것이다
        (`attendedCount`와 `AVAILABLE` 행 수가 4/4 회차에서 일치함을 확인했다).
      */}
      <ProgressBar trainees={result.trainees} total={s.totalCount} />

      {/*
        🔴 **카드 둘이 같은 숫자였다**(사용자 지적 · 실데이터로 확인). 「불합격」과
        「다시 보기 대상」이 4/4 회차에서 전부 같은 값이었다 — `다시 보기 대상 =
        불합격 + 미응시`인데 **미응시가 늘 0**이라 두 이름으로 같은 수를 두 번 말한
        것이다. 매니저는 「왜 두 번 쓰지」에서 멈춘다.

        **판정어(합격·불합격)가 아니라 매니저가 다음에 할 일(`다시 보기 대상`)로
        카드 이름을 바꾼다.** 값도 `failedCount` 단독이 아니라 `retryTargetCount`
        (불합격 + 미응시)로 — 이름과 값이 같은 개념을 가리켜야 한다.

        세 번째 자리였던 「리포트 공개」 카드는 그 개념 자체가 없어져 뺐다 — 남는
        원자 값(무효 등)은 위 진행 막대가 이미 말하고 있어 카드로 또 나누지 않는다.
      */}
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard
          label="응시 완료"
          value={`${s.attendedCount} / ${s.totalCount}명`}
          caption={funnelCaption(result.trainees)}
        />
        <SummaryCard
          label="다시 보기 대상"
          value={`${retryTargetCount(s)}명`}
          caption={retryCaption(s)}
        />
      </div>

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

/**
 * 다시 보기 대상 카드 아래 한 줄 — 값(`retryTargetCount`)의 구성을 밝힌다.
 * 미응시가 없으면 전부 막힘이라 따로 안 나눈다(같은 수를 두 번 말하지 않는다).
 */
function retryCaption(s: EvaluationSummary['summary']) {
  if (s.attendedCount === 0 && s.notAttendedCount === 0) return '아직 응시한 사람이 없어요'
  // 응시 완료 카드의 `funnelCaption`과 같은 방식 — 구성 값을 다 적는다(0은 뺀다)
  const parts = [
    s.failedCount > 0 && `막힘 ${s.failedCount}`,
    s.notAttendedCount > 0 && `미응시 ${s.notAttendedCount}`,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : '모두 통과했어요'
}

/** 명단을 진행 상태로 묶는다 — 서버 `resultStatus`를 그대로 센다(판정하지 않는다) */
function countByStatus(trainees: EvaluationTrainee[]) {
  const n = { done: 0, running: 0, stopped: 0, absent: 0, invalid: 0 }
  for (const t of trainees) {
    if (t.resultStatus === 'AVAILABLE') n.done += 1
    else if (t.resultStatus === 'IN_PROGRESS') n.running += 1
    else if (t.resultStatus === 'INCOMPLETE') n.stopped += 1
    else if (t.resultStatus === 'NOT_ATTENDED') n.absent += 1
    else if (t.resultStatus === 'INVALID') n.invalid += 1
  }
  return n
}

/** 응시 완료 카드 아래 한 줄 — **끝나지 않은 사람만** 적는다(0은 안 적는다) */
function funnelCaption(trainees: EvaluationTrainee[]) {
  const n = countByStatus(trainees)
  const parts = [
    n.running > 0 && `응시 중 ${n.running}`,
    n.stopped > 0 && `중단 ${n.stopped}`,
    n.absent > 0 && `미응시 ${n.absent}`,
    n.invalid > 0 && `무효 ${n.invalid}`,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : '모두 응시를 마쳤어요'
}

/**
 * 진행 한 줄. **명단 전원이 어딘가에 들어간다** — 카드만 보면 응시 중·중단·무효가
 * 어디로 갔는지 알 수 없었다.
 *
 * ⚠ 색만으로 말하지 않는다 — 아래 이름표에 수를 함께 적는다.
 */
function ProgressBar({ trainees, total }: { trainees: EvaluationTrainee[]; total: number }) {
  const n = countByStatus(trainees)
  /*
    🔴 **처음에 완료를 `primary`, 응시 중을 `info`로 줬다가 바꿨다.** 둘 다 톤이 가까운
    파랑이라 가장 큰 두 구간의 경계가 안 보였다 — 실측으로 66px과 795px이 붙어 있었는데
    한 덩어리로 읽혔다.

    **진행률 막대의 직관을 따른다** — 끝난 만큼만 채워지고 나머지는 비어 있다.
    응시 중은 문제가 아니라 「아직」이라 중립이 맞고, 문제 상태(중단·미응시·무효)만
    경고색을 갖는다.

    ⚠ `bg-neutral`은 **없는 토큰**이었다(있는 것은 `neutral-soft`뿐) — 무효 구간이
    투명해질 뻔했다. 지금 9기에 무효가 0이라 화면에 안 드러났다.
  */
  const seg = [
    { key: 'done', label: '응시 완료', value: n.done, bar: 'bg-primary' },
    { key: 'running', label: '응시 중', value: n.running, bar: 'bg-border-strong' },
    { key: 'stopped', label: '중단', value: n.stopped, bar: 'bg-warning' },
    { key: 'absent', label: '미응시', value: n.absent, bar: 'bg-danger' },
    { key: 'invalid', label: '무효', value: n.invalid, bar: 'bg-fg-subtle' },
  ].filter((x) => x.value > 0)

  if (total === 0) return null

  return (
    <div className="flex flex-col gap-1.5">
      <div className="bg-surface-2 flex h-2 overflow-hidden rounded-full" aria-hidden>
        {seg.map((x) => (
          <span key={x.key} className={x.bar} style={{ width: `${(x.value / total) * 100}%` }} />
        ))}
      </div>
      <div className="text-fg-muted flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs">
        <span className="text-fg-subtle">명단 {total}명</span>
        {seg.map((x) => (
          <span key={x.key} className="flex items-center gap-1">
            <span className={cn('size-1.5 rounded-full', x.bar)} />
            {x.label} <b className="text-fg font-bold tabular-nums">{x.value}</b>
          </span>
        ))}
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
