import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import ConsoleShell from '@/shells/ConsoleShell'
import PageHeader from '@/components/common/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { SlowNotice } from '@/components/common/Loading'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import { errorCopy } from '@/lib/errorCopy'
import { formatDate } from '@/lib/format'
import { useManagerCohort } from '@/stores/cohortScope'
import { useCurriculumHead, useSections, useUsedProjects, isAnalysisIncomplete } from './_/api/api'
import { analysisLabel, versionLabel, type Section, type UsedProject } from './_/api/types'

/*
  MG-09 교안 상세 — 섹션(좌 목록 → 우 가르친 항목) · 쓰인 프로젝트 2개 서브탭.
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

/*
  스켈레톤 셋.

  ⚠ **높이가 실측이 아니다.** 브라우저 도구가 끊긴 채로 이번 라운드를 돌아서, MG-08의
  같은 구조(마스터-디테일 `basis-64` · 항목 36px · 틀 578)에서 가져온 **차용값**이다.
  도구가 복구되면 이 화면에서 직접 재서 바꾼다 — `TableSkeleton` 주석의 「눈대중으로
  맞추면 도착할 때 그만큼 튄다」를 아직 확인하지 못했다.
*/
function HeadSkeleton() {
  return (
    <div aria-hidden>
      <div className="mb-4 flex h-[34px] items-center gap-2.5">
        <Skeleton className="size-8 rounded-md" />
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-4 w-10" />
        <Skeleton className="h-[22px] w-16 rounded-full" />
      </div>
      <div className="mb-4 flex h-[36.6px] items-center gap-4">
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-3 w-20" />
      </div>
      <SectionSkeleton rows={5} />
    </div>
  )
}

/**
 * 좌 목록 + 우 디테일 — **섹션 수는 머리가 이미 알려 준다**(`sectionCount`).
 *
 * 실측(7섹션 교안) — 배지 줄 19.7 · 좌 항목 53.7 · 틀 393.9(= 7×53.7 + `py-2` 16).
 *
 * ⚠ **틀에 높이를 박지 않는다.** 처음에 `h-[36rem]`로 고정했더니 실제 틀이 `max-h`라
 * 내용에 맞춰 줄어드는 바람에 **182px 큰 스켈레톤**이 됐고, 도착 순간 본문이 그만큼
 * 위로 당겨졌다(747 → 562 실측). 좌 항목 수가 높이를 정하게 두면 저절로 맞는다.
 */
function SectionSkeleton({ rows }: { rows: number }) {
  return (
    <div aria-hidden className="flex flex-col gap-3">
      <div className="flex h-[19.7px] items-center gap-2">
        <Skeleton className="h-[19.7px] w-28 rounded-full" />
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="border-border bg-surface flex max-h-[36rem] overflow-hidden rounded-md border">
        <div className="border-border bg-surface-2 flex-none basis-64 border-r py-2">
          {Array.from({ length: Math.max(1, Math.min(rows, 12)) }, (_, i) => (
            <div key={i} className="flex h-[53.7px] flex-col justify-center gap-1 px-4">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-2.5 w-20" />
            </div>
          ))}
        </div>
        <div className="min-w-0 flex-1 p-5">
          <Skeleton className="mb-2 h-3.5 w-40" />
          <Skeleton className="h-3 w-64" />
        </div>
      </div>
    </div>
  )
}

function UsedSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-2">
      <Skeleton className="h-3 w-96" />
      <div className="border-border overflow-hidden rounded-md border">
        <div className="border-border bg-surface-2 flex h-[38.5px] items-center gap-4 border-b px-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="border-border flex h-[49px] items-center gap-4 border-b px-4">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-[22px] flex-1 rounded-full" />
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </div>
    </div>
  )
}

const TABS = ['sections', 'used'] as const

