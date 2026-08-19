import { useState } from 'react'
import { useNavigate } from 'react-router'
import ConsoleShell from '@/shells/ConsoleShell'
import PageHeader from '@/components/common/PageHeader'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import type { Report } from './_/api/types'
import { REPORT_SECTIONS, type ReportSectionKey } from './_/sections'
import { useReport } from './_/api/api'
import { useCohortId } from '@/stores/cohortScope'
import { exportReportCsv, reportDate } from './_/labels'
import { SlowNotice } from '@/components/common/Loading'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import ErrorState from '@/components/common/ErrorState'
import ReportHead from './_/components/ReportHead'
import ReportSkeleton from './_/components/ReportSkeleton'
import SectionHeading from './_/components/SectionHeading'
import DiagnosisSummary from './_/components/DiagnosisSummary'
import ConceptDistribution from './_/components/ConceptDistribution'
import RoundBreakdown from './_/components/RoundBreakdown'
import TopStudents from './_/components/TopStudents'
import ClassOps from './_/components/ClassOps'

/*
  OP-05 리포트 — 미니프로젝트 이해도 검증 결과 스냅샷.

  ▸ **원래는 문서 2종(탭 2개)이었다** — "수업 진단"(미프 종료 후)·"기수 결산"(빅프
    종료 후). 그 구조의 근거가 "앵커가 다르다"(미프=교안 개념, 빅프=본인 커밋
    영역)와 "발행 시점이 다르다"였는데, 빅프로젝트가 제품에서 빠지면서(사용자
    결정 — "우리는 그냥 미니프로젝트들로만 이해도를 검증한다") 두 근거가 동시에
    사라졌다. 우수 교육생·반별 위험자·집단 미달도 원래 순수 미프 기반이라 빅프를
    기다릴 이유가 없었다 — 탭을 하나로 합쳤다.
  ▸ **탐색 도구가 아니라 문서다**(정의서 §4) — 발행 시점 값이 고정돼 있고, 실시간
    필터·드릴다운이 없다. 그래서 섹션 전환은 URL이 아닌 **로컬 state**다 — OP-04처럼
    다른 화면이 특정 섹션에 딥링크할 일이 없다(§9 "나가는 링크가 없다"). 탭 값이
    경로에 있는 OP-06(운영 관리)과 갈리는 지점이 여기다.
  ▸ **섹션 전환은 상단 가로 탭이다** — 좌측 세로 목차를 쓰다가 바꿨다. 목차가 196px를
    상시 차지해 본체(개념별 도달 분포 표)가 그만큼 좁아졌는데, 이 문서에서 폭이
    필요한 건 표지, 다섯 줄짜리 목차가 아니다. 모양은 OP-06과 같은 공용 `Tabs`를
    쓴다 — 같은 콘솔 안에서 섹션을 고르는 UI가 화면마다 다를 이유가 없다.
  ▸ **PDF 내보내기 = 브라우저 내장 인쇄**(`window.print()`). 앱에 PDF 라이브러리도
    print 패턴도 없었고, 새 무거운 의존성을 넣기보다 네이티브 기능을 쓴다 — 실제
    벡터 PDF가 나오고 텍스트도 선택된다.
  ▸ 화면은 섹션 하나만 보여주지만 **인쇄에는 5개 섹션이 전부 들어가야 한다**(정의서
    §9 — PDF는 문서 전체다). 그래서 `TabsContent`에 `keepMounted`를 준다 — Base UI는
    기본적으로 활성 패널만 마운트하는데, 그러면 인쇄 시점 DOM에 섹션 하나만 남아
    나머지 넷이 통째로 빠진다. 다만 숨은 패널엔 `hidden` 속성이 붙고 Tailwind
    preflight의 `[hidden] { display: none !important }`가 이를 잠근다 — 유틸리티
    클래스로는 못 푼다. 그래서 루트에 `data-print-all-panels`를 달고 `index.css`의
    `@media print`가 그 안의 패널만 되살린다(다른 화면 탭에는 영향 없다).
*/

