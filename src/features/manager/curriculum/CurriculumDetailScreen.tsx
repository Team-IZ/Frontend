import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import ConsoleShell from '@/shells/ConsoleShell'
import PageHeader from '@/components/common/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import { formatDate } from '@/lib/format'
import { useManagerCohort } from '@/stores/cohortScope'
import { useCurriculumHead, useSections, useUsedProjects, isAnalysisIncomplete } from './_/api/api'
import { analysisLabel, versionLabel, type Section, type UsedProject } from './_/api/types'

/*
  MG-09 교안 상세 — 섹션(좌 목록 → 우 가르친 항목) · 쓰인 회차 2개 서브탭.
  오퍼레이터 화면(OP-06)과 같은 구조를 쓰되 등록·재분석·주제 편집이 전부 빠졌다
  (정의서 §4·§6) — 그래서 v1 CurriculumDetailScreen과 달리 편집 상태를 갖지 않는다.

  ★는 그 항목이 검증 개념으로 쓰였다는 표시다 — "한 섹션이 가르친 것 9개 중
  1개만 문항이 됐다"는 사실이 매니저가 히트맵·리포트를 읽는 열쇠라 강조한다(§4).

  ⚠ **URL이 `materialId`다.** 상세 조회 셋이 전부 그 축을 받는다 — `versionId`를
  넣으면 늘 빈 배열이 온다(13차 R1에서 실제로 겪은 사고다).

  🔴 **섹션 조회는 분석 전에 409를 낸다**(`CURRICULUM_ANALYSIS_NOT_COMPLETED`,
  18차 R1). 실패가 아니라 아직 안 끝난 것이라 **에러가 아니라 빈 상태로** 그린다.
  목은 이 구분이 없어 `sections === null` 하나로 실패·미분석을 같이 처리했다.
*/

export default function CurriculumDetailScreen() {
  const { id = '' } = useParams()
  const { cohortName, cohorts, selectCohort } = useManagerCohort()

  const head = useCurriculumHead(id)
  const sections = useSections(id)
  const used = useUsedProjects(id)

  const shell = (children: React.ReactNode) => (
    <ConsoleShell
      role="manager"
      cohort={cohortName ?? ''}
      cohorts={cohorts}
      onCohortChange={selectCohort}
    >
      {children}
    </ConsoleShell>
  )

  if (head.isPending) {
    return shell(
      <div className="flex justify-center py-16">
        <Spinner className="size-6" aria-label="교안을 불러오는 중" />
      </div>,
    )
  }

  if (head.isError || !head.data) {
    return shell(
      <div className="mx-auto max-w-3xl">
        <BackRow title="교안 상세" />
        <Card className="items-center gap-2 p-10 text-center">
          <p className="text-lg font-semibold">교안을 찾을 수 없습니다</p>
          <p className="text-fg-subtle text-sm">삭제되었거나 잘못된 주소일 수 있습니다.</p>
        </Card>
      </div>,
    )
  }

  const c = head.data
  const label = `${c.originalFileName} ${versionLabel(c.versionNo)}`
  const analysis = analysisLabel(c.analysisStatus)

  return shell(
    <>
      <div className="[&_h1]:sr-only">
        <PageHeader
          breadcrumb={['교안', cohortName, label].filter(Boolean).join(' › ')}
          title="교안 상세"
        />
      </div>

      <div className="mb-4 flex items-center gap-2.5">
        <Button
          variant="ghost"
          size="sm"
          aria-label="교안 목록으로 돌아가기"
          nativeButton={false}
          render={<Link to="/manager/curriculum" />}
          className="p-1.5"
        >
          <ArrowLeft className="size-5" />
        </Button>
        {/* 제목은 등록 때 입력한 이름이고 없을 수 있다 — 그때는 파일명이 이름이다 */}
        <span className="text-fg text-xl font-bold tracking-[-0.01em]">
          {c.title ?? c.originalFileName}
        </span>
        <span className="text-fg-muted font-mono text-sm">{versionLabel(c.versionNo)}</span>
        <Badge variant={analysis.variant}>{analysis.text}</Badge>
      </div>

      <Tabs defaultValue="sections">
        <TabsList className="mb-4">
          <TabsTrigger value="sections">섹션 {c.sectionCount}</TabsTrigger>
          <TabsTrigger value="used">쓰인 회차 {c.usedProjectCount}</TabsTrigger>
        </TabsList>

        <TabsContent value="sections">
          {sections.isPending ? (
            <div className="flex justify-center py-16">
              <Spinner className="size-6" aria-label="섹션을 불러오는 중" />
            </div>
          ) : isAnalysisIncomplete(sections.error) ? (
            /* 아직 분석이 안 끝난 것 — 실패와 다른 말을 한다 */
            <Empty>
              <EmptyHeader>
                <EmptyTitle>분석이 아직 끝나지 않았습니다</EmptyTitle>
                <EmptyDescription>
                  분석이 끝나면 섹션과 가르친 항목이 여기에 나타납니다.
                  <br />
                  <b className="text-fg-muted">분석·재분석은 오퍼레이터(OP-06)가 진행합니다.</b>
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : sections.isError ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>구조를 추출하지 못했습니다</EmptyTitle>
                <EmptyDescription>
                  이 교안은 섹션·가르친 항목을 보여줄 수 없습니다.
                  <br />
                  <b className="text-fg-muted">재분석은 오퍼레이터(OP-06)가 진행합니다.</b>
                </EmptyDescription>
              </EmptyHeader>
              <Button variant="ghost" onClick={() => void sections.refetch()}>
                다시 시도
              </Button>
            </Empty>
          ) : (
            <SectionExplorer
              curriculumLabel={label}
              sections={sections.data ?? []}
              uploadedAt={c.uploadedAt}
              pageCount={c.pageCount}
            />
          )}
        </TabsContent>

        <TabsContent value="used">
          {used.isPending ? (
            <div className="flex justify-center py-16">
              <Spinner className="size-6" aria-label="쓰인 회차를 불러오는 중" />
            </div>
          ) : (
            <UsedRoundsTable rounds={used.data ?? []} />
          )}
        </TabsContent>
      </Tabs>
    </>,
  )
}

