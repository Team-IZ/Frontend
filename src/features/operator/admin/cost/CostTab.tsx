import { useCallback, useState } from 'react'
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
import { cn } from '@/lib/utils/cn'
import { getCost } from '../_/api/api'
import type { ClassCostSort } from '../_/api/types'
import { formatUsd } from '../_/rules'
import { COHORT_ID } from '../_/cohortScope'
import SectionHeader from '../_/components/SectionHeader'
import { FilterSelect } from '../_/components/AdminFilters'
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
/*
  반별 정렬 — **셋**(D39).
    · 반 이름순(기본) — `A반 · B반 …`이 자연 순서다
    · 누적 많은 순 — 계속 많이 쓰는 곳. 한 달치는 표본이 작아 우연히 갈린다(D41)

  **달마다 정렬을 만들지 않는다**(D43) — 월이 열로 펼쳐졌으므로 *어느 달에 누가 많이
  썼나* 는 눈으로 훑는 일이고, 일곱 개짜리 드롭다운은 매트릭스가 이미 하는 일이다.

  **`1인당`과 `세션당`은 없다**(D40). 세션당은 산식이 미정의고(OP-01), 1인당은 세션
  규격과 회차가 전 기수 공통이라 **구조적으로 상수**다 — 실측 $1.12~$1.23이었다.
*/
/*
  칸 농도 4단계. **토큰만 쓴다**(하드코딩 색은 `check:design`이 막는다).
  0단계는 배경 없음 — 낮은 값까지 칠하면 표 전체가 얼룩진다.
*/
const HEAT = ['', 'bg-primary-soft/30', 'bg-primary-soft/60', 'bg-primary-soft']

const SORT_OPTIONS = [
  { value: 'NAME', label: '반 이름순' },
  { value: 'COHORT_AMOUNT', label: '누적 많은 순' },
]