/*
  **다섯 섹션은 나열이 아니라 순서다** — 넓은 단위에서 좁은 단위로 좁혀 간다.

      요약(전체) → 회차별(시간) → 개념별(내용) → 반·집단(집단) → 우수 교육생(개인)

  원래는 개념별이 회차별보다 앞이었다. 개념별이 "본체"라 먼저 둔 건데, 읽는 순서로는
  거꾸로였다 — "3차·5차가 어려웠다"(회차별)가 질문을 만들고 "그 회차의 이 개념들
  때문이다"(개념별)가 답이 된다. 답을 먼저 놓으면 질문이 없어서 답이 안 읽힌다.
  두 표는 같은 행렬의 두 축이라(회차별 행은 개념 이름을, 개념별 행은 회차 번호를
  달고 있다) 어느 쪽이든 성립하지만, 시간 축이 사람이 먼저 떠올리는 축이다.

  마지막 둘은 같은 "사람" 축의 양면이다 — 반·집단이 위험 쪽, 우수 교육생이 그 반대쪽.
  그래서 이 문서는 나쁜 소식에서 끝나지 않는다.

  **`question`이 그 순서를 실제로 전달한다.** 순서만 바꾸면 읽는 사람은 순서가 의도된
  것인지 모른다 — 각 섹션이 앞 섹션이 남긴 물음을 받아 적는다.

  개수는 **셀 것이 있는 섹션만** 붙인다(OP-06 `adminTabs.ts`와 같은 규칙). 확정 전에는
  `null`이다 — 확정 전 `topStudents`는 빈 배열이지만 그건 "0명"이 아니라 "아직 안
  정해졌다"라서, `0`을 찍으면 없는 사실을 주장한다. 반·집단 미달은 확정 후에도 개수를
  안 붙인다: 이 탭엔 표가 둘(반별 위험자 10행 + 집단 미달 3건)인데 한쪽만 세면
  거짓말이 되고, 성격이 다른 둘을 더한 13은 아무 뜻이 없다.
*/
/**
 * 섹션별 화면 부가 정보 — 제목·질문·순서는 `sections.ts`가 갖는다(CSV도 같은 걸 읽어야
 * 세 형식이 같은 말을 한다). 여기엔 `Report`가 있어야 계산되는 것만 둔다.
 *
 * 개수는 **셀 것이 있는 섹션만** 붙인다(OP-06 `adminTabs.ts`와 같은 규칙). 확정 전에는
 * `null`이다 — 확정 전 `topStudents`는 빈 배열이지만 그건 "0명"이 아니라 "아직 안
 * 정해졌다"라서, `0`을 찍으면 없는 사실을 주장한다. 반·집단 미달은 확정 후에도 개수를
 * 안 붙인다: 이 탭엔 표가 둘(반별 위험자 10행 + 집단 미달 3건)인데 한쪽만 세면
 * 거짓말이 되고, 성격이 다른 둘을 더한 13은 아무 뜻이 없다.
 */
const SECTION_VIEW: Record<
  ReportSectionKey,
  { meta: (r: Report) => string | undefined; count: (r: Report) => string | null }
> = {
  summary: {
    meta: (r) => `${r.periodStart} – ${r.periodEnd ?? '진행 중'}`,
    count: () => null,
  },
  round: {
    meta: (r) => `미니프로젝트 ${r.totalRounds}개 · 프로젝트당 검증 개념 3건`,
    count: (r) => (r.status === 'CONFIRMED' ? `${r.rounds.length}` : null),
  },
  concept: {
    meta: (r) => `검증 개념 ${r.conceptCount}건 · 교안 ${r.curriculumCount}종`,
    count: (r) => (r.status === 'CONFIRMED' ? `${r.conceptCount}` : null),
  },
  ops: {
    meta: () => undefined,
    count: () => null,
  },
  top: {
    meta: () => '미니프로젝트 중 1회 이상 반 상위 · 우수 횟수 순',
    count: (r) => (r.status === 'CONFIRMED' ? `${r.topStudents.length}` : null),
  },
}

type Section = ReportSectionKey

