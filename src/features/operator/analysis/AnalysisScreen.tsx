import { useState } from 'react'
import ControlLabel from '@/components/common/ControlLabel'
import ConsoleShell from '@/shells/ConsoleShell'
import PageHeader from '@/components/common/PageHeader'
import { Card } from '@/components/ui/Card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Button } from '@/components/ui/Button'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { useCohortId } from '@/stores/cohortScope'
import { useCohortCompare, useRoundGrid } from './_/api/api'
import ErrorState from '@/components/common/ErrorState'
import StaleBlock from '@/components/common/StaleBlock'
import GridSkeleton, { CompareSkeleton } from './_/components/GridSkeleton'
import RoundToolbar from './_/components/RoundToolbar'
import RoundGridTable from './_/components/RoundGridTable'
import GridLegend from './_/components/GridLegend'
import CohortCompareTable from './_/components/CohortCompareTable'
import { REACH_RAMP, REACH_STEPS, TAB_PURPOSE } from './_/labels'
import type { AnalysisTab, Level, RoundSort } from './_/api/types'

/*
  OP-02 분석 — **어디가 기수에서 벗어나나.**

  이 화면의 고유 질문은 하나다: *"우리가 나아지고 있나."* OP-01은 **지금**만 본다.
  나머지 질문은 전부 다른 화면이 답하므로(지금 회차 상태·조치·반별 제출률·교안·배정),
  여기에는 **무엇과 견줘야만 읽히는 값**만 둔다.

  ▸ **미프끼리는 값을 비교할 수 없다.** 회차마다 개념·코드·난이도가 다르다 —
    `12% → 19%`가 나빠진 것인지 그 회차가 어려웠던 것인지 값만으로는 안 갈린다.
    **난이도는 같은 회차를 10반이 다 보므로 기수 전체를 빼면 상쇄된다.** 그래서 색이
    값이 아니라 **기수 대비 부호**에 붙는다.
  ▸ **액션 버튼이 없다.** 나가는 길은 **데이터 자체**에 붙어 있다 — 열 머리는 그 회차
    현황(OP-04), 계층 토글은 팀 드릴다운. 판정 줄과 함께 버튼 7개를 전부 지웠다.
  ▸ **드릴다운이 이 화면 안에 있어야 한다.** 오퍼레이터는 매니저 화면(MG-02)에 갈 수
    없다 — 팀 계층으로 내려가는 것이 그 드릴다운이다.
  ▸ **개인까지 내려가지 않는다.** 개인은 이름·답변이 있어야 뜻이 생기고, 그건 회차 단위
    화면(OP-04)의 일이다.

  **탭을 URL에 두지 않는다.** OP-06은 딥링크(조치 필요 → 특정 탭) 때문에 경로에 탭이
  있지만, 여기로 들어오는 링크는 전부 기본 탭이라 `useState`로 충분하다.

  **이 파일은 조립만 한다.** 조회·정렬·집계는 `_/api`가(서버 자리), 격자는
  `RoundGridTable`이, 문구·색 매핑은 `_/labels`가 갖는다.
*/

/*
  **기본 범위를 화면이 정하지 않는다.** 상수(`1–4차`)를 쓰면 발행 회차가 몇 개냐에 따라
  빈칸 수가 널뛴다 — 실측에서 표의 40%가 빈칸이었다. 서버가 `발행 전부 + 진행 중 1개`로
  정해서 `appliedFrom/To`로 알려준다(`_/api/types.ts`).

  `null`은 *"아직 안 골랐다 = 서버 기본"* 이고, 사용자가 고르면 그때부터 명시값이 된다.
*/

