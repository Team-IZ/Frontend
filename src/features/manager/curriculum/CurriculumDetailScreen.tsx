import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import ConsoleShell from '@/shells/ConsoleShell'
import PageHeader from '@/components/common/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import { CURRICULA, CURRICULUM_DETAILS, type CurriculumSection } from './mockData'

/*
  MG-09 교안 상세 — 섹션(좌 목록 → 우 가르친 항목) · 쓰인 회차 2개 서브탭.
  오퍼레이터 화면(OP-06)과 같은 구조를 쓰되 등록·재분석·주제 편집이 전부 빠졌다
  (정의서 §4·§6) — 그래서 v1 CurriculumDetailScreen(CUR-01+02)과 달리 편집
  상태를 갖지 않는다.

  ★는 그 항목이 검증 개념으로 쓰였다는 표시다 — "한 섹션이 가르친 것 9개 중
  1개만 문항이 됐다"는 사실이 매니저가 히트맵·리포트를 읽는 열쇠라 강조한다(§4).
*/

const COHORT_LABEL = '7기'

export default function CurriculumDetailScreen() {
  const { id = '' } = useParams()

  const curriculum = CURRICULA.find((c) => c.id === id)
  const detail = CURRICULUM_DETAILS[id]

  if (!curriculum || !detail) {
    return (
      <ConsoleShell role="manager">
        <div className="mx-auto max-w-3xl">
          <BackRow title="교안 상세" />
          <Card className="items-center gap-2 p-10 text-center">
            <p className="text-lg font-semibold">교안을 찾을 수 없습니다</p>
            <p className="text-fg-subtle text-sm">삭제되었거나 잘못된 주소일 수 있습니다.</p>
          </Card>
        </div>
      </ConsoleShell>
    )
  }

  return (
    <ConsoleShell role="manager">
      <div className="[&_h1]:sr-only">
        <PageHeader
          breadcrumb={`교안 › ${COHORT_LABEL} › ${curriculum.name} ${curriculum.version}`}
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
        <span className="text-fg text-xl font-bold tracking-[-0.01em]">{curriculum.name}</span>
        <span className="text-fg-muted font-mono text-sm">{curriculum.version}</span>
        {curriculum.analysisStatus === 'DONE' ? (
          <Badge variant="success">분석 완료</Badge>
        ) : (
          <Badge variant="warning">분석 실패</Badge>
        )}
      </div>

      <Tabs defaultValue="sections">
        <TabsList className="mb-4">
          <TabsTrigger value="sections">
            섹션 {curriculum.sectionCount === null ? '―' : curriculum.sectionCount}
          </TabsTrigger>
          <TabsTrigger value="used">쓰인 회차 {detail.usedRounds.length}</TabsTrigger>
        </TabsList>

        <TabsContent value="sections">
          {detail.sections === null ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>구조를 추출하지 못했습니다</EmptyTitle>
                <EmptyDescription>
                  이 교안은 분석에 실패해 섹션·가르친 항목을 보여줄 수 없습니다.
                  <br />
                  <b className="text-fg-muted">재분석은 오퍼레이터(OP-06)가 진행합니다.</b>
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <SectionExplorer
              curriculumLabel={`${curriculum.name} ${curriculum.version}`}
              sections={detail.sections}
              registeredAt={detail.registeredAt}
              pageCount={detail.pageCount}
            />
          )}
        </TabsContent>

        <TabsContent value="used">
          <UsedRoundsTable rounds={detail.usedRounds} />
        </TabsContent>
      </Tabs>
    </ConsoleShell>
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
  registeredAt,
  pageCount,
}: {
  curriculumLabel: string
  sections: CurriculumSection[]
  registeredAt: string
  pageCount: number | null
}) {
  const [activeId, setActiveId] = useState(sections[0]?.id)
  const active = sections.find((s) => s.id === activeId) ?? sections[0]
  const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="neutral">
          {sections.length}개 섹션 · {pageCount ?? '―'}쪽
        </Badge>
        <span className="text-fg-subtle text-xs">
          등록 {registeredAt} ·{' '}
          <b className="text-fg-muted font-bold">재분석·새 버전은 오퍼레이터</b>
        </span>
        <span className="text-fg-subtle ml-auto text-xs">가르친 항목 {totalItems}개</span>
      </div>

      <div className="border-border bg-surface flex overflow-hidden rounded-md border">
        {/* 좌 섹션 리스트 — 클릭하면 우측 디테일만 바뀐다(앵커 스크롤 ❌) */}
        <div className="border-border bg-surface-2 max-h-[36rem] flex-none basis-64 overflow-y-auto border-r py-2">
          {sections.map((s) => {
            const on = s.id === active?.id
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveId(s.id)}
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
                  {s.name}
                </b>
                <span className="text-fg-subtle mt-0.5 block text-[10px] tabular-nums">
                  {s.pageRange} · 항목 {s.items.length}
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
                <h3 className="text-sm font-bold">{active.name}</h3>
                <p className="text-fg-subtle mt-0.5 text-xs">
                  {curriculumLabel} · <b className="text-fg-muted">{active.pageRange}</b> — 리포트와
                  면담이 이 위치를 가리킵니다
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
                  key={item.id}
                  className={
                    item.verifiedAs
                      ? 'bg-warning-soft border-border border-b px-5 py-2.5 last:border-0'
                      : 'border-border border-b px-5 py-2.5 last:border-0'
                  }
                >
                  <div className="flex items-baseline gap-1.5">
                    <b className="text-sm font-bold">{item.name}</b>
                    {item.verifiedAs && (
                      <Badge variant="warning">
                        ★ {item.verifiedAs.round} 개념 {item.verifiedAs.index}
                      </Badge>
                    )}
                    <span className="text-fg-subtle ml-auto text-[11px] tabular-nums">
                      {item.page}
                    </span>
                  </div>
                  {item.definition ? (
                    <p className="text-fg-muted mt-0.5 text-xs leading-relaxed">
                      {item.definition}
                    </p>
                  ) : (
                    <p className="text-fg-subtle mt-0.5 text-xs italic">
                      정의문이 추출되지 않았습니다
                      {item.isSummary && ' — 섹션 요약 항목입니다.'}
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

function UsedRoundsTable({
  rounds,
}: {
  rounds: {
    round: string
    verifiedConcepts: string[] | null
    attendance: string | null
    resultStatus: 'PUBLISHED' | 'PRE_PUBLISH' | 'PLANNED'
  }[]
}) {
  return (
    <div className="border-border overflow-hidden rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-2 border-border border-b">
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-fg-muted">회차</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-fg-muted">검증 개념</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-fg-muted">
              담당 반 진행
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-fg-muted">결과</th>
          </tr>
        </thead>
        <tbody>
          {rounds.map((r) => (
            <tr key={r.round} className="border-border border-b last:border-0">
              <td className="px-4 py-3 font-bold">{r.round}</td>
              <td className="px-4 py-3">
                {r.verifiedConcepts === null ? (
                  <Badge variant="neutral">검증 개념 미확정</Badge>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {r.verifiedConcepts.map((c) => (
                      <Badge key={c} variant="warning">
                        ★ {c}
                      </Badge>
                    ))}
                  </div>
                )}
              </td>
              <td className="text-fg-muted px-4 py-3 text-xs">
                {r.attendance ?? <span className="text-fg-subtle">—</span>}
              </td>
              <td className="px-4 py-3">
                {r.resultStatus === 'PUBLISHED' && <Badge variant="success">발행 완료</Badge>}
                {r.resultStatus === 'PRE_PUBLISH' && <Badge variant="neutral">발행 전</Badge>}
                {r.resultStatus === 'PLANNED' && <Badge variant="neutral">예정</Badge>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
