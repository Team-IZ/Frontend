import { useCallback, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ChevronLeftIcon, TriangleAlertIcon } from 'lucide-react'
import ConsoleShell from '@/shells/ConsoleShell'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { useAsync } from '@/lib/useAsync'
import { cn } from '@/lib/utils/cn'
import { getCurriculum } from '../_/api/api'
import type { CurriculumDetail } from '../_/api/types'
import { Loading, LoadFailed } from '../_/components/AsyncState'
import { CurriculumStatusBadge, LinkedProjectStatusBadge } from '../_/components/StatusBadges'
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

  `연결된 프로젝트`가 D1(한 데이터는 한 곳에서만)에 걸릴 것 같지만 다르다 — 여기 있는
  것은 **회차 목록이 아니라 그 교안에 대한 제약**이다. 행을 눌러도 프로젝트 화면으로
  넘어갈 뿐 여기서 고치지 않는다.
*/
export default function CurriculumDetailScreen() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [reanalyzeOpen, setReanalyzeOpen] = useState(false)

  const load = useCallback(() => getCurriculum(id), [id])
  const curriculum = useAsync(load)

  if (curriculum.loading)
    return (
      <ConsoleShell role="operator">
        <Loading label="교안을 불러오는 중" />
      </ConsoleShell>
    )

  if (curriculum.failed || !curriculum.data)
    return (
      <ConsoleShell role="operator">
        <LoadFailed label="교안을 찾을 수 없습니다" onRetry={curriculum.reload} />
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
  /** 응시가 시작된 회차가 있으면 재분석에 경고를 세운다(OP-06 §6) */
  const inUse = data.linked.filter((p) => p.attended !== null && p.attended > 0)

  return (
    <ConsoleShell role="operator">
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
            {data.name}
            <span className="text-fg-subtle text-sm font-normal">{data.version}</span>
            <CurriculumStatusBadge status={data.status} />
          </h1>
          {/*
            분석 실패한 교안에는 아래 `FailedState`가 같은 두 버튼을 다시 그린다 —
            그 화면에서는 그것이 **유일한 다음 행동**이라 본문 안에 있어야 한다.
          */}
          {data.status !== 'FAILED' && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setReanalyzeOpen(true)}>
                다시 분석
              </Button>
              <Button variant="ghost">새 버전 올리기</Button>
            </div>
          )}
        </div>
      </div>

      {data.status === 'FAILED' ? (
        <FailedState data={data} onReanalyze={() => setReanalyzeOpen(true)} />
      ) : (
        <Tabs defaultValue="sections">
          <TabsList className="mb-4">
            <TabsTrigger value="sections">
              섹션
              <span className="text-fg-subtle ml-1.5 text-2xs font-normal">{data.sections}</span>
            </TabsTrigger>
            <TabsTrigger value="linked">
              연결된 프로젝트
              <span className="text-fg-subtle ml-1.5 text-2xs font-normal">
                {data.linked.length}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sections">
            <SectionsTab data={data} />
          </TabsContent>

          <TabsContent value="linked">
            <LinkedTab data={data} />
          </TabsContent>
        </Tabs>
      )}

      <ReanalyzeDialog
        open={reanalyzeOpen}
        onOpenChange={setReanalyzeOpen}
        curriculum={data}
        inUse={inUse}
        onDone={curriculum.reload}
      />
    </ConsoleShell>
  )
}

/**
 * 섹션 탭 — 마스터-디테일. **좌 목차 → 우 한 섹션**이고 앵커 스크롤이 아니다(H2).
 *
 * 세로로 섹션 12개 × 항목 수십 개를 쌓으면 스크롤로 찾게 된다(H1 — 세로 스택 5~6블록 금지).
 */