export default function AnalysisScreen() {
  /* 기수는 서버에 물어본다(`stores/cohortScope`) — 정해지기 전에는 조회가 안 나간다 */
  const { cohortId, cohortName, failed: cohortFailed, cohorts, selectCohort } = useCohortId()
  const [tab, setTab] = useState<AnalysisTab>('rounds')
  const [level, setLevel] = useState<Level>('class')
  /*
    **계층별 선택을 따로 기억한다.** 한 변수를 공유했더니 `팀`으로 갈 때 덮어쓴 값이
    `반별`로 돌아와도 남아서, **사용자가 고른 적 없는 반 하나만 필터된 채로** 보였다.

    정의서의 *"팀으로 바꾸면 반이 단일 선택이 된다"* 는 **팀 계층 안의 규칙**이지 반별
    선택을 바꾸라는 말이 아니다. 상위→하위 드릴다운에서 상위 상태가 유지되는 것이 기본이다.
  */
  const [classIds, setClassIds] = useState<string[]>([])
  /** 팀 계층에서 보고 있는 반. `null`이면 **아직 안 골랐다** */
  const [teamClassId, setTeamClassId] = useState<string | null>(null)
  /**
   * 팀 계층에서 보고 있는 회차. `null`이면 아직 안 골랐다.
   *
   * ⚠ **팀 계층은 회차 하나를 요구한다** — 서버가 막는다(`api.ts`). 팀은 회차마다
   * 재편성될 수 있어 회차를 가로질러 같은 팀을 추적하는 것이 성립하지 않는다.
   */
  const [teamProjectId, setTeamProjectId] = useState<string | null>(null)
  const [fromRound, setFromRound] = useState<number | null>(null)
  const [toRound, setToRound] = useState<number | null>(null)
  const [sort, setSort] = useState<RoundSort>('LATEST_WORST')
  /** 비교 대상 기수. `null`이면 **서버가 고른다** */
  const [compareId, setCompareId] = useState<string | null>(null)

  /*
    **안 보는 탭은 조회하지 않는다.** 마운트됐다고 데이터가 필요한 것은 아니다 —
    실측에서 탭 하나 진입에 조회 8건 중 5건이 이것이었다(mock-first §6-1).
    조건이 곧 캐시 키라 반·회차를 되돌리면 다시 부르지 않는다.
  */
  const grid = useRoundGrid(
    tab === 'rounds' && cohortId
      ? {
          cohortId,
          level,
          // 팀 계층에서는 그 반 하나만 보낸다 — 반별 선택은 건드리지 않는다
          classIds: level === 'team' ? (teamClassId ? [teamClassId] : []) : classIds,
          projectId: teamProjectId ?? undefined,
          fromRound: fromRound ?? undefined,
          toRound: toRound ?? undefined,
          sort,
        }
      : undefined,
  )
  const compare = useCohortCompare(
    tab === 'cohorts' && cohortId
      ? { cohortId, compareCohortId: compareId, sort: 'WORSENED' }
      : undefined,
  )

  const g = grid.data
  /*
    **「무엇이 빠졌나」는 화면이 안다 — 서버에 물을 일이 아니다.**

    전에는 이 판정이 응답(`g.needs`)에 실려 왔다. 그래서 반·회차를 다 고른 뒤에도
    **응답이 올 때까지(팀 계층은 9초) «골라 주세요»가 그대로 남아** 클릭이 안 먹은 것처럼
    보였다 — 이전 값 유지(`listQueryOptions`)가 그 옛 안내를 계속 그렸기 때문이다.

    판정에 쓰는 값이 **둘 다 화면 상태**(고른 반·고른 회차)라 왕복이 필요 없다.
  */
  const needs: 'CLASS' | 'ROUND' | 'BOTH' | undefined =
    level !== 'team'
      ? undefined
      : !teamProjectId && !teamClassId
        ? 'BOTH'
        : !teamProjectId
          ? 'ROUND'
          : !teamClassId
            ? 'CLASS'
            : undefined
  const teamClassName = g?.allClasses.find((c) => c.classId === teamClassId)?.className
  /*
    **기수를 모르는 동안 빈 조각을 만들지 않는다.** `분석 › › 회차 흐름`처럼 구분자가 둘
    붙어 나온다 — 있는 조각만 잇는다(§2-9).
  */
  const crumb = [
    '분석',
    cohortName,
    level === 'team' && teamClassName ? teamClassName : null,
    level === 'team' && teamClassName ? '팀' : tab === 'rounds' ? '프로젝트 흐름' : '기수 간 비교',
  ]
    .filter(Boolean)
    .join(' › ')

  /*
    기수를 모르는 동안 **자리표시자 `7기`를 그리지 않는다.** 셸 기본값이 `'7기'`라 실제로는
    9기인데 헤더만 7기라고 말했다 — `''`가 「스코프 자리를 그리지 않는다」의 계약값이다
    (`ConsoleShell` prop 주석). 오퍼레이터 5화면이 같다.
  */
  return (
    <ConsoleShell
      role="operator"
      cohort={cohortId ?? ''}
      cohorts={cohorts}
      onCohortChange={selectCohort}
    >
      <PageHeader breadcrumb={crumb} title="분석" />

      <Tabs value={tab} onValueChange={(v) => setTab(v as AnalysisTab)}>
        <TabsList className="mb-4">
          <TabsTrigger value="rounds">프로젝트 흐름</TabsTrigger>
          <TabsTrigger value="cohorts">기수 간 비교</TabsTrigger>
        </TabsList>

        <TabsContent value="rounds">
          {/*
            **이 표로 무엇을 판단하나.** 축 라벨은 읽는 법이지 용도가 아니라, 처음 보는
            사람은 격자를 훑다가 나간다. 한 줄만 쓴다 — 넘기면 잔소리가 된다.
          */}
          <p className="text-fg-muted mb-3 text-xs">{TAB_PURPOSE.rounds}</p>

          <RoundToolbar
            level={level}
            classIds={classIds}
            teamClassId={teamClassId}
            teamProjectId={teamProjectId}
            allClasses={g?.allClasses ?? []}
            allRounds={g?.allRounds ?? []}
            /* 고를 것이 아직 없다 — 빈 목록으로 열리게 두지 않는다(async-states §1-6) */
            loading={grid.isLoading}
            /*
              **없으면 `1`을 지어내지 않는다.** 회차가 하나도 없을 때 `1 – 1`이라고 쓰면
              1차가 있는 것처럼 읽힌다 — `null`이면 셀렉트가 `고르세요`를 그린다(§2-5).
            */
            fromRound={fromRound ?? g?.appliedFrom ?? null}
            toRound={toRound ?? g?.appliedTo ?? null}
            sort={sort}
            onChange={(p) => {
              if (p.level !== undefined) setLevel(p.level)
              if (p.classIds !== undefined) setClassIds(p.classIds)
              if (p.teamClassId !== undefined) setTeamClassId(p.teamClassId)
              if (p.teamProjectId !== undefined) setTeamProjectId(p.teamProjectId)
              if (p.fromRound !== undefined) setFromRound(p.fromRound)
              if (p.toRound !== undefined) setToRound(p.toRound)
              if (p.sort !== undefined) setSort(p.sort)
            }}
          />

          {cohortFailed ? (
            <Empty variant="empty">
              <EmptyHeader>
                <EmptyTitle>기수가 없습니다</EmptyTitle>
                <EmptyDescription>
                  프로젝트가 끝나야 견줄 값이 생깁니다.
                  <br />
                  운영 관리에서 기수를 먼저 만드세요.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : grid.isError ? (
            /* 실패 문구·재시도 여부는 `errorCopy`가 status·코드를 보고 정한다 */
            <ErrorState
              error={grid.error}
              subject="분석 결과"
              onRetry={() => grid.refetch()}
              retrying={grid.isFetching}
            />
          ) : needs ? (
            /*
              **팀 계층인데 고를 것이 남았다.** 빈 표가 아니라 **사용자가 할 일이 남은
              것**이다 — 「없는 것」 3종 중 유형 1 `아직`(점선)이다(02-layout §4).

              **무엇이 빠졌는지에 따라 문구가 갈린다.** 둘 다 없는데 반만 말하면
              고르고 나서 또 빈 화면을 본다.
            */
            <Empty variant="empty">
              <EmptyHeader>
                <EmptyTitle>
                  {needs === 'ROUND'
                    ? '어느 프로젝트의 팀을 볼지 골라 주세요'
                    : needs === 'CLASS'
                      ? '어느 반의 팀을 볼지 골라 주세요'
                      : '프로젝트와 반을 골라 주세요'}
                </EmptyTitle>
                <EmptyDescription>
                  팀 번호는 반 안에서만 유일하고,{' '}
                  <b className="font-semibold">팀은 프로젝트마다 다시 짜일 수 있어</b> 프로젝트를
                  가로질러 같은 팀으로 볼 수 없습니다.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : !g || g.needs ? (
            /*
              ⚠ **값이 아직 없는 것은 실패가 아니다.** 전에는 `grid.isError || !g`로 갈랐는데,
              기수가 정해지기 전에는 이 조회가 `enabled: false`라 `isLoading`도 거짓이다 —
              그래서 **진입 직후 1.8초 동안 «분석 결과가 표시되지 않았습니다»라는 빨간 화면**이
              떴다(플로우 관찰 · §2-9). 상류를 기다리는 것을 실패로 그린 것이다.

              `g.needs`도 여기서 받는다 — 화면은 다 골랐는데 **응답이 아직 「고르세요」 시절
              것**이면 그것은 격자가 아니라 **아직 안 온 것**이다. 격자 모양으로 자리를 잡는다.
            */
            <GridSkeleton />
          ) : g.columns.length === 0 ? (
            /*
              **회차가 하나도 없다.** 조회는 200인데 그릴 열이 없다 — 열 없는 격자를
              그리면 표 머리와 빈 행만 남아 사용자가 *"왜 안 나오지"* 를 묻게 된다
              (op-02-situations §2-3). 회차가 돌면 채워지므로 「없는 것」 유형 1 `아직`이고,
              **다시 시도를 붙이지 않는다** — 눌러도 회차가 생기지 않는다.
            */
            <Empty variant="pending">
              <EmptyHeader>
                <EmptyTitle>아직 볼 프로젝트가 없습니다</EmptyTitle>
                <EmptyDescription>
                  프로젝트를 만들고 끝나면 그 결과가 여기에 쌓입니다.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            /* 옛 값을 그리는 동안 그 사실을 숨기지 않는다 — `lib/listQuery` */
            <StaleBlock
              stale={grid.isFetching && grid.data !== undefined}
              label="격자를 불러오는 중"
            >
              <Card className="px-5 py-4">
                <RoundGridTable grid={g} />
              </Card>
              <GridLegend baselineName={g.baselineName} />
            </StaleBlock>
          )}
        </TabsContent>

        <TabsContent value="cohorts">
          <p className="text-fg-muted mb-3 text-xs">{TAB_PURPOSE.cohorts}</p>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            {/*
              **고를 기수가 없으면 select를 그리지 않는다.** 목록이 비었는데 컨트롤이
              남아 있으면 내부 값(`6`)이 그대로 뜨고, 무엇보다 **누를 수 없는 컨트롤은
              장식이다**(E7이 페이저에 대해 정한 것과 같은 이유).
            */}
            {(compare.data?.availableCohorts.length ?? 0) > 0 && (
              <Select
                /*
                  **실제로 견준 기수를 보여준다.** 사용자가 안 골랐을 때 서버 목록의 첫
                  `comparable`로 조회하므로(`api.ts`), 화면 state만 보면 표는 8기를 그리는데
                  셀렉트는 `없음`이 되어 둘이 다른 말을 한다.
                */
                /*
                  ⚠ **「비교 · 없음」을 뺐다.** 이 탭은 **견주는 것이 목적**이라 「안 견줌」은
                  화면을 비우는 것 말고 뜻이 없고, 무엇보다 골라도 **아무 일도 안 일어났다** —
                  `null`이 되면 서버가 비교를 안 하고, 그러면 폴백이 첫 `comparable`을 다시
                  고른다(`api.ts`). **누를 수는 있는데 아무것도 안 바뀌는 선택지**였다.
                */
                value={compareId ?? compare.data?.compareCohortId ?? ''}
                onValueChange={(v) => v && setCompareId(v as string)}
                /*
                  `items`가 없으면 트리거에 내부 값(`6`)이 그대로 뜬다.
                  **값에 `비교 ·`를 붙이지 않는다** — 이름은 칩 안 라벨이 말한다(회차 흐름 탭과 같다).
                */
                items={(compare.data?.availableCohorts ?? []).map((c) => ({
                  value: c.id,
                  label: c.label,
                }))}
              >
                {/* 회차 흐름 탭 툴바와 같은 형태 — 라벨을 칩 안에 두고 세로선으로 가른다 */}
                <SelectTrigger className="w-40" aria-label="비교 기수">
                  <ControlLabel>비교</ControlLabel>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(compare.data?.availableCohorts ?? []).map((c) => (
                    /*
                      **비교 불가한 기수도 목록에 두고 못 고르게 한다.** 빼 버리면
                      *"왜 저 기수는 없지"* 가 되는데, 답은 "겹치는 교안이 없어서"라
                      사용자가 알아야 할 사실이다.
                    */
                    <SelectItem key={c.id} value={c.id} disabled={!c.comparable}>
                      {c.label}
                      {!c.comparable && (
                        <span className="text-fg-subtle ml-1.5 text-xs">겹치는 교안 없음</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {/* 조건이 아니라 **이 표가 무엇인지**를 말한다 — 누를 수 있는 필터가 아니다 */}
            {/*
              **서버가 그렇다고 할 때만 단언한다.** 이 표는 절대 눈금(1~4단)을 두 기수에
              걸쳐 쓰는데, 그 근거가 *"교안이 같아서 값의 차이가 교육생 것"* 이다. 필터가
              실제로 안 걸렸다면 그 근거가 없으므로 **말을 낮춘다**(§2-2).
            */}
            <span className="text-fg-subtle text-2xs">
              {/*
                ⚠ **견줄 것이 있을 때만 낮춘다.** 비교 대상이 없으면 서버가 응답을 기본값으로
                채워 `sameCurriculumOnly: false`가 오는데(§2-2), 그때 «교안이 바뀐 개념도
                섞여 있다»고 쓰면 **하지도 않은 비교를 설명**하게 된다.
              */}
              {compare.data && compare.data.rows.length > 0 && !compare.data.sameCurriculumOnly
                ? '교안이 바뀐 개념도 섞여 있을 수 있습니다'
                : '같은 교안 · 같은 개념만'}
            </span>
          </div>

          {compare.isError ? (
            <ErrorState
              error={compare.error}
              subject="기수 간 비교"
              onRetry={() => compare.refetch()}
              retrying={compare.isFetching}
            />
          ) : !compare.data ? (
            /*
              ⚠ **값이 아직 없는 것은 실패가 아니다** — 회차 흐름 탭과 같은 버그가 여기에도
              있었다(§2-9). 기수가 정해지기 전에는 `enabled: false`라 `isLoading`도 거짓이다.
            */
            <CompareSkeleton />
          ) : compare.data.rows.length === 0 ? (
            /*
              **비어 있는 이유가 둘이고 할 일이 다르다.**

                견줄 기수가 아예 없다 → 기다리는 수밖에 없다(유형 1 `아직`)
                고르지 않았다        → **고르면 채워진다** — 그 말을 해야 한다

              한때 둘을 한 문구로 묶어 *"이 기관의 첫 기수예요"* 라고만 썼는데, 실제로는
              비교 가능한 기수가 있는데도 그렇게 말하고 있었다. **틀린 이유를 말하면
              사용자가 없는 문제를 고치러 간다.**
            */
            /*
              **테두리도 문구와 같이 갈린다.** 고를 기수가 있으면 고르면 채워지고(`없음`,
              실선), 없으면 다음 기수가 돌기를 기다리는 수밖에 없다(`아직`, 점선).
              한쪽으로 통일하면 문구가 갈라 놓은 것을 테두리가 도로 뭉갠다.
            */
            <Empty
              variant={
                compare.data.availableCohorts.some((c) => c.comparable) ? 'empty' : 'pending'
              }
            >
              <EmptyHeader>
                <EmptyTitle>
                  {compare.data.availableCohorts.some((c) => c.comparable)
                    ? '견줄 기수를 골라 주세요'
                    : '비교할 기수가 없습니다'}
                </EmptyTitle>
                <EmptyDescription>
                  {compare.data.availableCohorts.some((c) => c.comparable)
                    ? '같은 교안을 쓴 기수와 같은 개념끼리 맞대어 봅니다.'
                    : `${compare.data.currentCohortLabel}가 이 기관의 첫 기수예요. 다음 기수가 같은 교안으로 진행되면 같은 개념끼리 비교할 수 있습니다.`}
                </EmptyDescription>
              </EmptyHeader>
              <Button variant="ghost" onClick={() => setTab('rounds')}>
                프로젝트 흐름에서 기수 안의 변화 보기
              </Button>
            </Empty>
          ) : (
            /* 옛 값을 그리는 동안 그 사실을 숨기지 않는다 — `lib/listQuery` */
            <StaleBlock
              stale={compare.isFetching && compare.data !== undefined}
              label="비교를 불러오는 중"
            >
              <Card className="px-5 py-4">
                <CohortCompareTable data={compare.data} />
              </Card>
              {/*
                **`MG-02 히트맵과 같은 눈금`을 지웠다.** `MG-02`는 내부 화면 ID이고
                (02-layout §8 — 크롬 안에 조항 번호·설계 근거가 있으면 그것도 화면에
                나가는 글로 읽힌다), 무엇보다 **오퍼레이터는 그 화면에 갈 수 없다**
                (C3 — 자기 화면에서 남의 권한 범위를 설명하지 않는다). 갈 수도 없는
                화면과 눈금이 같다는 것은 사용자에게 아무 정보가 아니다.

                램프가 무엇을 뜻하는지는 남긴다 — 그건 이 표를 읽는 데 필요하다.
              */}
              {/*
                **눈금 옆에 계단을 붙인다.** `1단 → 4단`만으로는 1단과 4단이 무엇이
                다른지 알 수 없었다 — 색이 순서 있는 눈금인데 그 순서가 무엇의 순서인지
                화면에 없었던 것이다.

                **`2단 이하`가 기준인 이유가 여기서 그림으로 나온다** — 필수 구간(1·2단)과
                선택 구간(3·4단)이 갈려서, *"왜 2단인가"* 를 글로 설명할 필요가 없다
                (A7 — 판정은 문장이 아니라 데이터 위의 마크로).

                색 램프에 축 라벨을 다는 것이라 새 요소가 아니다.
              */}
              <div className="mt-3 flex flex-wrap items-start gap-x-6 gap-y-2">
                <span className="text-fg-subtle text-2xs">평균 도달 단계</span>
                <div className="flex gap-3">
                  {REACH_STEPS.map((s) => (
                    <span key={s.step} className="flex w-[92px] flex-col gap-1">
                      <span className={`h-2 rounded-sm ${REACH_RAMP[s.step]}`} />
                      <span className="text-fg-muted text-2xs font-medium">{s.step}단</span>
                      <span className="text-fg-subtle text-2xs leading-tight">{s.label}</span>
                    </span>
                  ))}
                </div>
                {/* 필수/선택 경계가 곧 위험 판정 기준이다 */}
                <span className="text-fg-subtle text-2xs leading-tight">
                  1·2단이 <b className="text-fg-muted font-medium">필수</b>
                  <span className="block">그 아래면 처방 대상입니다</span>
                </span>
              </div>
            </StaleBlock>
          )}
        </TabsContent>
      </Tabs>
    </ConsoleShell>
  )
}

/*
  ⚠ **로컬 `Loading`(스피너)을 지웠다.** 두 탭 모두 표 모양을 알아서 스켈레톤으로 자리를
  잡는다(`GridSkeleton` · `CompareSkeleton`) — 스피너는 «기다려»만 말하고 도착할 때 화면이
  튄다(op-02-situations §2-10).
*/
