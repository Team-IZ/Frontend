import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ChevronLeftIcon, TriangleAlertIcon } from 'lucide-react'
import ConsoleShell from '@/shells/ConsoleShell'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert'
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
import { Loading, LoadFailed } from '../_/components/AsyncState'
import { CurriculumStatusBadge } from '../_/components/StatusBadges'
import ReanalyzeDialog from './components/ReanalyzeDialog'

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
  const [reanalyzeOpen, setReanalyzeOpen] = useState(false)

  const { data: me } = useGetCurrentMember()
  const curriculum = useFindCurriculum({ path: { materialId: id } }, { enabled: !!id })
  const sections = useFindSections({ path: { materialId: id } }, { enabled: !!id })
  const usedProjects = useFindUsedProjects({ path: { materialId: id } }, { enabled: !!id })

  if (curriculum.isPending)
    return (
      <ConsoleShell role="operator">
        <Loading label="교안을 불러오는 중" />
      </ConsoleShell>
    )

  if (curriculum.isError || !curriculum.data)
    return (
      <ConsoleShell role="operator">
        <LoadFailed label="교안을 찾을 수 없습니다" onRetry={() => void curriculum.refetch()} />
        <Button
          variant="ghost"
          className="mt-3"
          onClick={() => navigate('/operator/admin/curricula')}
        >
          교안 목록으로
        </Button>
      </ConsoleShell>
    )

  const data = curriculum.data
  const used = usedProjects.data ?? []
  /*
    **응시가 시작된 회차만 경고 대상이다**(11차 R3). `attendedCount`는 완료가 아니라
    **시작** 기준이라, 진행 중인 응시가 있는 회차도 잡힌다 — 이미 문항을 받은 학생이
    있는데 쪽 번호가 바뀌면 그 리포트가 어긋난다.
  */
  const inUse = used.filter((p) => p.attendedCount > 0)
  /*
    **분석을 한 번도 안 한 교안은 `analysisStatus`가 `null`이다** — 실패와 다르다.
    그 상태에서는 섹션이 없고 `다시 분석`이 아니라 `분석 시작`이 할 일이다.
  */
  const analyzed = data.analysisStatus !== null
  const failed = data.analysisStatus === 'FAILED'

  return (
    <ConsoleShell role="operator" cohort="" user={{ name: me?.name ?? '', role: '오퍼레이터' }}>
      <div className="mb-4">
        <Link
          to="/operator/admin/curricula"
          className="text-fg-subtle hover:text-fg inline-flex items-center gap-1 text-xs"
        >
          <ChevronLeftIcon className="size-3.5" />
          교안 목록
        </Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-[-0.01em]">
            {data.title ?? data.originalFileName}
            <span className="text-fg-subtle text-sm font-normal">v{data.versionNo}</span>
            {analyzed ? (
              <CurriculumStatusBadge status={data.analysisStatus!} />
            ) : (
              <Badge variant="neutral">분석 전</Badge>
            )}
          </h1>
          {/*
            분석 실패한 교안에는 아래 `FailedState`가 같은 버튼을 다시 그린다 —
            그 화면에서는 그것이 **유일한 다음 행동**이라 본문 안에 있어야 한다.
          */}
          {!failed && (
            <Button variant="ghost" onClick={() => setReanalyzeOpen(true)}>
              {analyzed ? '다시 분석' : '분석 시작'}
            </Button>
          )}
        </div>
      </div>

      {failed ? (
        <FailedState data={data} onReanalyze={() => setReanalyzeOpen(true)} />
      ) : (
        <Tabs defaultValue="sections">
          <TabsList className="mb-4">
            <TabsTrigger value="sections">
              섹션
              <span className="text-fg-subtle ml-1.5 text-2xs font-normal">
                {data.sectionCount}
              </span>
            </TabsTrigger>
            <TabsTrigger value="linked">
              연결된 프로젝트
              <span className="text-fg-subtle ml-1.5 text-2xs font-normal">{used.length}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sections">
            {sections.isPending ? (
              <Loading label="섹션을 불러오는 중" />
            ) : sections.isError ? (
              <LoadFailed
                label="섹션을 불러오지 못했습니다"
                onRetry={() => void sections.refetch()}
              />
            ) : (
              <SectionsTab
                sections={sections.data ?? []}
                title={data.title ?? data.originalFileName}
                versionNo={data.versionNo}
                pageCount={data.pageCount}
              />
            )}
          </TabsContent>

          <TabsContent value="linked">
            <LinkedTab projects={used} />
          </TabsContent>
        </Tabs>
      )}

      <ReanalyzeDialog
        open={reanalyzeOpen}
        onOpenChange={setReanalyzeOpen}
        materialId={id}
        title={data.title ?? data.originalFileName}
        inUse={inUse}
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
const uploadedOn = (iso: string) => iso.slice(0, 10)

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
function LinkedTab({ projects }: { projects: findUsedProjects_Response }) {
  if (projects.length === 0)
    return (
      <div className="border-border-strong bg-surface-2 rounded-md border border-dashed p-8 text-center">
        <p className="text-fg-muted text-sm">이 교안을 쓰는 회차가 아직 없습니다</p>
        {/* **0건이 무엇을 뜻하는지**를 같이 쓴다 — 여기서는 좋은 소식이다 */}
        <p className="text-fg-subtle mt-1 text-xs">
          다시 분석해도 이미 발행된 리포트에 영향이 없습니다.
        </p>
      </div>
    )

  return (
    <>
      <p className="text-fg-muted mb-3 text-xs">
        다시 분석하거나 새 버전을 올리기 전에{' '}
        <b className="font-semibold">어느 회차가 이 교안을 쓰는지</b> 확인합니다 — 쪽 번호가
        달라지면 이미 발행된 리포트의 교안 위치가 어긋납니다.
      </p>
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-40">회차</TableHead>
            <TableHead className="w-24">기수</TableHead>
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
              <TableCell className="text-fg-muted text-xs">{p.cohortName ?? '—'}</TableCell>
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
    </>
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
        <Button onClick={onReanalyze}>다시 분석</Button>
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
