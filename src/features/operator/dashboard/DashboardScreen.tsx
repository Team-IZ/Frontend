import ConsoleShell from '@/shells/ConsoleShell'
import PageHeader from '@/components/common/PageHeader'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import { useCohortId } from '@/stores/cohortScope'
import { getToday, useDashboard } from './_/api/api'
import { ANALYSIS, GO_ANALYSIS, GO_PROJECT, projectPath } from './_/labels'
import { Section, BlockBody } from './_/components/Section'
import { ClassCompareSkeleton, PipelineSkeleton, TodoSkeleton } from './_/components/BlockSkeleton'
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
  const { cohortId, cohortName, failed: cohortFailed, cohorts, selectCohort } = useCohortId()
  const page = useDashboard(cohortId)
  /** 값이 온 블록만 꺼낸다 — 다른 블록의 문구가 이 값을 참조한다 */
  const pipe = page.pipeline?.state === 'ok' ? page.pipeline.value : null
  const compare = page.compare?.state === 'ok' ? page.compare.value : null
  const todos = page.todos?.state === 'ok' ? page.todos.value : null

  return (
    <ConsoleShell
      role="operator"
      cohort={cohortId ?? ''}
      cohorts={cohorts}
      onCohortChange={selectCohort}
    >
      {/*
        **제목 줄은 조회를 기다리지 않는다**(async-states §1-3) — 통째로 없다가 생기면
        도착 순간 페이지 전체가 아래로 밀린다. 기수 이름은 스코프가 알고(`loadScope`),
        인원·반 수만 반 비교 응답에서 오므로 **그 조각만 늦게 채운다.**
      */}
      <PageHeader
        breadcrumb={
          cohortName
            ? `대시보드 › ${cohortName}${page.head ? ` › ${page.head.trainees}명 · ${page.head.classes}반` : ''}`
            : '대시보드'
        }
        title="대시보드"
      />

      {/*
        **화면 전체를 막는 것은 기수가 없을 때뿐이다.** 조회 셋은 각자 도착하고 각자
        실패하므로(§2-1) 여기에 전역 로딩·전역 실패 분기가 없다 — 전에는 가장 느린
        조회(5.2초) 때문에 화면이 8.1초 동안 스피너 하나였다.
      */}
      {cohortFailed ? (
        <Empty variant="empty">
          <EmptyHeader>
            <EmptyTitle>기수가 없습니다</EmptyTitle>
            <EmptyDescription>
              운영 관리에서 기수를 먼저 만들면 여기에 진행 상황이 쌓입니다.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <Section
            title="이번 프로젝트"
            /*
              **진행 중인 회차가 아닐 때만 근거를 밝힌다.** 하나뿐인 RUNNING을 골랐다는
              것은 자명해서 쓰면 잔소리가 되고, 예정·종료를 집었을 때는 그 사실이 없으면
              사용자가 *"왜 이 회차지"* 에 답을 못 얻는다(§2-7).
            */
            note={
              pipe &&
              `· ${pipe.roundLabel}${
                pipe.pick === 'RUNNING'
                  ? ''
                  : pipe.pick === 'PLANNED'
                    ? ' · 다음 예정 프로젝트'
                    : ' · 마지막으로 끝난 프로젝트'
              }`
            }
            link={pipe ? { to: projectPath(pipe.projectId), label: GO_PROJECT } : undefined}
          >
            <BlockBody
              block={page.pipeline}
              skeleton={<PipelineSkeleton />}
              subject="이번 프로젝트 진행 상황"
              onRetry={page.retry.pipeline}
              retrying={page.fetching.pipeline}
            >
              {(p) => <PipelineBlock p={p} today={getToday()} />}
            </BlockBody>
          </Section>

          {/* 이 화면의 주인공 — 나머지 셋은 이 네 줄을 읽기 위한 배경이다 */}
          <Section title="조치 필요" note={todos && `· ${todos.length}건`} lead>
            <BlockBody
              block={page.todos}
              skeleton={<TodoSkeleton />}
              subject="조치 항목"
              onRetry={page.retry.todos}
              retrying={page.fetching.todos}
            >
              {(list) => (
                <TodoBlock
                  todos={list}
                  upcomingRoundLabel={pipe?.notStarted ? pipe.roundLabel : null}
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
              compare &&
              `· ${compare.basisRoundLabel} 기준 — ${compare.currentRoundLabel}는 ${
                compare.currentNotStarted ? '아직 결과 없음' : '미발행'
              }`
            }
            /*
              **값이 있을 때만 나가는 길을 준다.** 조회 중·집계 전·실패에도 링크가 떠
              있으면, 아무것도 없는 화면에서 «분석에서 보기»를 눌러 또 아무것도 없는
              화면으로 간다 — 나가는 길은 **데이터에 붙어 있는 것**이지 자리에 붙어
              있는 것이 아니다(OP-01 §5). 다른 두 블록은 이미 그렇게 하고 있었다.
            */
            link={compare ? { to: ANALYSIS, label: GO_ANALYSIS } : undefined}
          >
            <BlockBody
              block={page.compare}
              /* 반 수는 이 블록과 **같은 응답**에서 온다 — 캐시가 있는 재진입에서만
                 정확하고, 첫 진입은 기본값으로 자리를 잡는다 */
              skeleton={<ClassCompareSkeleton rows={page.head?.classes} />}
              subject="반별 위험 비율"
              onRetry={page.retry.compare}
              retrying={page.fetching.compare}
            >
              {(c) => <ClassCompareBlock c={c} />}
            </BlockBody>
          </Section>
        </>
      )}
    </ConsoleShell>
  )
}