function SectionsTab({ data }: { data: CurriculumDetail }) {
  const [openId, setOpenId] = useState(data.sectionList[0]?.id ?? '')
  const current = data.sectionList.find((s) => s.id === openId) ?? data.sectionList[0]

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
          {data.sections}개 섹션 · {data.pageCount > 0 ? `${data.pageCount}쪽` : '쪽수 확인 중'}
        </p>
        <div className="space-y-1">
          {data.sectionList.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-current={s.id === current.id ? 'true' : undefined}
              onClick={() => setOpenId(s.id)}
              className={cn(
                'border-border bg-surface w-full rounded-md border px-3 py-2 text-left',
                s.id === current.id ? 'border-primary bg-primary-soft' : 'hover:bg-surface-2',
              )}
            >
              <b className="block text-sm font-semibold">{s.name}</b>
              <span className="text-fg-subtle text-2xs">
                {s.pages} · 항목 {s.items.length}
              </span>
            </button>
          ))}
        </div>
      </nav>

      {/* 우 — 그 섹션이 가르친 것 */}
      <section className="bg-surface border-border rounded-md border p-5">
        <h2 className="text-base font-bold">{current.name}</h2>
        {/* **리포트와 면담이 이 위치를 가리킨다** — 그래서 쪽 번호가 화면에 있어야 한다 */}
        <p className="text-fg-subtle mt-0.5 text-xs">
          {data.name} {data.version} · {current.pages} — 리포트와 면담이 이 위치를 가리킵니다
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
            <li key={item.id} className="py-2.5">
              <div className="flex items-baseline gap-2">
                <b className="text-sm font-semibold">{item.name}</b>
                <span className="text-fg-subtle text-2xs">{item.page}</span>
              </div>
              {/*
                **정의 한 줄을 같이 둔다.** 이름만으로는 무엇을 묻게 될지 판단할 수 없는데,
                프로젝트가 고르는 순간 그것이 그 회차 모든 학생의 문항이 된다(14번 6-3).
              */}
              <p className="text-fg-muted mt-0.5 text-xs">{item.definition}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

/** 연결된 프로젝트 탭 — **조회가 아니라 안전장치다**(OP-06 §3) */
function LinkedTab({ data }: { data: CurriculumDetail }) {
  if (data.linked.length === 0)
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
            <TableHead className="w-32">회차</TableHead>
            <TableHead className="w-24">기수</TableHead>
            {/* 흡수 열 — 서술이 가장 길다 */}
            <TableHead>이 교안에서 고른 항목</TableHead>
            <TableHead className="w-40">상태</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.linked.map((p) => (
            <TableRow key={p.id}>
              <TableCell>
                {/* 여기서 고치지 않는다 — 프로젝트 화면으로 넘어갈 뿐이다 */}
                <Link
                  to={`/operator/projects/${p.id}`}
                  className="text-fg hover:text-primary font-semibold hover:underline"
                >
                  {p.name}
                </Link>
              </TableCell>
              <TableCell className="text-fg-muted text-xs">{p.cohortName}</TableCell>
              <TableCell className="text-fg-muted text-xs">
                {p.conceptNames.length > 0 ? (
                  p.conceptNames.join(' · ')
                ) : (
                  /* 아직 안 고른 것과 없는 것은 다르다(F3) */
                  <span className="text-warning">항목 미확정</span>
                )}
              </TableCell>
              <TableCell>
                <LinkedProjectStatusBadge status={p.status} />
                {p.attended !== null && p.attendable !== null && (
                  <span className="text-fg-subtle ml-1.5 text-2xs tabular-nums">
                    {p.attended}/{p.attendable}
                  </span>
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
 * 분석 실패 — **사유를 그대로 쓴다.** 무엇을 고쳐야 하는지가 거기 있다.
 *
 * 이 교안은 **프로젝트에 연결할 수 없다**(OP-03 `교안에 항목 0`) — 그 사실을 같이 밝힌다.
 */
function FailedState({ data, onReanalyze }: { data: CurriculumDetail; onReanalyze: () => void }) {
  return (
    <>
      <Alert variant="danger" className="mb-4">
        <TriangleAlertIcon />
        <AlertTitle>교안을 분석하지 못했습니다</AlertTitle>
        <AlertDescription>{data.failureReason}</AlertDescription>
      </Alert>

      <dl className="bg-surface border-border divide-border grid divide-y rounded-md border text-sm">
        <Row label="파일">
          {data.fileName}
          {data.pageCount > 0 && ` · ${data.pageCount}쪽`}
        </Row>
        <Row label="등록">{data.registeredAt}</Row>
        <Row label="가르친 항목">
          <span className="text-fg-muted">
            — 분석이 끝나야 나옵니다. 이 교안은 아직 프로젝트에 연결할 수 없습니다.
          </span>
        </Row>
      </dl>

      <div className="mt-4 flex gap-2">
        <Button onClick={onReanalyze}>다시 분석</Button>
        <Button variant="ghost">파일 교체</Button>
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
