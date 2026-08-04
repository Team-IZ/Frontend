import { useCallback } from 'react'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table'
import { Progress } from '@/components/ui/Progress'
import { useAsync } from '@/lib/useAsync'
import { getCost } from '../_/api/api'
import { formatUsd, perTrainee } from '../_/rules'
import { COHORT_ID } from '../_/cohortScope'
import SectionHeader from '../_/components/SectionHeader'
import TableFooterBar from '../_/components/TableFooterBar'
import { Loading, LoadFailed } from '../_/components/AsyncState'

/*
  ⑤ 비용 — **기관 총량 + 기수/반.**

  **여기서는 절대 금액을 쓴다.** OP-01 대시보드가 증감만 쓰는 것과 다르다 — 거기는
  *"운영이 정상인가"* 를 보는 지표판이라 판단 기준 없는 금액이 놀라움만 주지만, 이 탭은
  **얼마를 어디에 쓰고 있나**가 질문이라 금액이 그 답이다(OP-01 §5가 `비용 → OP-06 비용`
  으로 보낸 이유).

  **모델별 단가는 여기 없다** — 플랫폼이 정하고 기관은 티어 이름만 본다(SA-03, OP-06 §7).

  범위가 둘이다. 위 요약은 **기관 전체**, 아래 표는 **선택 기수**다 — 한 화면에 두 범위가
  있으므로 각 제목에 그것을 쓴다(스코프 표기 규칙).
*/
/*
  `onCountsChange`를 받지 않는다 — 이 탭은 **목록이 아니라 금액**이라 셀 것이 없고,
  여기서 바꾸는 것도 없다(읽기 전용). 레지스트리가 넘겨도 무시된다.
*/
export default function CostTab() {
  const load = useCallback(() => getCost(COHORT_ID), [])
  const cost = useAsync(load)

  if (cost.loading) return <Loading label="비용을 불러오는 중" />
  if (cost.failed || !cost.data)
    return <LoadFailed label="비용을 불러오지 못했습니다" onRetry={cost.reload} />

  const { summary, classes } = cost.data
  /** 예산 대비. 예산이 없으면 비율을 그리지 않는다 — 분모 없는 퍼센트는 만들 수 없다 */
  const usedPct = summary.budget ? Math.round((summary.total / summary.budget) * 100) : null

  return (
    <>
      <SectionHeader
        title="비용"
        breakdown={`${summary.month.replace('-', '년 ')}월 · 기관 전체`}
      />

      {/*
        요약 — 카드 하나 안에 기관 총량과 기수별을 나란히 둔다. **카드를 셋으로 나누지
        않는다**: 중첩 카드는 항상 틀리고(H7), 같은 달의 같은 돈을 쪼갠 값이라 한 면
        위에서 읽혀야 `기관 $412 = 7기 $268 + 8기 $144`가 보인다.
      */}
      <div className="bg-surface border-border mb-6 grid gap-6 rounded-md border p-5 sm:grid-cols-3">
        <div>
          <p className="text-fg-subtle text-xs">이번 달 · 기관 전체</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{formatUsd(summary.total)}</p>
          {usedPct !== null && summary.budget !== null && (
            <div className="mt-2">
              {/*
                `Progress`는 **루트가 Track·Indicator를 이미 그린다.** 둘을 children으로
                또 넣으면 바가 두 줄로 나온다(실제로 그렇게 만들었다가 렌더에서 잡았다) —
                children은 라벨·값처럼 바 위에 얹는 것만 받는다.
              */}
              <Progress value={usedPct} aria-label={`예산 대비 ${usedPct}%`} />
              <p className="text-fg-subtle mt-1.5 text-2xs">
                예산 {formatUsd(summary.budget)} 대비 {usedPct}%
              </p>
            </div>
          )}
          <p className="text-fg-muted mt-1 text-xs">
            전월 대비{' '}
            <b className="font-semibold">
              {summary.changePct > 0 ? '+' : ''}
              {summary.changePct}%
            </b>
          </p>
        </div>

        {summary.cohorts.map((c) => (
          <div key={c.id}>
            <p className="text-fg-subtle text-xs">{c.name}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{formatUsd(c.amount)}</p>
            {/*
              1인당은 **같은 줄에 분자·분모가 다 있는** 파생값이라 화면이 나눈다.
              기수끼리 인원이 달라(250 vs 252) 총액만 보면 어느 쪽이 비싼지 안 갈린다.
            */}
            <p className="text-fg-muted mt-2 text-xs">
              {c.trainees}명 · 1인당 {perTrainee(c.amount, c.trainees)}
            </p>
          </div>
        ))}
      </div>

      <SectionHeader title="반별" count={`${classes.length}개`} breakdown="7기 · 이번 달" />

      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-24">반</TableHead>
            {/*
              **흡수 열을 `담당`에 둔다.** 표 열 폭 표준은 남는 폭을 마지막 열이 먹게 하되
              그 칸이 **서술 열이면 가장 좋다**고 한다 — 그 전제는 마지막이 액션이거나
              서술이라는 것이다. 이 표는 액션이 없고 마지막이 **값**이라, 규칙 문장만 따라
              `비용`을 비우면 `세션`과 `비용` 사이에 700px가 벌어져 둘을 같이 못 읽는다
              (실제로 그렇게 만들었다가 렌더에서 잡았다).
              이름 열이 흡수하면 **숫자 셋이 오른쪽에 모여 나란히** 읽힌다.
            */}
            <TableHead>담당</TableHead>
            <TableHead className="w-24 text-right">교육생</TableHead>
            <TableHead className="w-24 text-right">세션</TableHead>
            <TableHead className="w-28 text-right">비용</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {classes.map((c) => (
            <TableRow key={c.classId}>
              <TableCell className="font-semibold">{c.className}</TableCell>
              {/*
                담당 없는 반을 **붉게 칠하지 않는다.** 여기서 할 조치가 없고, 같은 사실을
                `반 · 명단`과 `매니저` 탭이 이미 경고로 올린다 — 세 곳이 같은 것을 세 가지
                무게로 말하면 어느 것이 신호인지 흐려진다(D1).
              */}
              <TableCell className="text-fg-muted text-xs">
                {c.managerName ?? '담당 없음'}
              </TableCell>
              <TableCell className="text-right tabular-nums">{c.trainees}</TableCell>
              <TableCell className="text-right tabular-nums">{c.sessions}</TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {formatUsd(c.amount)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <TableFooterBar
        range={`1–${classes.length} / ${classes.length}개`}
        page={1}
        totalPages={1}
        onPageChange={() => {}}
      />
    </>
  )
}