export default function CurriculumDetailScreen() {
  const { id = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const { cohortId, cohortName, cohorts, selectCohort } = useManagerCohort()

  const head = useCurriculumHead(id)
  const sections = useSections(id)
  const used = useUsedProjects(id)

  const shell = (children: React.ReactNode) => (
    <ConsoleShell
      role="manager"
      cohort={cohortId ?? ''}
      cohorts={cohorts}
      onCohortChange={selectCohort}
    >
      {children}
    </ConsoleShell>
  )

  if (!head.data && !head.isError) {
    /*
      🔴 **없는 `materialId`는 404가 아니라 매달린다**(하드닝 실측 · 32차 R12).
      형식이 틀리면 400을 1.1초에 주는데, 형식은 맞고 없는 UUID면 답이 없다 —
      **2차에 다시 재도 30초에서 끊어야 했다**(`head`·`sections` 둘 다). 예산이 90초라
      그동안 화면은 자리만 잡고 있다. `SlowNotice`가 12초에 그 사실을 말한다(끊지는
      않는다 — 잠든 서버는 깨는 데 76초).

      ⚠ `isPending`이 아니라 **값 유무**로 가른다(규칙 E).
    */
    return shell(
      <>
        <HeadSkeleton />
        <SlowNotice />
      </>,
    )
  }

  if (head.isError || !head.data) {
    return shell(
      <div className="mx-auto max-w-3xl">
        <BackRow title="교안 상세" cohortId={cohortId} />
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
        {/*
          (이슈 277 QA) **기수를 실어 간다.** 교안은 기수 소유가 아니라 기관 전체
          자산이라 「이 교안의 기수」가 없다 — 대신 지금 스위처가 가리키는 기수를
          그대로 들고 간다. 안 그러면 다른 기수를 보다 들어온 교안에서 여기를 누를 때
          목록이 기본값(첫 담당 기수)으로 되돌아간다.
        */}
        <Button
          variant="ghost"
          size="sm"
          aria-label="교안 목록으로 돌아가기"
          nativeButton={false}
          render={<Link to={`/manager/curriculum?cohort=${cohortId ?? ''}`} />}
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

      {/*
        **탭은 주소가 갖는다**(규칙 J) — 새로고침·뒤로가기가 따라오고, 다른 화면이
        「이 교안의 쓰인 프로젝트」로 보낼 수 있다. 모르는 값이면 첫 탭으로 떨어진다.
      */}
      <Tabs
        value={
          TABS.includes(params.get('tab') as (typeof TABS)[number])
            ? params.get('tab')!
            : 'sections'
        }
        onValueChange={(v) =>
          setParams(
            (prev) => {
              const next = new URLSearchParams(prev)
              next.set('tab', String(v))
              return next
            },
            { replace: true },
          )
        }
      >
        {/*
          탭 이름 옆 숫자를 **여기서는 남긴다.** 규칙 E가 금지하는 이유는 「조회가
          도착해야 아는 값인데 탭 줄은 진입 즉시 그려져 폭이 튄다」인데, 이 둘은
          **탭 줄을 그리는 것과 같은 응답**(`head`)에서 온다 — 탭 줄이 나타나는 순간
          이미 확정된 값이라 튈 구간이 없다. MG-08은 배지가 **다른 세 조회**에서 와서
          8·34·38px씩 튀었고, 그래서 거기서는 뺐다.
        */}
        <TabsList className="mb-4">
          <TabsTrigger value="sections">섹션 {c.sectionCount}</TabsTrigger>
          <TabsTrigger value="used">쓰인 프로젝트 {c.usedProjectCount}</TabsTrigger>
        </TabsList>

        <TabsContent value="sections">
          {!sections.data && !sections.isError ? (
            <>
              <SectionSkeleton rows={c.sectionCount} />
              <SlowNotice />
            </>
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
            /*
              🔴 **교안 탓을 하지 않는다**(하드닝 실측). 500을 가로챘더니 화면이
              「구조를 추출하지 못했습니다 · 재분석은 오퍼레이터가 진행합니다」라고
              말했다 — 서버가 실패한 것을 **교안 분석이 실패한 것으로** 옮겨
              읽히고, 매니저가 오퍼레이터에게 재분석을 요청하게 된다.
              `lib/errorCopy`가 코드·상태를 보고 문구를 정한다.
            */
            (() => {
              const copy = errorCopy(sections.error, { subject: '섹션' })
              return (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>{copy.title}</EmptyTitle>
                    <EmptyDescription>{copy.description}</EmptyDescription>
                  </EmptyHeader>
                  {copy.retry && (
                    <Button variant="ghost" onClick={() => void sections.refetch()}>
                      다시 시도
                    </Button>
                  )}
                </Empty>
              )
            })()
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
          {!used.data && !used.isError ? (
            <UsedSkeleton />
          ) : used.isError || !used.data ? (
            /*
              🔴 **실패를 「아직 없다」로 그리고 있었다.** 분기가 `isPending`과 그
              나머지뿐이라, 조회가 500이면 `used.data`가 `undefined`가 되고
              `?? []`가 빈 배열로 만들어 **「이 교안을 쓰는 프로젝트가 아직 없습니다」**가
              떴다. 26개 프로젝트가 쓰고 있는 교안인데 화면이 하나도 없다고 말한다.

              규칙 I — **「아직」과 「실패」는 다르다.** 재분석 판단의 근거가 이 표라
              「없다」로 읽히면 매니저가 마음 놓고 재분석을 요청하게 된다.
            */
            (() => {
              const copy = errorCopy(used.error, { subject: '쓰인 프로젝트' })
              return (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>{copy.title}</EmptyTitle>
                    <EmptyDescription>{copy.description}</EmptyDescription>
                  </EmptyHeader>
                  {copy.retry && (
                    <Button variant="ghost" onClick={() => void used.refetch()}>
                      다시 시도
                    </Button>
                  )}
                </Empty>
              )
            })()
          ) : (
            <UsedRoundsTable rounds={used.data} />
          )}
        </TabsContent>
      </Tabs>
    </>,
  )
}

function BackRow({ title, cohortId }: { title: string; cohortId: string | undefined }) {
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
          render={<Link to={`/manager/curriculum?cohort=${cohortId ?? ''}`} />}
          className="p-1.5"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <span className="text-fg text-xl font-bold tracking-[-0.01em]">{title}</span>
      </div>
    </>
  )
}

/** `["9기 미프 4차", "7기 미프 5차", …]` → 최신 기수 → 차수 순으로 이어 붙인 한 줄 */
function sortRoundLabels(labels: string[]): string {
  const key = (s: string): [number, number] => [
    Number(/(\d+)\s*기/.exec(s)?.[1] ?? 0),
    Number(/(\d+)\s*차/.exec(s)?.[1] ?? 0),
  ]
  return [...labels]
    .sort((a, b) => {
      const [ac, ar] = key(a)
      const [bc, br] = key(b)
      return bc - ac || ar - br
    })
    .join(' · ')
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
                /* 선택 표시가 왼쪽 2px 선과 글자색뿐이라 눈으로만 보인다(MG-08과 같은 건) */
                aria-current={on}
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
                      ★는 **프로젝트마다** 붙는다 — 서버가 라벨 배열을 준다. 목은 프로젝트
                      하나만 담을 수 있어 한 항목이 두 프로젝트에 쓰이면 하나를 버렸다.
                      프로젝트 안 순번(`개념 3`)은 오지 않아 뺐다(32차).

                      🔴 **배지를 하나로 접었다**(렌더에서 잡았다). 한 항목이 7기~10기
                      **열한 회차**의 검증 개념이라 배지가 두 줄로 깔리며 정작 항목
                      이름을 덮었다 — 이 화면이 답하는 질문은 "가르친 것 중 무엇이
                      문항이 됐나"라 **쓰였다는 사실**이 먼저고 어느 프로젝트인지는 그
                      다음이다. 프로젝트 목록은 마우스를 올리면 나오고, 전체는 옆
                      `쓰인 프로젝트` 탭이 갖고 있다.
                    */}
                    {item.usedAsVerificationConcept && (
                      /*
                        마우스를 올리면 나오는 프로젝트 목록도 **서버 순서가 뒤죽박죽**이다
                        (실측: `9기 미프 4차 · 7기 미프 5차 · 7기 미프 6차 · 8기 미프 5차 …`).
                        열네 개가 그 순서로 한 줄에 이어지면 읽을 수 없어 같은 기준으로
                        세운다 — 아래 `쓰인 프로젝트` 표와 같은 정렬이다.
                      */
                      <Badge variant="warning" title={sortRoundLabels(item.usedRoundLabels)}>
                        ★ 검증 개념
                        {item.usedRoundLabels.length > 0 &&
                          ` · ${item.usedRoundLabels.length}개 프로젝트`}
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
  쓰인 프로젝트 — **다른 기수 프로젝트도 온다.** 이 조회는 교안 축이라 기수로 좁혀지지
  않는다. 서버가 `roundLabel`(기수를 포함한 라벨)과 `cohortName`을 함께 주는 이유가
  그것이라(스펙 명시) 화면이 거르지 않고 라벨 그대로 그린다 — 같은 교안을 다른
  기수가 어떻게 쓰고 있는지가 재분석 판단의 근거다.

  🔴 **`담당 반 진행`·`결과` 열을 뺐다.** 목이 `응시 58/71`·`발행 완료`를 갖고
  있었는데 서버는 `attendedCount`(분자)만 준다 — 분모가 없어 비율을 못 만들고,
  결과 발행 여부는 이 응답에 아예 없다. 32차 요청서로 올린다.
*/
/**
 * 회차 라벨에서 `기수 · 차수`를 뽑는다 — `"9기 미프 4차"` → `[9, 4]`.
 *
 * 못 읽으면 맨 뒤로 보낸다(라벨 형식이 바뀌어도 목록이 깨지지 않는다).
 *
 * ⚠ 기수는 **내림차순**(최신 위)이라 모르는 값은 `Infinity`가 아니라 **`-Infinity`**다 —
 * 처음에 `Infinity`로 뒀다가 라벨을 못 읽은 행이 **맨 위로** 올라왔다(검산에서 잡았다).
 * 차수는 오름차순이라 그쪽만 `Infinity`가 맞다.
 */
function roundOrder(r: UsedProject): [number, number] {
  const label = r.roundLabel ?? r.name ?? ''
  const cohort = /(\d+)\s*기/.exec(r.cohortName ?? label)?.[1]
  const round = /(\d+)\s*차/.exec(label)?.[1]
  return [cohort ? Number(cohort) : -Infinity, round ? Number(round) : Infinity]
}

function UsedRoundsTable({ rounds: raw }: { rounds: UsedProject[] }) {
  /*
    🔴 **정렬은 화면이 한다**(하드닝 2차 실측). 서버가 주는 순서가
    **`10기 → 9기 → 7기 → 8기`**라 어떤 규칙으로도 안 읽힌다(최신순도 오래된 순도
    아니다). 기수 안에서는 1~6차로 정렬돼 있어 **기수 축만 흔들린다.**

    26줄짜리 표에서 기수가 튀면 매니저가 「7기가 왜 여기 있지」로 읽는다. MG-08 팀
    목록에서 한 판단과 같다 — 서버 판정을 뒤집는 게 아니라 **표시 순서**라 경계 문제가
    아니고, 정렬 파라미터도 없다.

    **최신 기수를 위로** 둔다 — 재분석 판단은 지금 도는 기수부터 본다.
  */
  const rounds = [...raw].sort((a, b) => {
    const [ac, ar] = roundOrder(a)
    const [bc, br] = roundOrder(b)
    return bc - ac || ar - br
  })

  if (rounds.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>이 교안을 쓰는 프로젝트가 아직 없습니다</EmptyTitle>
          <EmptyDescription>프로젝트에 연결되면 여기에 나타납니다.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {/*
        🔴 **범위가 목록과 다르다고 말한다**(하드닝 실측). 목록 행은 「이 기수가 연결한
        프로젝트」라 8이었는데 이 탭 배지는 26이다 — 같은 교안인데 숫자가 3배로 뛴다.
        둘 다 맞지만(다른 질문이다) 화면이 안 말하면 어느 쪽이 틀린 것처럼 보인다.
      */}
      <p className="text-fg-subtle text-xs">
        이 교안을 쓴 <b className="text-fg-muted font-bold">모든 기수의 프로젝트</b>입니다 — 목록의
        「쓰인 프로젝트」는 이 기수 것만 셉니다.
      </p>
      <div className="border-border overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-2 border-border border-b">
              <th className="text-fg-muted px-4 py-2.5 text-left text-xs font-semibold">
                프로젝트
              </th>
              <th className="text-fg-muted px-4 py-2.5 text-left text-xs font-semibold">
                검증 개념
              </th>
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
    </div>
  )
}