export default function ReportScreen() {
  const navigate = useNavigate()
  const [section, setSection] = useState<Section>('summary')

  /*
    **기수는 스코프가 정한다**(`stores/cohortScope`) — 이 화면만 상수 UUID를 들고 있었다.
    그러면 다른 화면과 **서로 다른 기수를 보고 있어도** 화면이 아무 경고를 안 낸다.
  */
  const {
    cohortId,
    cohortName: scopeName,
    failed: cohortFailed,
    cohorts,
    selectCohort,
  } = useCohortId()
  const report = useReport(cohortId)
  /* 표지·빵부스러기는 리포트가 준 이름을 먼저 쓴다 — 얼린 시점의 기수 이름이다 */
  const cohortName = report.data?.cohortName ?? scopeName

  /**
   * 인쇄창의 기본 파일명이 "IZ-Get"이 아니라 실제 문서 제목이 되도록 인쇄
   * 직전에만 잠깐 바꾼다 — `window.print()`가 동기라 인쇄 다이얼로그가 닫힌
   * 뒤 원래 제목으로 되돌리면 화면 탭 제목이 계속 바뀐 채로 남지 않는다.
   */
  const handlePrint = (docTitle: string) => {
    const original = document.title
    document.title = docTitle
    window.print()
    document.title = original
  }

  /* 기수를 셸에 넘긴다 — 안 넘기면 헤더가 자리표시자(`7기`)를 그려 본문과 다른 기수를 말한다 */
  return (
    <ConsoleShell
      role="operator"
      cohort={cohortId ?? ''}
      cohorts={cohorts}
      onCohortChange={selectCohort}
    >
      {/*
        cohortName이 로딩 중엔 없다 — 조건 없이 이어 붙이면 데이터가 오기 전 "리포트 ›"
        만 매달린 채로 250ms(목 지연) 동안 보인다. `PageHeader`는 `breadcrumb`이
        `undefined`면 그 줄 자체를 안 그린다(공용 컴포넌트 그대로 활용).
      */}
      {/*
        인쇄에서는 뺀다 — 종이에서는 바로 아래 `ReportHead`가 표지 역할을 하는데,
        둘 다 찍히면 "리포트"라는 단어가 세 줄 연속으로 나온다(breadcrumb·제목·표지).
        화면에선 콘솔 다른 화면들과 같은 자리에 같은 제목이 있어야 하므로 남긴다.
      */}
      <div className="print:hidden">
        <PageHeader breadcrumb={cohortName ? `리포트 › ${cohortName}` : undefined} title="리포트" />
      </div>

      {cohortFailed ? (
        <Empty variant="empty">
          <EmptyHeader>
            <EmptyTitle>기수가 없습니다</EmptyTitle>
            <EmptyDescription>
              운영 관리에서 기수를 먼저 만들면 프로젝트가 끝난 뒤 리포트가 발행됩니다.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : /*
        ⚠ **`isLoading`으로 가르면 안 된다.** 기수가 정해지기 전에는 `enabled: false`라
        조회가 시작조차 안 하고, 그때 `isLoading`은 **`false`** 다 — 어느 분기도 안 타서
        **진입 후 2.25초 동안 제목만 있고 본문이 비었다**(실측). OP-03에서 6초 백지를
        만든 것과 같은 뿌리다(async-states §1-9).

        판정은 **데이터가 있나**로 한다. 그리고 스피너가 아니라 문서 모양으로 자리를
        잡는다 — OP-01~04와 같다.
      */
      !report.data && !report.isError ? (
        <>
          <ReportSkeleton />
          <SlowNotice />
        </>
      ) : report.isError ? (
        /*
          **404가 늘 고장인 것은 아니다.** `COHORT_REPORT_NOT_FOUND`는 아직 진단이 확정되지
          않은 것이라 「없는 것」 3종 중 **유형 1 `아직`** 이고, 다시 시도를 눌러도 리포트가
          생기지 않는다 — `errorCopy`가 그 판정을 갖는다(async-states §3-1·3-2).
        */
        <ErrorState
          error={report.error}
          subject="리포트"
          onRetry={() => void report.refetch()}
          retrying={report.isFetching}
        />
      ) : (
        report.data && (
          <>
            <ReportHead
              title={`리포트 · ${report.data.cohortName}`}
              frozenLabel={
                // "N차"만 쓰면 그 회차 번호가 무슨 근거로 "마지막"인지 문장 안에서
                // 안 보인다 — "전체 N회 완료"로 써서 completedRounds가 곧
                // totalRounds라는 사실(=더 남은 회차가 없다)을 문구가 직접 말하게 한다.
                report.data.status === 'CONFIRMED'
                  ? `${reportDate(report.data.publishedAt)} 미니프로젝트 전체 ${report.data.completedRounds}회 완료 시점으로 고정`
                  : `미니프로젝트 ${report.data.completedRounds} / ${report.data.totalRounds}회 진행 중 · 아직 확정 전`
              }
              exportDisabled={report.data.status !== 'CONFIRMED'}
              onExport={() =>
                handlePrint(
                  `리포트 · ${report.data!.cohortName} · ${reportDate(report.data!.publishedAt)}`,
                )
              }
              onExportCsv={() => exportReportCsv(report.data!)}
            />
            {report.data.status === 'IN_PROGRESS' && (
              <div className="bg-primary-soft text-fg-muted mb-5 flex items-center gap-2.5 rounded-md px-4 py-3 text-sm print:hidden">
                <span className="text-primary font-bold" aria-hidden="true">
                  ⓘ
                </span>
                <span>
                  <b className="text-fg">
                    미니프로젝트 {report.data.completedRounds} / {report.data.totalRounds}회 진행
                    중입니다.
                  </b>{' '}
                  남은 프로젝트가 이 값을 바꿉니다. 확정되기 전에는 내보낼 수 없습니다.
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto shrink-0"
                  onClick={() => navigate('/operator/analysis')}
                >
                  분석에서 보기 ↗
                </Button>
              </div>
            )}
            <Tabs
              data-print-all-panels
              value={section}
              onValueChange={(v) => setSection(v as Section)}
            >
              <TabsList className="mb-5 print:hidden">
                {REPORT_SECTIONS.map((s) => {
                  const count = SECTION_VIEW[s.key].count(report.data!)
                  return (
                    <TabsTrigger key={s.key} value={s.key}>
                      {s.title}
                      {count && (
                        <span className="text-fg-subtle ml-1.5 text-2xs font-normal">{count}</span>
                      )}
                    </TabsTrigger>
                  )
                })}
              </TabsList>

              {/*
                `keepMounted` — 인쇄에 다섯 섹션이 다 들어가야 하므로 안 고른 패널도
                DOM에 남긴다. 마지막을 뺀 넷은 인쇄에서 다음 섹션을 새 쪽에서 시작한다
                (`break-after-page`) — 안 그러면 다섯이 한 쪽에 눌려 찍힌다.

                제목줄은 여기서 그린다(`SectionHeading`) — 순서·질문이 `sections.ts`
                한 곳에서 나와야 화면·인쇄·CSV 세 형식이 같은 말을 한다.
              */}
              {REPORT_SECTIONS.map((s, i) => (
                <TabsContent
                  key={s.key}
                  value={s.key}
                  keepMounted
                  className={i < REPORT_SECTIONS.length - 1 ? 'print:break-after-page' : undefined}
                >
                  <SectionHeading
                    title={s.title}
                    question={s.question}
                    meta={SECTION_VIEW[s.key].meta(report.data!)}
                  />
                  {s.key === 'summary' && <DiagnosisSummary report={report.data!} />}
                  {s.key === 'round' && <RoundBreakdown rounds={report.data!.rounds} />}
                  {s.key === 'concept' && <ConceptDistribution concepts={report.data!.concepts} />}
                  {s.key === 'ops' && (
                    <ClassOps
                      roundLabel={report.data!.classRiskRoundLabel}
                      classRisk={report.data!.classRisk}
                      groupShortfalls={report.data!.groupShortfalls}
                    />
                  )}
                  {s.key === 'top' && (
                    <TopStudents
                      students={report.data!.topStudents}
                      totalRounds={report.data!.totalRounds}
                    />
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </>
        )
      )}
    </ConsoleShell>
  )
}