function BackRow({ title }: { title: string }) {
  return (
    <>
      <div className="[&_h1]:sr-only">
        <PageHeader breadcrumb="교안 목록 › 교안 상세" title={title} />
      </div>
      <div className="mt-2 mb-2 flex items-center gap-2.5">
        <Button
          variant="ghost"
          size="sm"
          aria-label="교안 목록으로 돌아가기"
          nativeButton={false}
          render={<Link to="/manager/curriculum" />}
          className="p-1.5"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <span className="text-fg text-xl font-bold tracking-[-0.01em]">{title}</span>
      </div>
    </>
  )
}

function SectionExplorer({
  curriculumLabel,
  sections,
  uploadedAt,
  pageCount,
}: {
  curriculumLabel: string
  sections: Section[]
  uploadedAt: string
  pageCount: number | null
}) {
  const [activeId, setActiveId] = useState(sections[0]?.sectionId)
  const active = sections.find((s) => s.sectionId === activeId) ?? sections[0]
  const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0)

  if (sections.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>섹션이 없습니다</EmptyTitle>
          <EmptyDescription>분석이 구조를 하나도 만들지 못했습니다.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="neutral">
          {sections.length}개 섹션 · {pageCount ?? '―'}쪽
        </Badge>
        <span className="text-fg-subtle text-xs">
          등록 {formatDate(uploadedAt)} ·{' '}
          <b className="text-fg-muted font-bold">재분석·새 버전은 오퍼레이터</b>
        </span>
        <span className="text-fg-subtle ml-auto text-xs">가르친 항목 {totalItems}개</span>
      </div>

      <div className="border-border bg-surface flex overflow-hidden rounded-md border">
        {/* 좌 섹션 리스트 — 클릭하면 우측 디테일만 바뀐다(앵커 스크롤 ❌) */}
        <div className="border-border bg-surface-2 max-h-[36rem] flex-none basis-64 overflow-y-auto border-r py-2">
          {sections.map((s) => {
            const on = s.sectionId === active?.sectionId
            return (
              <button
                key={s.sectionId}
                type="button"
                onClick={() => setActiveId(s.sectionId)}
                className={
                  on
                    ? 'shadow-[inset_2px_0_0_var(--color-primary)] block w-full bg-white px-4 py-2.5 text-left'
                    : 'block w-full px-4 py-2.5 text-left hover:bg-white'
                }
              >
                <b
                  className={
                    on
                      ? 'text-primary block text-xs font-bold'
                      : 'text-fg-muted block text-xs font-bold'
                  }
                >
                  {s.title}
                </b>
                <span className="text-fg-subtle mt-0.5 block text-2xs tabular-nums">
                  p.{s.pageStart}–{s.pageEnd} · 항목 {s.items.length}
                </span>
              </button>
            )
          })}
        </div>

        {/* 우 가르친 항목 — 정의문 포함 */}
        <div className="max-h-[36rem] min-w-0 flex-1 overflow-y-auto">
          {active && (
            <>
              <div className="border-border border-b px-5 py-3">
                <h3 className="text-sm font-bold">{active.title}</h3>
                <p className="text-fg-subtle mt-0.5 text-xs">
                  {curriculumLabel} ·{' '}
                  <b className="text-fg-muted">
                    p.{active.pageStart}–{active.pageEnd}
                  </b>{' '}
                  — 리포트와 면담이 이 위치를 가리킵니다
                </p>
              </div>
              <div className="bg-surface-2 border-border text-fg-muted border-b px-5 py-2 text-xs font-bold">
                이 섹션이 가르친 것 {active.items.length}
                <span className="text-fg-subtle ml-1.5 font-normal">
                  프로젝트에서 이 중 일부를 골라 문항을 만듭니다
                </span>
              </div>
              {active.items.map((item) => (
                <div
                  key={item.mappingId}
                  className={
                    item.usedAsVerificationConcept
                      ? 'bg-warning-soft border-border border-b px-5 py-2.5 last:border-0'
                      : 'border-border border-b px-5 py-2.5 last:border-0'
                  }
                >
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <b className="text-sm font-bold">{item.extractedName}</b>
                    {/*
                      ★는 **회차마다** 붙는다 — 서버가 라벨 배열을 준다. 목은 회차
                      하나만 담을 수 있어 한 항목이 두 회차에 쓰이면 하나를 버렸다.
                      회차 안 순번(`개념 3`)은 오지 않아 뺐다(32차).

                      🔴 **배지를 하나로 접었다**(렌더에서 잡았다). 한 항목이 7기~10기
                      **열한 회차**의 검증 개념이라 배지가 두 줄로 깔리며 정작 항목
                      이름을 덮었다 — 이 화면이 답하는 질문은 "가르친 것 중 무엇이
                      문항이 됐나"라 **쓰였다는 사실**이 먼저고 어느 회차인지는 그
                      다음이다. 회차 목록은 마우스를 올리면 나오고, 전체는 옆
                      `쓰인 회차` 탭이 갖고 있다.
                    */}
                    {item.usedAsVerificationConcept && (
                      <Badge variant="warning" title={item.usedRoundLabels.join(' · ')}>
                        ★ 검증 개념
                        {item.usedRoundLabels.length > 0 &&
                          ` · ${item.usedRoundLabels.length}개 회차`}
                      </Badge>
                    )}
                    <span className="text-fg-subtle ml-auto text-2xs tabular-nums">
                      p.{item.pageStart}
                      {item.pageEnd !== item.pageStart && `–${item.pageEnd}`}
                    </span>
                  </div>
                  {/* 판정은 `definitionMissing`으로 한다 — 빈 문자열을 없음으로 읽지 않는다 */}
                  {item.definitionMissing || !item.description ? (
                    <p className="text-fg-subtle mt-0.5 text-xs italic">
                      정의문이 추출되지 않았습니다
                    </p>
                  ) : (
                    <p className="text-fg-muted mt-0.5 text-xs leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/*
  쓰인 회차 — **다른 기수 회차도 온다.** 이 조회는 교안 축이라 기수로 좁혀지지
  않는다. 서버가 `roundLabel`(기수를 포함한 라벨)과 `cohortName`을 함께 주는 이유가
  그것이라(스펙 명시) 화면이 거르지 않고 라벨 그대로 그린다 — 같은 교안을 다른
  기수가 어떻게 쓰고 있는지가 재분석 판단의 근거다.

  🔴 **`담당 반 진행`·`결과` 열을 뺐다.** 목이 `응시 58/71`·`발행 완료`를 갖고
  있었는데 서버는 `attendedCount`(분자)만 준다 — 분모가 없어 비율을 못 만들고,
  결과 발행 여부는 이 응답에 아예 없다. 32차 요청서로 올린다.
*/
function UsedRoundsTable({ rounds }: { rounds: UsedProject[] }) {
  if (rounds.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>이 교안을 쓰는 회차가 아직 없습니다</EmptyTitle>
          <EmptyDescription>회차에 연결되면 여기에 나타납니다.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="border-border overflow-hidden rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-2 border-border border-b">
            <th className="text-fg-muted px-4 py-2.5 text-left text-xs font-semibold">회차</th>
            <th className="text-fg-muted px-4 py-2.5 text-left text-xs font-semibold">검증 개념</th>
            <th className="text-fg-muted px-4 py-2.5 text-right text-xs font-semibold">
              응시 시작
            </th>
          </tr>
        </thead>
        <tbody>
          {rounds.map((r) => (
            <tr key={r.projectId} className="border-border border-b last:border-0">
              <td className="px-4 py-3 font-bold">
                <Link
                  to={`/manager/projects/${r.projectId}`}
                  className="hover:text-primary hover:underline"
                >
                  {r.roundLabel ?? r.name}
                </Link>
              </td>
              <td className="px-4 py-3">
                {/* 확정 전이면 빈 배열이다(스펙 명시) — null이 아니라 길이로 가른다 */}
                {r.conceptNames.length === 0 ? (
                  <Badge variant="neutral">검증 개념 미확정</Badge>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {r.conceptNames.map((c) => (
                      <Badge key={c} variant="warning">
                        ★ {c}
                      </Badge>
                    ))}
                  </div>
                )}
              </td>
              {/*
                **완료가 아니라 시작한 인원이다**(스펙 명시) — 재분석하면 리포트가
                어긋나는지 판단하는 문턱이라 진행 중인 응시도 세야 한다
              */}
              <td className="text-fg-muted px-4 py-3 text-right text-xs tabular-nums">
                {r.attendedCount === 0 ? (
                  <span className="text-fg-subtle">—</span>
                ) : (
                  `${r.attendedCount}명`
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