export default function CostTab() {
  const [sort, setSort] = useState<ClassCostSort>('NAME')
  const load = useCallback(() => getCost(COHORT_ID, sort), [sort])
  const cost = useAsync(load)

  if (cost.loading) return <Loading label="비용을 불러오는 중" />
  if (cost.failed || !cost.data)
    return <LoadFailed label="비용을 불러오지 못했습니다" onRetry={cost.reload} />

  const { summary, classes } = cost.data
  /*
    예산 대비 — **기수 누적 기준**(D40). 이번 달을 기수 전체 예산으로 나누고 있었다면
    늘 작게 나와 안심하게 된다. 예산이 없으면 비율을 안 그린다 — 분모 없는 퍼센트는
    만들 수 없다.
  */
  /** 열로 펼칠 달 — 오래된 것이 앞(월별 표는 최근이 위라 방향이 반대다) */
  const months = classes[0]?.monthly.map((m) => m.month) ?? []

  /*
    **칸 농도 — 그 달 안에서의 상대 위치**(D44).

    숫자만 늘어놓으면 이상치가 안 보인다: 실측으로 한 달 안의 편차가 **$6~9**뿐이라
    50칸 중에서 눈으로 못 찾는다. 배경 농도를 입히면 **행을 훑을 때 진한 칸이 먼저** 보인다.

    ⚠ **기준을 화면이 만들지 않는다**(E8). `$28 넘으면 빨강` 같은 임계값을 정하는 것이
    아니라 **그 달의 최소~최대 사이 어디쯤인지**만 칠한다 — 기준은 데이터가 정한다.
    색도 경고색이 아니라 primary 계열이다: **비싼 것이 잘못된 것은 아니다.**
  */
  const range = new Map<string, { min: number; max: number }>()
  for (const m of months) {
    const vals = classes.map((c) => c.monthly.find((x) => x.month === m)?.amount ?? 0)
    range.set(m, { min: Math.min(...vals), max: Math.max(...vals) })
  }

  /** 0~3단계. 폭이 0이면(전부 같으면) 칠하지 않는다 — 차이가 없는데 강약을 만들지 않는다 */
  const level = (month: string, amount: number) => {
    const r = range.get(month)
    if (!r || r.max === r.min) return 0
    return Math.round(((amount - r.min) / (r.max - r.min)) * 3)
  }

  const usedPct = summary.budget ? Math.round((summary.cohortTotal / summary.budget) * 100) : null

  return (
    <>
      {/*
        **범위가 기수다**(D40). `기관 전체`라 적고 있었는데 요약도 표도 선택 기수 것이라
        말과 내용이 달랐다 — 정의서도 이 탭을 `선택 기수`로 정의한다(§3).
      */}
      <SectionHeader
        title="비용"
        breakdown={`${summary.cohorts[0]?.name ?? ''} · ${summary.month.replace('-', '년 ')}월 기준`}
      />

      {/*
        요약 — 카드 하나 안에 기관 총량과 기수별을 나란히 둔다. **카드를 셋으로 나누지
        않는다**: 중첩 카드는 항상 틀리고(H7), 같은 달의 같은 돈을 쪼갠 값이라 한 면
        위에서 읽혀야 `기관 $412 = 7기 $268 + 8기 $144`가 보인다.
      */}
      {/*
        요약 — **기수 전체가 기준이다**(D40). 이번 달만 보고 있었는데, 이 화면의 범위는
        기수이고(정의서 §3) 기수는 7개월이라 *"지금까지 얼마 썼나"* 를 답할 수 없었다.
        예산 비율도 월이 아니라 누적으로 잰다.

        **3열 고정 격자를 안 쓴다** — 기수가 하나면 칸이 비고 셋이면 넘친다(D39).
      */}
      <div className="bg-surface border-border mb-6 flex flex-wrap gap-x-12 gap-y-6 rounded-md border p-5">
        <div className="w-56 shrink-0">
          <p className="text-fg-subtle text-xs">기수 누적</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{formatUsd(summary.cohortTotal)}</p>
          {usedPct !== null && summary.budget !== null && (
            <div className="mt-2">
              {/*
                `Progress`는 **루트가 Track·Indicator를 이미 그린다.** 둘을 children으로
                또 넣으면 바가 두 줄로 나온다(실제로 그렇게 만들었다가 렌더에서 잡았다).
              */}
              {/*
                바로 아래 문단이 같은 값을 말하므로 그것을 라벨로 가리킨다 — 같은 문장을
                `aria-label`로 또 쓰면 한 사실이 두 곳에 생긴다(D1).

                ⚠ 접근성 트리에 `x`가 보이는 것은 **Base UI가 넣는 1×1px 자리표시자**다
                (`role="presentation"` + `visuallyHidden`). 화면에도 스크린 리더에도 안
                나온다 — `innerText`로만 잡혀서 결함으로 오인했다(D44).
              */}
              <Progress value={usedPct} aria-labelledby="cost-budget-note" />
              <p id="cost-budget-note" className="text-fg-subtle mt-1.5 text-2xs">
                계약 예산 {formatUsd(summary.budget)} 대비 {usedPct}%
              </p>
            </div>
          )}
        </div>

        <div>
          <p className="text-fg-subtle text-xs">이번 달</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{formatUsd(summary.total)}</p>
          {/*
            **얼마에서 얼마로**를 같이 적는다(D39) — `+12%`가 $400→$412인지 $50→$56인지에
            따라 할 일이 다르다. 첫 달이면 비교 대상이 없으므로 안 그린다(F3).
          */}
          {summary.previousTotal !== null && (
            <p className="text-fg-muted mt-2 text-xs">
              지난달 {formatUsd(summary.previousTotal)} →{' '}
              <b className="font-semibold">
                {summary.changePct > 0 ? '+' : ''}
                {summary.changePct}%
              </b>
            </p>
          )}
        </div>

        <div>
          {/*
            **남은 기간이 소진율과 짝이다.** `44%`만 보면 많은지 알 수 없고, *"2개월 남았는데
            44%"* 여야 판단이 된다. **예측은 하지 않는다** — *"이 추세면 초과"* 는 화면이
            만드는 판정이라(E8) 재료만 주고 판단은 사람이 한다.
          */}
          <p className="text-fg-subtle text-xs">남은 기간</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{summary.monthsLeft}개월</p>
          <p className="text-fg-muted mt-2 text-xs">
            {summary.cohorts[0]?.period ?? ''} · {summary.cohorts[0]?.trainees ?? 0}명
          </p>
        </div>
      </div>

      {/*
        월별 — **이 화면에 없던 축이다**(D40).

        `projectNames`가 금액을 설명한다. 회차가 둘인 달이 비싼 것은 정상이고, **회차가
        없는데 비싼 달**이 조치 대상이다 — 금액만 있으면 그 구분을 할 수 없었다.

        차트를 안 쓴다: 점이 7~12개뿐이라 표로 충분하고, **차트는 회차 이름을 못 담는다.**
      */}
      <SectionHeader
        title="월별"
        count={`${summary.monthly.length}개월`}
        breakdown={`${summary.cohorts[0]?.name ?? ''} · 개강부터 이번 달까지`}
      />

      <Table className="mb-8 table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {/*
              **흡수 열을 `월`에 둔다**(D44). 마지막 열이 남는 폭을 먹는 것이 표준이지만
              그 전제는 마지막이 **액션이나 서술 열**일 때다 — 여기 마지막은 값이라
              `회차`를 비우면 927px가 벌어져 한 행을 가로로 못 읽는다(실측).
              식별 열이 여백을 먹으면 스캔에 방해가 안 되고 숫자 셋이 오른쪽에 모인다.
            */}
            <TableHead>월</TableHead>
            {/* 흡수 열 — 회차 이름이 길고, 서술 열이 흡수하는 것이 표준이다 */}
            <TableHead className="w-[420px]">회차</TableHead>
            <TableHead className="w-24 text-right">세션</TableHead>
            <TableHead className="w-28 text-right">비용</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {summary.monthly.map((m) => (
            <TableRow key={m.month} className={cn(m.month === summary.month && 'bg-primary-soft')}>
              <TableCell className="font-semibold tabular-nums">
                {m.month.replace('-', '. ')}
              </TableCell>
              {/*
                회차가 없는 달 — **`—`가 아니라 무엇이 있었는지 쓴다**(F3: 없음과 0은 다르다).
                다시 보기·재응시는 회차 마감과 무관하게 일어나므로 비용이 0이 아니다.
              */}
              <TableCell className="text-fg-muted truncate text-xs">
                {m.projectNames.length > 0 ? (
                  m.projectNames.join(' · ')
                ) : (
                  <span className="text-fg-subtle">마감된 회차 없음 · 다시 보기·재응시</span>
                )}
              </TableCell>
              <TableCell className="text-fg-muted text-right text-xs tabular-nums">
                {m.sessions}
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {formatUsd(m.amount)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/*
        반별 — **이번 달 것이다.** 월별이 기수 전 기간이라 범위가 다르므로 제목에 쓴다.

        표가 둘이 되면서 한 화면에 안 들어간다(실측 395px 넘침). **월별을 위에 둔 것은
        그것이 이 화면의 새 축이기 때문**이고, 반별은 *이번 달 어디가 많이 썼나*라는
        한 단계 아래 질문이라 아래에 둔다 — 스크롤해서 보는 순서가 질문의 순서다.
      */}
      <SectionHeader
        title="반별"
        count={`${classes.length}개`}
        breakdown={`${summary.cohorts[0]?.name ?? ''} · 개강부터 이번 달까지`}
      />

      {/* 툴바 — 정렬은 왼쪽(E3). 이 표에는 검색·필터가 없다(10행이라 좁힐 일이 없다) */}
      <div className="mb-3 flex items-center gap-2">
        <FilterSelect
          label="정렬"
          value={sort}
          options={SORT_OPTIONS}
          onChange={(v) => setSort(v as ClassCostSort)}
          className="min-w-36"
        />
      </div>

      {/*
        반별 — **월이 열로 펼쳐진 매트릭스**(D43).

        한 달치만 보여주고 있었다. 그러면 *"6월에 어느 반이 많이 썼나"* 를 볼 수 없고,
        달을 골라 가며 봐도 **두 달을 나란히 못 본다** — 앞 달 숫자를 외워야 한다.
        한때 월별 표의 월을 눌러 바꾸게 했는데(D42), **누를 수 있다는 것이 화면에 안 보였다.**

        열이 넘칠 것으로 봤던 것이 잘못이었다 — `교육생`·`세션`을 같이 세었기 때문이다.
        1인당을 뺀 뒤(D40) 그 둘은 이 표의 질문에 답하지 않는다. 빼고 재니 **696px**로
        셸(약 1130px) 안에 들어간다.

        **한 행이 한 반의 궤적이다** — 왼쪽에서 오른쪽으로 시간이 흐르고, 끝의 `누적`이
        결론이다. 어느 반이 어느 달에 튀었는지가 눈으로 잡힌다.
      */}
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-20">반</TableHead>
            {/*
              **`담당`은 남긴다.** 비싼 반을 찾은 다음 할 일이 *누구에게 묻나* 라서다.
              `교육생`·`세션`은 뺐다 — 1인당을 안 쓰는 이상(D40) 판단에 안 들어가고,
              그 자리를 월별 칸이 쓴다.
            */}
            {/*
              **흡수 열이 여기다**(D44). `누적`을 비웠더니 751px가 되어 7월과 누적 사이가
              벌어졌다 — 이 파일 위쪽에 *"규칙 문장만 따라 마지막을 비우면 700px가
              벌어진다"* 고 적어 두고 같은 실수를 반복했다.
              이름·담당이 왼쪽에 붙고 **숫자 여섯이 오른쪽에 모여 나란히** 읽힌다.
            */}
            <TableHead>담당</TableHead>
            {months.map((m) => (
              <TableHead
                key={m}
                className={cn('w-16 text-right', m === summary.month && 'text-fg')}
              >
                {Number(m.slice(5))}월
              </TableHead>
            ))}
            <TableHead className="w-24 text-right">누적</TableHead>
            {/*
              **원인을 반별로도 본다**(D44). 이 화면은 *비용은 세션에서 나온다* 고 계속
              말해 왔는데, D43에서 반별 `세션`을 빼면서 **원인을 반별로는 못 보게 됐다** —
              *"F반이 왜 누적 1위지"* 의 답이 여기 있다.
            */}
            <TableHead className="w-24 text-right">누적 세션</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {classes.map((c) => (
            <TableRow key={c.classId}>
              <TableCell className="font-semibold">{c.className}</TableCell>
              {/*
                담당 없는 반을 **붉게 칠하지 않는다.** 여기서 할 조치가 없고, 같은 사실을
                `반`과 `매니저` 탭이 이미 경고로 올린다 — 세 곳이 같은 것을 세 가지 무게로
                말하면 어느 것이 신호인지 흐려진다(D1).
              */}
              <TableCell className="text-fg-muted truncate text-xs">
                {c.managerName ?? '담당 없음'}
              </TableCell>
              {c.monthly.map((m) => (
                <TableCell
                  key={m.month}
                  className={cn(
                    'text-right text-xs tabular-nums',
                    m.month === summary.month ? 'text-fg font-semibold' : 'text-fg-muted',
                    // 그 달 안에서 큰 값일수록 진하다 — 임계값이 아니라 상대 위치다
                    HEAT[level(m.month, m.amount)],
                  )}
                >
                  {formatUsd(m.amount)}
                </TableCell>
              ))}
              <TableCell className="text-right font-semibold tabular-nums">
                {formatUsd(c.cohortAmount)}
              </TableCell>
              <TableCell className="text-fg-muted text-right text-xs tabular-nums">
                {c.cohortSessions}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/*
        **푸터를 안 그린다**(D44). `1–10 / 10개`는 **나뉜 것이 있을 때** 쓰는 표기인데
        10반이 전부라 페이지가 하나다 — 제목의 `10개`로 충분하다.
        E7(*페이지가 하나면 페이저를 그리지 않는다*)의 연장이다.
      */}
    </>
  )
}
