import { useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import {
  ArrowLeft,
  ChevronRightIcon,
  PlayIcon,
  RefreshCwIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from 'lucide-react'
import ConsoleShell from '@/shells/ConsoleShell'
import { Alert, AlertTitle, AlertDescription, AlertAction } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { cn } from '@/lib/utils/cn'
import { useGetCurrentMember } from '@/api/member/useMemberQueries'
import {
  useFindCurriculum,
  useFindSections,
  useFindUsedProjects,
} from '@/api/curriculum/useCurriculumQueries'
import type {
  findCurriculum_Response,
  findSections_Response,
  findUsedProjects_Response,
} from '@/api/curriculum/curriculumTypes'
import { useCohortId } from '@/stores/cohortScope'
import { COHORT_STATUS_LABEL } from '../admin/_/labels'
import { Skeleton } from '@/components/ui/Skeleton'
import TableSkeleton from '@/components/common/TableSkeleton'
import CurriculumDetailSkeleton, { SectionListSkeleton } from './CurriculumDetailSkeleton'
import ErrorState from '@/components/common/ErrorState'
import { CurriculumStatusBadge } from '../admin/_/components/StatusBadges'
import ReanalyzeDialog from './components/ReanalyzeDialog'
import DeleteCurriculumDialog from './components/DeleteCurriculumDialog'

/*
  교안 상세 — 탭 2.

    섹션            좌 섹션 목록 → 우 그 섹션이 가르친 항목  (마스터-디테일)
    연결된 프로젝트   이 교안을 쓰는 회차 · **안전장치**

  **파이프라인 산출 중 남기는 것은 둘뿐이다**(OP-06 §3).
    섹션 이름 + **페이지 범위**   리포트·면담이 가리키는 교안 위치가 이 값이다
    항목 이름 + **정의 한 줄**   프로젝트에서 3건을 고를 때 무엇을 묻게 될지 판단하는 근거
  노드·관계 수, 청크 수, extractor 이름은 버린다 — 운영자가 그 숫자로 할 일이 없다.

  **섹션 목록은 앵커 스크롤이 아니라 섹션 전환이다**(H2). 스크롤이 튀면 지금 어디인지가
  사라진다.

  ## 조회가 셋이다
  | | |
  |---|---|
  | 머리글(파일명·버전·분석 상태·쪽수) | 기관 교안 목록에서 이 교안 한 건 |
  | 섹션·가르친 항목 | `GET /curricula/{materialId}/sections` |
  | 연결된 프로젝트 | `GET /curricula/{materialId}/projects` |

  ⚠ **단건 상세 API가 목록과 같은 스키마다**(`CurriculumCatalogItem`) — 그래서 주소로
  바로 들어와도 머리글이 채워진다. 9차 R8로 청한 것이 이것이다.

  ## 연결된 프로젝트가 객체 배열이 됐다 (11차 R3)
  한때 `string[]`이라 표를 못 세우고 칩으로 늘어놓았다. 지금은 `attendedCount`까지 와서
  **재분석 경고를 응시가 시작된 회차로 좁힌다** — 그 전에는 연결된 회차가 하나라도 있으면
  경고했고, 경고가 늘 뜨면 아무도 안 읽는다.
*/
export default function CurriculumDetailScreen() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  /* 목록으로 돌아갈 때 **`?cohort=`를 그대로 들고 간다** — 안 그러면 8기를 보다 들어왔다
     나가는 순간 목록이 기본값(진행 중 기수)으로 되돌아간다(`CurriculaTab.detailPath`) */
  const { search: urlQuery } = useLocation()
  const listPath = `/operator/curricula${urlQuery}`
  const [reanalyzeOpen, setReanalyzeOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { data: me } = useGetCurrentMember()
  /*
    **여기서는 스코프가 실제 일을 한다** — 연결된 프로젝트를 「지금 기수 먼저 · 나머지는
    접어서」 가르는 기준이다(LinkedTab). 목록 화면과 같은 `?cohort=`를 읽으므로 목록에서
    고른 기수가 그대로 따라 들어온다.
  */
  const scope = useCohortId()
  const curriculum = useFindCurriculum({ path: { materialId: id } }, { enabled: !!id })
  const sections = useFindSections({ path: { materialId: id } }, { enabled: !!id })
  const usedProjects = useFindUsedProjects({ path: { materialId: id } }, { enabled: !!id })

  /*
    셸 설정을 한 번만 쓴다 — 아래 세 갈래(스켈레톤·오류·본문)가 모두 같은 머리를 그려야
    한다. 갈래마다 적었더니 **스켈레톤에만 스위처가 빠져** 도착하는 순간 줄이 튀었다.
  */
  const shell = {
    role: 'operator' as const,
    /* 목록이 오기 전에는 비운다 — 자리값(`7기`)을 그리면 실제 기수인 척한다 */
    cohort: scope.cohortId ?? '',
    cohorts: scope.cohortList.map((c) => ({
      value: c.cohortId,
      label: c.name,
      detail: COHORT_STATUS_LABEL[c.status],
    })),
    onCohortChange: scope.selectCohort,
  }

  /*
    ⚠ **판정은 데이터 유무로 한다.** `isLoading`은 `enabled: false`인 동안 `false`라
    (§1-9) 그 분기가 안 그려지는 사고가 이 저장소에서 여러 번 났다. `id`가 없으면
    조회가 꺼져 있고, 그때도 보여줄 것은 스켈레톤이다.
  */
  if (!curriculum.data && !curriculum.isError)
    return (
      <ConsoleShell {...shell}>
        <CurriculumDetailSkeleton />
      </ConsoleShell>
    )

  /*
    D41 — `curriculum.data`가 아예 없을 때(최초 진입 실패)만 전면 에러로 막는다.
    배경 재조회만 실패했으면 아래 정상 렌더에서 배너로만 알린다(D46 패턴,
    decision-log D47).
  */
  if (!curriculum.data)
    return (
      <ConsoleShell {...shell}>
        <ErrorState
          error={curriculum.error}
          subject="교안"
          onRetry={() => void curriculum.refetch()}
          retrying={curriculum.isFetching}
        />
        <Button variant="ghost" className="mt-3" onClick={() => navigate(listPath)}>
          교안 목록으로
        </Button>
      </ConsoleShell>
    )

  const data = curriculum.data
  /*
    ⚠ **`?? []`를 쓰지 않는다 — 「모른다」와 「없다」는 다른 말이다.**

    한때 `usedProjects.data ?? []`였다. 조회가 도착하기 전과 실패했을 때 빈 배열이 되어,
    화면이 **모르는 것을 「없다」고 단언했다.** 26개 프로젝트가 쓰는 교안에서 실측한 것:

    | | 로딩 중·실패 때 화면이 한 말 | 사실 |
    |---|---|---|
    | 탭 | `연결된 프로젝트 0` | 26 |
    | 패널 | 「쓰는 프로젝트가 아직 없습니다」 | 26개가 쓴다 |
    | **삭제 버튼** | **떠 있었다**(`used.length === 0`) | 서버가 409로 막는다 |
    | **다시 분석** | **「영향이 없습니다」** | **3521명이 이미 응시했다** |

    마지막 둘이 위험하다 — 되돌릴 수 없는 행동을 **안전하다고 말하면서** 권한다.
    조회가 4초 안에 안 오면 그 사이에 연 다이얼로그가 그렇게 말했다(실측).

    그래서 `undefined`를 그대로 들고 다닌다. 쓰는 쪽이 **셋을 갈라야만** 컴파일된다.
  */
  const used = usedProjects.data
  /*
    **응시가 시작된 회차만 경고 대상이다**(11차 R3). `attendedCount`는 완료가 아니라
    **시작** 기준이라, 진행 중인 응시가 있는 회차도 잡힌다 — 이미 문항을 받은 학생이
    있는데 쪽 번호가 바뀌면 그 리포트가 어긋난다.

    `used`가 `undefined`면 이것도 `undefined`다 — 모른다는 사실이 그대로 전달된다.
  */
  const inUse = used?.filter((p) => p.attendedCount > 0)
  /*
    **분석을 한 번도 안 한 교안은 `analysisStatus`가 `null`이다** — 실패와 다르다.
    그 상태에서는 섹션이 없고 `다시 분석`이 아니라 `분석 시작`이 할 일이다.
  */
  const analyzed = data.analysisStatus !== null
  const failed = data.analysisStatus === 'FAILED'

  return (
    <ConsoleShell {...shell} user={{ name: me?.name ?? '', role: '오퍼레이터' }}>
      {curriculum.isError && (
        <Alert variant="warning" className="mb-4">
          <AlertTitle>교안 정보를 새로고침하지 못했습니다</AlertTitle>
          <AlertDescription>마지막으로 불러온 정보를 보여드리고 있어요.</AlertDescription>
          <AlertAction>
            <Button variant="ghost" size="sm" onClick={() => void curriculum.refetch()}>
              다시 시도
            </Button>
          </AlertAction>
        </Alert>
      )}
      <div className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {/*
              뒤로가기 버튼은 매니저 화면들과 같은 아이콘 전용 스타일로 통일한다 —
              텍스트 링크("‹ 교안 목록")와 아이콘 버튼이 화면마다 섞여 있던 것을 정리했다.
              목록으로 돌아갈 때 **`?cohort=`를 그대로 들고 간다**(`listPath` 주석 참고).
            */}
            <Button
              variant="ghost"
              size="sm"
              aria-label="교안 목록으로 돌아가기"
              nativeButton={false}
              render={<Link to={listPath} />}
              className="-ml-1.5 p-1.5"
            >
              <ArrowLeft className="size-5" />
            </Button>
            <h1 className="flex items-center gap-2 text-xl font-bold tracking-[-0.01em]">
              {data.title ?? data.originalFileName}
              <span className="text-fg-subtle text-sm font-normal">v{data.versionNo}</span>
              {analyzed ? (
                <CurriculumStatusBadge status={data.analysisStatus!} />
              ) : (
                <Badge variant="neutral">분석 전</Badge>
              )}
            </h1>
          </div>
          {/*
            **액션은 오른쪽 끝에 모은다.** 한때 이 셋이 `justify-between`의 형제라
            버튼이 늘어나자 **다시 분석이 화면 한가운데로 밀렸다** — 제목과 액션 사이가
            아니라 액션 사이에 여백이 생긴 것이다. 한 묶음으로 감싸면 제목은 왼쪽,
            액션은 오른쪽으로 붙는다.

            **삭제가 가장 오른쪽이다.** 되돌릴 수 없는 것이 바깥이고, 없을 때는 다시
            분석이 그 자리를 차지한다.
          */}
          <div className="flex items-center gap-2">
            {/*
              분석 실패한 교안에는 아래 `FailedState`가 같은 버튼을 다시 그린다 —
              그 화면에서는 그것이 **유일한 다음 행동**이라 본문 안에 있어야 한다.
            */}
            {!failed && (
              <Button variant="ghost" onClick={() => setReanalyzeOpen(true)}>
                {analyzed ? <RefreshCwIcon /> : <PlayIcon />}
                {analyzed ? '다시 분석' : '분석 시작'}
              </Button>
            )}
            {/*
              **쓰는 프로젝트가 없을 때만 그린다.** 하나라도 있으면 서버가 막으므로
              (`409 CURRICULUM_MATERIAL_IN_USE`) 누를 수 있게 두면 **못 하는 일을 시키는
              것**이다 — 그 사실은 옆 탭이 이미 말한다(`연결된 프로젝트 n`).

              ⚠ **`inUse`가 아니라 `used`로 판정한다.** `inUse`는 *응시가 시작된* 것만
              걸러 낸 값이라(재분석 경고용) 연결만 되고 아직 응시 전인 프로젝트가 빠진다 —
              그걸로 판정하면 **버튼이 보이는데 서버가 거절**한다. 스펙도 판정 기준을
              `usedProjectCount`라고 적어 뒀다.

              ⚠ **`used?.length === 0`이다 — 모르는 동안에는 안 그린다.** `?? []`였을 때
              조회가 도착하기 전과 실패했을 때 `[]`가 되어 **26개가 쓰는 교안에도 삭제
              버튼이 떴다**(실측). 되돌릴 수 없는 행동은 **아는 상태에서만** 권한다 —
              모를 때 감추는 쪽이 안전한 기본값이고, 도착하면 그때 나타난다.
            */}
            {used?.length === 0 && (
              <Button variant="danger" onClick={() => setDeleteOpen(true)}>
                <Trash2Icon />
                삭제
              </Button>
            )}
          </div>
        </div>
      </div>

      {failed ? (
        <FailedState data={data} onReanalyze={() => setReanalyzeOpen(true)} />
      ) : (
        /*
          ⚠ **탭 이름 옆 숫자를 걷어냈다** — 운영 관리 탭 줄에서 배지를 없앤 것과 같은
          이유다(`AdminScreen` 주석).

          `연결된 프로젝트`의 수는 **조회가 도착해야 아는 값**인데, 탭 줄은 진입 즉시
          그려진다. `?? []`로 메우니 **26개가 쓰는 교안이 `연결된 프로젝트 0`으로** 떴다
          (실측). `undefined`로 바꿔도 이번엔 숫자가 늦게 나타나 **탭 줄 폭이 튄다.**

          없애도 잃는 것이 없다 — 두 수는 **탭을 열면 머리가 크게 말한다**(`7개 섹션 ·
          120쪽` · 기수별 섹션 머리). 탭 줄은 *"어디로 갈 수 있나"* 만 답하면 된다.
        */
        <Tabs defaultValue="sections">
          <TabsList className="mb-4">
            <TabsTrigger value="sections">섹션</TabsTrigger>
            <TabsTrigger value="linked">연결된 프로젝트</TabsTrigger>
          </TabsList>

          <TabsContent value="sections">
            {!sections.data && !sections.isError ? (
              <SectionListSkeleton />
            ) : sections.isError && !sections.data ? (
              /*
                D41 — `sections.data`가 아예 없을 때만 막는다. 배경 재조회만 실패했으면
                아래 정상 렌더에서 배너로만 알린다(D46 패턴, decision-log D47).
              */
              <ErrorState
                error={sections.error}
                subject="섹션"
                onRetry={() => void sections.refetch()}
                retrying={sections.isFetching}
              />
            ) : (
              <>
                {sections.isError && (
                  <Alert variant="warning" className="mb-3">
                    <AlertTitle>섹션을 새로고침하지 못했습니다</AlertTitle>
                    <AlertDescription>마지막으로 불러온 섹션을 보여드리고 있어요.</AlertDescription>
                    <AlertAction>
                      <Button variant="ghost" size="sm" onClick={() => void sections.refetch()}>
                        다시 시도
                      </Button>
                    </AlertAction>
                  </Alert>
                )}
                <SectionsTab
                  sections={sections.data ?? []}
                  title={data.title ?? data.originalFileName}
                  versionNo={data.versionNo}
                  pageCount={data.pageCount}
                />
              </>
            )}
          </TabsContent>

          <TabsContent value="linked">
            {/*
              **셋을 가른다 — 옆 탭과 같은 모양이다.** 여기만 상태 없이 `?? []`로 그리고
              있어서 로딩·실패가 전부 「아직 없습니다」로 나왔다(async-states §1-2).

              판정을 `isLoading`이 아니라 **데이터 유무**로 한다 — `enabled: false`인 동안
              `isLoading`은 `false`라(§1-9) 그 분기가 안 그려지는 사고가 이 저장소에서
              여러 번 났다.
            */}
            {!used && !usedProjects.isError ? (
              <LinkedTabSkeleton />
            ) : !used ? (
              /*
                D41 — `used`가 아예 없을 때만 막는다. 배경 재조회만 실패했으면 아래
                정상 렌더에서 배너로만 알린다(D46 패턴, decision-log D47).
              */
              <ErrorState
                error={usedProjects.error}
                subject="연결된 프로젝트"
                onRetry={() => void usedProjects.refetch()}
                retrying={usedProjects.isFetching}
              />
            ) : (
              <>
                {usedProjects.isError && (
                  <Alert variant="warning" className="mb-3">
                    <AlertTitle>연결된 프로젝트를 새로고침하지 못했습니다</AlertTitle>
                    <AlertDescription>마지막으로 불러온 목록을 보여드리고 있어요.</AlertDescription>
                    <AlertAction>
                      <Button variant="ghost" size="sm" onClick={() => void usedProjects.refetch()}>
                        다시 시도
                      </Button>
                    </AlertAction>
                  </Alert>
                )}
                <LinkedTab
                  projects={used}
                  cohortId={scope.cohortId}
                  cohortName={scope.current?.name}
                />
              </>
            )}
          </TabsContent>
        </Tabs>
      )}

      <DeleteCurriculumDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        materialId={id}
        title={data.title ?? data.originalFileName}
        /* 지운 것을 계속 보고 있을 수 없다 — 목록으로 돌아간다 */
        onDeleted={() => navigate(listPath)}
      />

      <ReanalyzeDialog
        open={reanalyzeOpen}
        onOpenChange={setReanalyzeOpen}
        materialId={id}
        inUse={inUse}
        analysisStatus={data.analysisStatus}
      />
    </ConsoleShell>
  )
}

/**
 * `2026-07-02T00:00:00Z` → `2026-07-02`.
 *
 * **공용 `lib/format.ts`를 쓰지 않는다** — 거기 `formatDateTime`은 `07-14 18:00`(연도 없음)
 * 이라 교육생 화면의 마감 표기다. 등록 시각은 몇 달 전일 수 있어 연도가 필요하다.
 * SA-02 `labels.ts`에 같은 것이 있지만 **feature 간 교차 import는 금지**라 여기서 만든다 —
 * 세 번째 도메인이 필요로 하면 그때 `lib/`으로 올린다.
 */
/**
 * 등록일 표시. ⚠ **`required`라고 해서 값이 온다고 믿지 않는다** — 같은 형태의
 * `joinedAt`이 실제로 `null`로 와서 화면을 죽였다(22차 Q2). 모르면 `—`다.
 */
const uploadedOn = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : '—')

/** 섹션 한 건 — 응답이 배열이라 생성기가 항목 타입을 따로 만들지 않는다 */
type Section = findSections_Response[number]

/** `p.53` 또는 `p.53–55` — 한 쪽짜리에 범위를 쓰지 않는다 */
const pages = (start: number, end: number) => (start === end ? `p.${start}` : `p.${start}–${end}`)

/**
 * 섹션 탭 — 마스터-디테일. **좌 목차 → 우 한 섹션**이고 앵커 스크롤이 아니다(H2).
 *
 * 세로로 섹션 12개 × 항목 수십 개를 쌓으면 스크롤로 찾게 된다(H1 — 세로 스택 5~6블록 금지).
 */
function SectionsTab({
  sections,
  title,
  versionNo,
  pageCount,
}: {
  sections: Section[]
  title: string
  versionNo: number
  pageCount: number | null
}) {
  const [openId, setOpenId] = useState(sections[0]?.sectionId ?? '')
  const current = sections.find((s) => s.sectionId === openId) ?? sections[0]

  if (!current)
    return (
      <div className="border-border-strong bg-surface-2 text-fg-muted rounded-md border border-dashed p-8 text-center text-sm">
        분석이 끝나면 섹션이 나옵니다
      </div>
    )

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      {/* 좌 — 목차. 첫 열 고정폭, 오른쪽이 남는 폭을 갖는다(내용이 서술이라 넓을수록 좋다) */}
      <nav aria-label="섹션 목록">
        <p className="text-fg-subtle mb-2 text-xs">
          {sections.length}개 섹션 · {pageCount ? `${pageCount}쪽` : '쪽수 확인 중'}
        </p>
        <div className="space-y-1">
          {sections.map((s) => (
            <button
              key={s.sectionId}
              type="button"
              aria-current={s.sectionId === current.sectionId ? 'true' : undefined}
              onClick={() => setOpenId(s.sectionId)}
              className={cn(
                'border-border bg-surface w-full rounded-md border px-3 py-2 text-left',
                s.sectionId === current.sectionId
                  ? 'border-primary bg-primary-soft'
                  : 'hover:bg-surface-2',
              )}
            >
              <b className="block text-sm font-semibold">{s.title}</b>
              <span className="text-fg-subtle text-2xs">
                {pages(s.pageStart, s.pageEnd)} · 항목 {s.items.length}
              </span>
            </button>
          ))}
        </div>
      </nav>

      {/* 우 — 그 섹션이 가르친 것 */}
      <section className="bg-surface border-border rounded-md border p-5">
        <h2 className="text-base font-bold">{current.title}</h2>
        {/* **리포트와 면담이 이 위치를 가리킨다** — 그래서 쪽 번호가 화면에 있어야 한다 */}
        <p className="text-fg-subtle mt-0.5 text-xs">
          {title} v{versionNo} · {pages(current.pageStart, current.pageEnd)} — 리포트와 면담이 이
          위치를 가리킵니다
        </p>

        <p className="text-fg-muted mt-4 mb-2 text-sm font-semibold">
          이 섹션이 가르친 것{' '}
          <span className="text-fg-subtle font-normal">{current.items.length}</span>
          <span className="text-fg-subtle ml-2 text-xs font-normal">
            프로젝트에서 이 중 3개를 골라 문항을 만듭니다
          </span>
        </p>

        <ul className="divide-border divide-y">
          {current.items.map((item) => (
            <li key={item.mappingId} className="py-2.5">
              <div className="flex flex-wrap items-baseline gap-2">
                <b className="text-sm font-semibold">{item.extractedName}</b>
                <span className="text-fg-subtle text-2xs">
                  {pages(item.pageStart, item.pageEnd)}
                </span>
                {/*
                  **이미 쓰인 항목을 표시한다.** 프로젝트가 3건을 고를 때 같은 개념을
                  회차마다 반복하지 않으려면 무엇이 이미 나갔는지 보여야 한다 — 서버가
                  회차 이름까지 준다(`usedRoundLabels`).
                */}
                {item.usedAsVerificationConcept && (
                  <span className="text-primary text-2xs">
                    ✓ 검증 개념으로 사용
                    {/*
                      **기수 이름이 앞에 붙는다**(11차 R5) — `7기 미프 4차` · `8기 미프 4차`.
                      한때 `미프 4차`가 세 번 반복돼 화면에서 접었는데, **원인이 반이 아니라
                      기수였다** — 서로 다른 기수의 같은 회차였고, 접는 순간 그 사실이
                      사라지고 있었다. 서버가 유일하게 준다.
                    */}
                    {item.usedRoundLabels.length > 0 && ` · ${item.usedRoundLabels.join(' · ')}`}
                  </span>
                )}
              </div>
              {/*
                **정의 한 줄을 같이 둔다.** 이름만으로는 무엇을 묻게 될지 판단할 수 없는데,
                프로젝트가 고르는 순간 그것이 그 회차 모든 학생의 문항이 된다(14번 6-3).

                **정의가 없는 항목은 그 사실을 쓴다**(`definitionMissing`) — 빈칸으로 두면
                안 불러온 것처럼 보이고, 정의 없는 개념을 고르면 문항 품질이 갈린다.
              */}
              {item.description ? (
                <p className="text-fg-muted mt-0.5 text-xs">{item.description}</p>
              ) : (
                <p className="text-warning mt-0.5 text-xs">
                  교안에 정의문이 없습니다 — 문항 품질이 갈릴 수 있습니다
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

/**
 * 연결된 프로젝트 탭 — **조회가 아니라 안전장치다**(OP-06 §3).
 *
 * 여기서 고치지 않는다 — 회차 이름을 누르면 프로젝트 화면으로 넘어갈 뿐이다.
 * 다시 분석하거나 새 버전을 올리기 전에 **어느 회차가 이 교안을 쓰는지**를 보는 자리다.
 */
function LinkedTab({
  projects,
  cohortId,
  cohortName,
}: {
  projects: findUsedProjects_Response
  cohortId: string | undefined
  cohortName: string | undefined
}) {
  if (projects.length === 0)
    return (
      <div className="border-border-strong bg-surface-2 rounded-md border border-dashed p-8 text-center">
        <p className="text-fg-muted text-sm">이 교안을 쓰는 프로젝트가 아직 없습니다</p>
        {/* **0건이 무엇을 뜻하는지**를 같이 쓴다 — 여기서는 좋은 소식이다 */}
        <p className="text-fg-subtle mt-1 text-xs">
          다시 분석해도 이미 발행된 리포트에 영향이 없습니다.
        </p>
      </div>
    )

  /*
    **지금 기수를 앞으로 꺼내고 나머지는 접는다.**

    한 교안을 여러 기수가 돌려 쓴다 — 실측에서 `Spring 백엔드 설계` 하나가 **4개 기수
    26개 프로젝트**에 걸려 있었다. 그걸 서버 순서대로 쏟으니 첫 열이
    `미니프로젝트 1차 · 2차 … 1차 · 2차 …`로 **같은 이름이 네 번 반복돼 버그처럼 보였다**
    (구분하는 값인 기수는 둘째 열에 있었다).

    운영자가 이 표를 여는 이유는 *"다시 분석하면 누가 깨지나"* 이고, 그 답에서 **지금
    운영 중인 기수가 압도적으로 급하다** — 지난 기수는 이미 리포트가 나갔고 다음 기수는
    아직 응시가 없다. 그래서 지금 기수만 펴 두고 나머지는 `<details>`로 접는다.

    기수를 못 고른 동안(`cohortId`가 아직 없다)은 **가르지 않는다** — 그때 나누면 전부가
    「다른 기수」로 접혀서, 있는 것을 없는 것처럼 보여준다.
  */
  const mine = cohortId ? projects.filter((p) => p.cohortId === cohortId) : projects
  const others = cohortId ? projects.filter((p) => p.cohortId !== cohortId) : []
  const risky = mine.filter((p) => p.attendedCount > 0).length

  /*
    **다른 기수는 한 뭉치가 아니라 기수마다 접는다.**

    처음엔 `다른 기수 18개` 하나로 접었는데, 펼치면 **18행이 한꺼번에 쏟아졌다** — 접기
    전과 같은 문제(같은 이름이 세 번 반복)가 한 단계 미뤄졌을 뿐이었다. 여기서 답할
    질문은 *"어느 **기수**가 영향을 받나"* 라서 **기수가 묶음의 단위**여야 한다.

    닫힌 줄이 이미 답을 준다 — `8기 6개 · 응시 시작 6개`. 표를 펴야 아는 것은 *"그중
    어느 회차인지"* 뿐이고, 그건 정말 파고들 때만 필요하다.

    ▸ **최근 기수부터**(`9기` 앞에 `10기`) — 이름에서 숫자를 뽑아 내림차순. 이름이
      바뀌거나 숫자가 없으면 그것들끼리 이름순으로 뒤에 붙인다.
    ▸ 기수 이름이 `null`로 올 수 있다(스펙) — 묶지 않고 `기수 미상`으로 따로 센다.
  */
  const groups = new Map<string, findUsedProjects_Response>()
  for (const p of others) {
    const key = p.cohortName ?? '기수 미상'
    groups.set(key, [...(groups.get(key) ?? []), p])
  }
  const cohortNo = (name: string) => Number(name.match(/\d+/)?.[0] ?? NaN)
  const otherGroups = [...groups.entries()].sort(([a], [b]) => {
    const [x, y] = [cohortNo(a), cohortNo(b)]
    if (Number.isNaN(x) && Number.isNaN(y)) return a.localeCompare(b, 'ko')
    if (Number.isNaN(x)) return 1
    if (Number.isNaN(y)) return -1
    return y - x
  })

  return (
    <>
      <p className="text-fg-muted mb-4 text-xs">
        다시 분석하거나 새 버전을 올리기 전에{' '}
        <b className="font-semibold">어느 프로젝트가 이 교안을 쓰는지</b> 확인합니다 — 쪽 번호가
        달라지면 이미 발행된 리포트의 교안 위치가 어긋납니다.
      </p>

      <section>
        <h3 className="mb-2 flex items-baseline gap-2 text-sm font-bold">
          {cohortName ?? '연결된 프로젝트'}
          <span className="text-fg-subtle text-xs font-normal">{mine.length}개</span>
          {/* 지금 기수에서 **응시가 시작된 회차**가 곧 재분석 위험이다 — 세어서 앞에 둔다 */}
          {risky > 0 && (
            <span className="text-warning text-xs font-semibold">응시 시작 {risky}개</span>
          )}
        </h3>
        {mine.length > 0 ? (
          <LinkedProjectTable projects={mine} showCohort={!cohortId} />
        ) : (
          <p className="border-border-strong bg-surface-2 text-fg-muted rounded-md border border-dashed p-4 text-center text-xs">
            {cohortName}는 이 교안을 안 씁니다 — 다시 분석해도 이 기수 리포트에는 영향이 없습니다.
          </p>
        )}
      </section>

      {otherGroups.length > 0 && (
        <section className="mt-6">
          <h3 className="text-fg-subtle mb-2 text-xs font-semibold">다른 기수</h3>
          <div className="border-border divide-border divide-y rounded-md border">
            {otherGroups.map(([cohort, rows]) => {
              const started = rows.filter((p) => p.attendedCount > 0).length
              return (
                /*
                  **기수 하나가 `<details>` 하나다** — 열기 전에는 표를 안 그린다.
                  네이티브라 키보드·스크린리더가 그냥 되고(`Enter`로 열림), 여는 상태를
                  화면이 따로 들고 있지 않아도 된다. 저장소가 이미 두 곳에서 쓴다.
                */
                <details key={cohort} className="group/c">
                  <summary className="hover:bg-surface-2 flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-xs">
                    <ChevronRightIcon className="text-fg-subtle size-3.5 shrink-0 transition-transform group-open/c:rotate-90" />
                    <b className="text-fg font-semibold">{cohort}</b>
                    <span className="text-fg-muted">{rows.length}개</span>
                    {/*
                      **닫힌 줄이 이미 답한다.** 재분석 위험은 「응시가 시작됐나」 하나라
                      그 수를 여기 둔다 — 펴 보지 않고도 어느 기수가 급한지 알 수 있다.
                    */}
                    {started > 0 && (
                      <span className="text-warning font-semibold">응시 시작 {started}개</span>
                    )}
                  </summary>
                  {/* 기수 열은 안 그린다 — 이 줄이 이미 그 기수라고 말했다 */}
                  <div className="px-3 pb-3">
                    <LinkedProjectTable projects={rows} showCohort={false} />
                  </div>
                </details>
              )
            })}
          </div>
        </section>
      )}
    </>
  )
}

/**
 * 연결된 프로젝트가 오는 동안 **그 표 모양으로** 자리를 잡는다.
 *
 * 여기만 상태 없이 `?? []`로 그려서 로딩이 「아직 없습니다」로 보였다. 옆(섹션) 탭은
 * 처음부터 스켈레톤이라, 같은 화면 안에서 기다리는 모양이 탭마다 다를 이유가 없다.
 *
 * **높이는 실제 화면에서 잰 값이다** — 안내 문구 16px(top 213.6) · 섹션 머리 18.6px
 * (top 245.6) · 표 헤더 38.5px(top 273.1) · 본문 행 41.6px.
 *
 * **행은 6개다.** 한 기수의 회차 수가 보통 그쯤이고(실측 9기 8 · 나머지 각 6), 지금
 * 기수 섹션만 펴져 있으므로 그 표 하나의 크기와 맞춘다.
 */
function LinkedTabSkeleton() {
  return (
    <div aria-hidden>
      <Skeleton className="h-4 w-[28rem]" />
      <Skeleton className="mt-4 h-[18.6px] w-32" />
      <div className="mt-2">
        <TableSkeleton rows={6} cols={['w-40', null, 'w-28']} rowH={41.6} footerH={0} />
      </div>
    </div>
  )
}

/**
 * 두 섹션이 같은 표를 쓴다 — `showCohort`만 다르다.
 *
 * 지금 기수 섹션에서는 **기수 열이 전부 같은 값이라 지운다.** 머리글이 이미 `9기`라고
 * 말하고 있어서, 그 아래 `9기`가 여덟 번 반복되면 읽을 것이 아니라 소음이다.
 */
function LinkedProjectTable({
  projects,
  showCohort,
}: {
  projects: findUsedProjects_Response
  showCohort: boolean
}) {
  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-40">프로젝트</TableHead>
          {showCohort && <TableHead className="w-24">기수</TableHead>}
          {/* 흡수 열 — 서술이 가장 길다 */}
          <TableHead>이 교안에서 고른 개념</TableHead>
          <TableHead className="w-28 text-right">응시</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.map((p) => (
          <TableRow key={p.projectId}>
            <TableCell>
              {/* 여기서 고치지 않는다 — 프로젝트 화면으로 넘어갈 뿐이다 */}
              <Link
                to={`/operator/projects/${p.projectId}`}
                className="text-fg hover:text-primary font-semibold hover:underline"
              >
                {p.name}
              </Link>
            </TableCell>
            {showCohort && (
              <TableCell className="text-fg-muted text-xs">{p.cohortName ?? '—'}</TableCell>
            )}
            <TableCell className="text-fg-muted truncate text-xs">
              {p.conceptNames.length > 0 ? (
                p.conceptNames.join(' · ')
              ) : (
                /* 아직 안 고른 것과 없는 것은 다르다(F3) */
                <span className="text-warning">개념 미확정</span>
              )}
            </TableCell>
            {/*
                **응시가 시작된 회차가 재분석 위험이다.** 0이면 다시 분석해도 안전하다 —
                그 구분이 이 표의 존재 이유라 숫자를 그대로 보여준다.
              */}
            <TableCell className="text-right tabular-nums">
              {p.attendedCount > 0 ? (
                <b className="text-warning font-semibold">{p.attendedCount}명</b>
              ) : (
                <span className="text-fg-subtle">—</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/**
 * 분석 실패 — 이 교안은 **프로젝트에 연결할 수 없다**(OP-03 `교안에 항목 0`).
 *
 * ⚠ **실패 사유가 응답에 없다.** 목은 `failureReason`을 들고 있었는데 `analysisStatus`
 * 하나만 온다 — 무엇을 고쳐야 하는지를 못 쓴다. 흔한 원인을 대신 적어 둔다(10차 요청).
 */
function FailedState({
  data,
  onReanalyze,
}: {
  data: findCurriculum_Response
  onReanalyze: () => void
}) {
  return (
    <>
      <Alert variant="danger" className="mb-4">
        <TriangleAlertIcon />
        <AlertTitle>교안을 분석하지 못했습니다</AlertTitle>
        <AlertDescription>
          암호가 걸렸거나 본문이 이미지로만 된 PDF는 글자를 읽을 수 없습니다. 파일을 확인한 뒤 다시
          분석하세요.
        </AlertDescription>
      </Alert>

      <dl className="bg-surface border-border divide-border grid divide-y rounded-md border text-sm">
        <Row label="파일">
          {data.originalFileName}
          {data.pageCount !== null && ` · ${data.pageCount}쪽`}
        </Row>
        <Row label="등록">
          {uploadedOn(data.uploadedAt)}
          {data.uploadedByName && ` · ${data.uploadedByName}`}
        </Row>
        <Row label="가르친 항목">
          <span className="text-fg-muted">
            — 분석이 끝나야 나옵니다. 이 교안은 아직 프로젝트에 연결할 수 없습니다.
          </span>
        </Row>
      </dl>

      <div className="mt-4">
        <Button onClick={onReanalyze}>
          <RefreshCwIcon />
          다시 분석
        </Button>
      </div>
    </>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 px-4 py-3">
      <dt className="text-fg-subtle text-xs">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  )
}
