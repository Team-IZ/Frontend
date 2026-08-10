import ConsoleShell from '@/shells/ConsoleShell'
import PageHeader from '@/components/common/PageHeader'
import ErrorState from '@/components/common/ErrorState'
import { Spinner } from '@/components/ui/Spinner'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import { useCohortId } from '@/stores/cohortScope'
import { getToday, useDashboard } from './_/api/api'
import { ANALYSIS, GO_ANALYSIS, GO_PROJECT, projectPath } from './_/labels'
import { Section, BlockBody } from './_/components/Section'
import PipelineBlock from './_/components/PipelineBlock'
import ClassCompareBlock from './_/components/ClassCompareBlock'
import TodoBlock from './_/components/TodoBlock'

/*
  OP-01 오퍼레이터 대시보드 — **운영이 정상으로 돌고 있나.**

  학생 위험이 아니라 **운영 이상**이 대상이다. 스코프가 250명·10반이라 개인은 볼 수 없고,
  개별 학생 위험은 매니저가 처리한다(MG-01·MG-03) — 여기에는 **반 단위 이상에서만 보이고
  오퍼레이터만 조치할 수 있는 것**만 올린다.

  ▸ **`조치 필요` 네 줄이 이 화면의 존재 이유다.** 나머지 세 블록은 그 네 줄을 읽기 위한
    배경이다. **그래서 목업·정의서 §3의 순서를 바꿨다** — 거기서는 조치 필요가 세 번째라
    반 비교 10줄을 지나야 닿았고, 네 블록의 시각 무게가 완전히 같았다. 주인공이 배경보다
    아래에 있고 면적도 작으면 위계가 내용과 반대가 된다.

    지금 순서 — **이번 회차(1줄짜리 컨텍스트) → 조치 필요(주인공) → 반 비교(근거) → 비용.**
    읽는 순서가 *"지금 어느 회차인가 → 무엇을 해야 하나 → 왜"* 가 된다.
  ▸ **여기서 처리하지 않는다** — 요약과 링크만(OP-01 §5). 그래서 이 화면에는 액션 버튼이
    하나도 없고 나가는 길은 전부 데이터에 붙어 있다. **지표판이 작업대를 겸하면 둘 다
    못 한다.**
  ▸ **블록마다 실패가 갈린다**(F2). 반 비교 하나가 실패해도 화면을 비우지 않는다 —
    `Block<T>`가 그 분기를 담고 `BlockBody`가 한 번만 조립한다.

  **이 파일은 조립만 한다.** 조회는 `_/api`가(서버 자리), 각 블록의 표현은 그 블록
  컴포넌트가, 문구는 `_/labels`가 갖는다.

  세로 4블록이라 탭·마스터-디테일로 담지 않는다 — H1이 금지한 것은 **5~6블록**이고
  네 블록은 한 뷰포트에 들어간다(02-layout §6).
*/

export default function DashboardScreen() {
  /*
    기수는 서버에 물어본다(`stores/cohortScope`). 목일 때 쓰던 상수 `'7'`은 UUID가 아니라
    실서버에서 안 통한다. **정해지기 전에는 조회가 안 나간다.**
  */
  const { cohortId, cohortName, failed: cohortFailed } = useCohortId()
  const page = useDashboard(cohortId)
  const d = page.data

  return (
    <ConsoleShell role="operator" cohort={cohortName}>
      {/*
        **제목 줄은 조회를 기다리지 않는다**(async-states §1-3) — 통째로 없다가 생기면
        도착 순간 페이지 전체가 아래로 밀린다. 기수 이름은 스코프가 알고(`loadScope`),
        인원·반 수만 반 비교 응답에서 오므로 **그 조각만 늦게 채운다.**
      */}
      <PageHeader
        breadcrumb={
          cohortName
            ? `대시보드 › ${cohortName}${d ? ` › ${d.trainees}명 · ${d.classes}반` : ''}`
            : '대시보드'
        }
        title="대시보드"
      />

      {cohortFailed ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>기수가 없습니다</EmptyTitle>
            <EmptyDescription>
              운영 관리에서 기수를 먼저 만들면 여기에 진행 상황이 쌓입니다.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : page.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="size-6" aria-label="대시보드를 불러오는 중" />
        </div>
      ) : page.isError || !d ? (
        /*
          전체 조회 실패. **0으로 그리지 않는다** — 케이스 표가 *"그림 없음"* 으로 정했다.
          문구·재시도 여부는 `errorCopy`가 status·코드를 보고 정한다(async-states §3-1).
        */
        <ErrorState
          error={page.error}
          subject="대시보드"
          onRetry={() => page.refetch()}
          retrying={page.isFetching}
        />
      ) : (
        <>
          <Section
            title="이번 회차"
            note={d.pipeline.ok && `· ${d.pipeline.value.roundLabel}`}
            link={
              d.pipeline.ok
                ? { to: projectPath(d.pipeline.value.projectId), label: GO_PROJECT }
                : undefined
            }
          >
            <BlockBody
              block={d.pipeline}
              failedLabel="이번 회차 진행 상황을 불러오지 못했습니다"
              onRetry={() => page.refetch()}
            >
              {(p) => <PipelineBlock p={p} today={getToday()} />}
            </BlockBody>
          </Section>

          {/* 이 화면의 주인공 — 나머지 셋은 이 네 줄을 읽기 위한 배경이다 */}
          <Section title="조치 필요" note={d.todos.ok && `· ${d.todos.value.length}건`} lead>
            <BlockBody
              block={d.todos}
              failedLabel="조치 항목을 불러오지 못했습니다"
              onRetry={() => page.refetch()}
            >
              {(todos) => (
                <TodoBlock
                  todos={todos}
                  upcomingRoundLabel={
                    d.pipeline.ok && d.pipeline.value.notStarted
                      ? d.pipeline.value.roundLabel
                      : null
                  }
                />
              )}
            </BlockBody>
          </Section>

          <Section
            title="반 비교"
            /*
              **기준 회차를 밝힌다.** 강조하지 않으면 지금 회차 결과로 읽는다(OP-01 §6) —
              파이프라인이 `0/250`인데 여기 숫자가 차 있으면 특히 그렇다.
            */
            note={
              d.compare.ok &&
              `· ${d.compare.value.basisRoundLabel} 기준 — ${d.compare.value.currentRoundLabel}는 ${
                d.compare.value.currentNotStarted ? '아직 결과 없음' : '미발행'
              }`
            }
            link={{ to: ANALYSIS, label: GO_ANALYSIS }}
          >
            <BlockBody
              block={d.compare}
              failedLabel="반별 위험 비율을 불러오지 못했습니다"
              onRetry={() => page.refetch()}
            >
              {(c) => <ClassCompareBlock c={c} />}
            </BlockBody>
          </Section>
        </>
      )}
    </ConsoleShell>
  )
}
