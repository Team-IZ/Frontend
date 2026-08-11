import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import ConsoleShell from '@/shells/ConsoleShell'
import PageHeader from '@/components/common/PageHeader'
import ErrorState from '@/components/common/ErrorState'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import Loading from '@/components/common/Loading'
import TableSkeleton from '@/components/common/TableSkeleton'
import { Spinner } from '@/components/ui/Spinner'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table'
import { ApiError } from '@/api/_contract/errors'
import { staleProps } from '@/features/operator/_shared/listQuery'

/*
  dev 전용 — 비동기 상태 표준(`docs/dev/async-states.md`)을 **눈으로 확인하는 자리**다.

  ▸ **`ConsoleShell` 안에서 그린다.** 실제 화면과 같은 사이드바·여백(32px)·상한(1280px)을
    거치므로 **여기서 본 크기가 실제 크기**다. 별도 캔버스에 그리면 폭이 달라져
    "화면에선 어떻게 보이나"에 답하지 못한다.
  ▸ **실물 컴포넌트를 부른다.** 스크린샷도 흉내도 아니다 — `ErrorState`·`Empty`·
    `staleProps`가 실제 앱과 같은 코드다. 그래서 이 페이지가 깨지면 앱도 깨져 있다.
  ▸ 단계는 `?step=`으로 갖는다. 링크를 그대로 붙여 넣어 같은 화면을 열 수 있어야 한다.

  실제 앱에는 이 페이지로 오는 링크가 없다(`/trainee/__cases`와 같은 관례). 라우트에
  직접 등록한다 — 라우트 글롭(`*.route.tsx`) 대상이 아니다. QA 도구이지 화면이 아니다.
*/

/** 실패 문구를 만들려면 진짜 `ApiError`가 필요하다 — 화면과 같은 경로를 타야 한다 */
const err = (status: number, code = String(status), retryAfter?: number) =>
  new ApiError({ message: '', status, code, retryAfter })

type Step = {
  no: number
  title: string
  /** 이 단계가 없앤 것 — 한 줄 */
  fixed: string
  done: boolean
  render?: () => React.ReactNode
}

/** 여러 예시를 세로로 쌓되 각각이 무엇인지 밝힌다 */
function Case({
  title,
  note,
  children,
}: {
  title: string
  note?: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-6">
      <h3 className="text-fg mb-0.5 text-sm font-bold">{title}</h3>
      {note && <p className="text-fg-subtle mb-2 text-xs">{note}</p>}
      {children}
    </section>
  )
}

/** 전/후를 나란히 두면 무엇이 바뀌었는지가 설명 없이 보인다 */
function BeforeAfter({ before, after }: { before: React.ReactNode; after: React.ReactNode }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div>
        <p className="text-fg-subtle mb-1.5 text-2xs font-medium">전</p>
        <div className="opacity-70 grayscale">{before}</div>
      </div>
      <div>
        <p className="text-primary mb-1.5 text-2xs font-medium">후</p>
        {after}
      </div>
    </div>
  )
}

const ROWS = [
  { name: '미니프로젝트 5차', status: '종료', period: '07-20 ~ 07-31' },
  { name: '미니프로젝트투투', status: '준비됨', period: '08-11 ~ 08-18' },
  { name: '미니프로젝트 6차', status: '진행 중', period: '08-03 ~ 08-21' },
]

/** 실제 표와 같은 폭 토큰을 쓴다 — 여기서 본 열 폭이 목록 화면의 열 폭이다 */
function SampleTable() {
  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-[200px]">프로젝트</TableHead>
          <TableHead className="w-[108px]">상태</TableHead>
          <TableHead className="w-[168px]">기간</TableHead>
          <TableHead>검증 개념 3건</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ROWS.map((r) => (
          <TableRow key={r.name}>
            <TableCell className="font-semibold">{r.name}</TableCell>
            <TableCell className="text-xs">{r.status}</TableCell>
            <TableCell className="text-xs">{r.period}</TableCell>
            <TableCell className="text-xs">3건 확정</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/* ─── 1단계 — 실패가 원인에 맞는 말을 한다 ─────────────────────── */

function Step1() {
  return (
    <>
      <Case
        title="같은 화면, 같은 자리 — 그런데 다른 말"
        note="전에는 무엇이 실패했든 «회차를 찾을 수 없습니다 / 지워졌거나 주소가 잘못됐을 수 있습니다»였다. 서버가 500을 주는 동안 사용자는 없는 문제(주소)를 고치러 간다."
      >
        <div className="flex flex-col gap-3">
          {[
            { s: 500, label: '서버 오류 500', why: '다시 시도가 결과를 바꾼다 → 버튼 있음' },
            {
              s: 0,
              label: '네트워크 끊김',
              why: '서버 탓으로 쓰지 않는다 — 연결을 확인하라고 한다',
            },
            { s: 403, label: '권한 없음 403', why: '다시 눌러도 권한은 안 생긴다 → 버튼 없음' },
            { s: 404, label: '없음 404', why: '다시 불러도 없다 → 버튼 없음' },
          ].map(({ s, label, why }) => (
            <div key={s}>
              <p className="text-fg-subtle mb-1 text-2xs">
                {label} · {why}
              </p>
              <ErrorState error={err(s)} subject="회차" onRetry={() => {}} />
            </div>
          ))}
        </div>
      </Case>

      <Case
        title="429는 서버가 알려준 초를 쓴다"
        note="Retry-After가 오면 «잠시 후»가 아니라 그 값을 쓴다."
      >
        <ErrorState error={err(429, 'TOO_MANY_REQUESTS', 30)} subject="목록" onRetry={() => {}} />
      </Case>

      <Case
        title="404가 늘 고장인 것은 아니다 — 리포트 «아직 발행 전»"
        note="COHORT_REPORT_NOT_FOUND는 404로 오지만 실패가 아니다. 회차가 더 돌면 생기므로 «다시 시도»는 눌러도 아무것도 바꾸지 못한다 — 점선(유형 1)에 버튼도 없다."
      >
        <BeforeAfter
          before={
            <Empty variant="failed">
              <EmptyHeader>
                <EmptyTitle>리포트를 불러오지 못했습니다</EmptyTitle>
                <EmptyDescription>잠시 후 다시 시도해 주세요.</EmptyDescription>
              </EmptyHeader>
              <Button variant="ghost">다시 시도</Button>
            </Empty>
          }
          after={
            <ErrorState
              error={err(404, 'COHORT_REPORT_NOT_FOUND')}
              subject="리포트"
              onRetry={() => {}}
            />
          }
        />
      </Case>

      <Case
        title="재시도는 자기 대기를 보여준다"
        note="전에는 눌러도 화면이 아무 반응을 안 해서 사용자가 연타했다. 오른쪽은 재조회가 떠 있는 상태."
      >
        <BeforeAfter
          before={<ErrorState error={err(500)} subject="목록" onRetry={() => {}} />}
          after={<ErrorState error={err(500)} subject="목록" onRetry={() => {}} retrying />}
        />
      </Case>

      <Case
        title="렌더 예외 그물 (AppCrashed)"
        note="응답의 옵셔널 필드 하나가 null로 와도 전에는 화면이 아니라 앱이 사라졌다(흰 화면). 실제로 프로젝트 목록이 이렇게 죽었다 — 지금은 이 화면이 받는다."
      >
        <Card className="items-center gap-3 py-10 text-center">
          <p className="text-lg font-semibold">화면이 표시되지 않았습니다</p>
          <p className="text-fg-muted max-w-md text-sm">
            화면을 새로 고쳐도 같으면 담당자에게 알려주세요.
          </p>
          <Button variant="ghost">새로고침</Button>
        </Card>
      </Case>
    </>
  )
}

/* ─── 2단계 — 조건을 바꿔도 표가 사라지지 않는다 ───────────────── */

function Step2() {
  const [stale, setStale] = useState(true)
  return (
    <>
      <Case
        title="조건 변경 — 실측으로 잰 것"
        note="명단 2쪽을 누르면 표가 통째로 사라졌다: 행 10 → 0, 본문 869 → 808px. 아래 토글로 갱신 중 상태를 붙잡아 볼 수 있다."
      >
        <div className="mb-3 flex items-center gap-2">
          <Button size="sm" variant={stale ? 'primary' : 'ghost'} onClick={() => setStale(true)}>
            갱신 중 (후)
          </Button>
          <Button size="sm" variant={stale ? 'ghost' : 'primary'} onClick={() => setStale(false)}>
            도착 후
          </Button>
        </div>
        <Card className="p-4">
          <div {...staleProps(stale)}>
            <SampleTable />
            <div className="mt-3 grid grid-cols-3 items-center">
              <p className="text-fg-subtle text-xs">1–3 / 7개</p>
            </div>
          </div>
        </Card>
        <p className="text-fg-subtle mt-2 text-xs">
          갱신 중에는 <code className="bg-surface-2 rounded px-1">opacity-60</code> +{' '}
          <code className="bg-surface-2 rounded px-1">aria-busy</code>. 값이 옛 것이라는 사실을
          숨기지 않되 자리를 뺏지도 않는다.
        </p>
      </Case>

      <Case
        title="전에는 이랬다"
        note="같은 순간 — 표가 사라지고 스피너 하나. 스피너 자리(py-16)와 표 높이가 달라 푸터·스크롤이 튄다."
      >
        <BeforeAfter
          before={
            <Card className="p-4">
              <div className="flex justify-center py-16">
                <Spinner className="size-6" />
              </div>
            </Card>
          }
          after={
            <Card className="p-4">
              <div {...staleProps(true)}>
                <SampleTable />
              </div>
            </Card>
          }
        />
      </Case>

      <Case
        title="푸터가 앞서 가지 않는다"
        note="이전 값 유지를 켜자 새로 생긴 문제 — 1쪽 열 줄을 보여주면서 «21–30»이라고 썼다. 범위는 응답이 알려준 쪽으로 세고, 페이저 하이라이트만 누른 쪽을 따른다."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <p className="text-danger mb-1.5 text-2xs font-medium">전 · 데이터와 어긋남</p>
            <Card className="p-4">
              <p className="text-fg-subtle text-xs">21–30 / 223명</p>
              <p className="text-fg-subtle mt-1 text-2xs">(보이는 행은 1–10)</p>
            </Card>
          </div>
          <div>
            <p className="text-primary mb-1.5 text-2xs font-medium">후 · 보이는 것을 설명</p>
            <Card className="p-4">
              <p className="text-fg-subtle text-xs">1–10 / 223명</p>
              <p className="text-fg-subtle mt-1 text-2xs">(3쪽 하이라이트는 유지)</p>
            </Card>
          </div>
        </div>
      </Case>

      <Case
        title="검색 디바운스"
        note="OP-03은 글자마다 요청이 나갔다. 지금은 멈춘 뒤 300ms — 실측: 6글자 타이핑에 요청 1건."
      >
        <Card className="p-4">
          <p className="text-fg-muted text-xs">
            «미니프로젝트» 6글자 · <b className="text-fg font-semibold">전 6건 → 후 1건</b>
          </p>
        </Card>
      </Case>

      <Case
        title="로딩 중 컨트롤은 잠근다"
        note="OP-02 툴바는 목록이 오기 전에도 열렸고, 열면 아무것도 없었다. 그리고 «전체 0반»이라고 썼다 — 모르는 것을 0으로 단언한 것이다."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <p className="text-danger mb-1.5 text-2xs font-medium">전</p>
            <Card className="p-3">
              <Button variant="ghost" size="sm">
                <span className="text-fg-subtle text-2xs">반</span> 전체 0반
              </Button>
            </Card>
          </div>
          <div>
            <p className="text-primary mb-1.5 text-2xs font-medium">후 · 잠김 + 개수 없음</p>
            <Card className="p-3">
              <Button variant="ghost" size="sm" disabled>
                <span className="text-fg-subtle text-2xs">반</span> 전체
              </Button>
            </Card>
          </div>
        </div>
      </Case>
    </>
  )
}

/* ─── 4단계 — 첫 진입은 스켈레톤 ──────────────────────────────── */

function Step4() {
  return (
    <>
      <Case
        title="첫 진입 — 스피너 vs 스켈레톤"
        note="스피너는 «기다려»만 말하고 스켈레톤은 «이런 것이 올 것이다»까지 말한다. 차이는 높이에서 난다 — 아래 숫자는 명단 탭에서 실제로 잰 것이다."
      >
        <BeforeAfter
          before={
            <Card className="p-0">
              <Loading label="명단을 불러오는 중" />
            </Card>
          }
          after={
            <Card className="p-0">
              <TableSkeleton rows={4} cols={['w-10', 'w-32', 'w-56', 'w-32', 'w-28']} />
            </Card>
          }
        />
        <div className="text-fg-subtle mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs">
          <span>
            스피너 → 표: <b className="text-danger font-semibold">61px 점프</b>
          </span>
          <span>
            스켈레톤 → 표: <b className="text-fg font-semibold">9px</b>
          </span>
        </div>
      </Case>

      <Case
        title="행 수·열 폭을 실제 표에서 가져온다"
        note="10행짜리 목록에 3행을 그리면 도착할 때 또 점프한다 — 스켈레톤을 쓰는 이유 자체가 없어진다. 높이도 눈대중이 아니라 잰 값(헤더 38.5px · 본문 53px)을 박았다. 처음엔 눈대중으로 만들었다가 133px이 어긋났다."
      >
        <Card className="p-0">
          <TableSkeleton
            rows={10}
            cols={['w-10', 'w-32', 'w-56', 'w-32', 'w-28', 'w-32', 'w-44']}
          />
        </Card>
      </Case>

      <Case
        title="스피너가 남는 자리 — 모양을 모르는 것"
        note="응답에 따라 구조가 갈리는 것(모달 안 목록·비용 매트릭스)은 그릴 모양을 미리 알 수 없다. 거기서만 스피너를 쓴다."
      >
        <Card className="p-0">
          <Loading label="매니저를 불러오는 중" />
        </Card>
      </Case>

      <Case
        title="복붙 두 벌을 없앴다"
        note="admin/_/AsyncState 와 report/_/AsyncState 가 같은 Loading·LoadFailed 를 각각 갖고 있었고, 화면 넷이 또 인라인으로 적고 있었다."
      >
        <Card className="p-4">
          <p className="text-fg-muted text-xs leading-relaxed">
            <b className="text-fg font-semibold">Loading</b> → `components/common/Loading` 한 벌 ·{' '}
            <b className="text-fg font-semibold">LoadFailed</b> → 삭제하고 전부{' '}
            <b className="text-fg font-semibold">ErrorState</b>로. 옮기면서 문구가 status·코드에
            맞게 갈리는 것을 10곳이 공짜로 얻었다 — 전에는 전부 «…를 불러오지 못했습니다» 하나였다.
          </p>
        </Card>
      </Case>
    </>
  )
}

/* ─── 3단계 — 「없는 것」 3종을 갈라 쓴다 ──────────────────────── */

function Step3() {
  return (
    <>
      <Case
        title="세 종류 — 질문 하나로 갈린다: 사용자가 지금 할 일이 있나"
        note="점선은 «기다리면 채워진다», 실선은 «확정된 면». 전에는 Empty 기본값이 점선이라 셋이 전부 점선으로 그려졌다."
      >
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-fg-subtle mb-1 text-2xs">
              pending · 아직 — 기다리면 채워진다 · <b>언제</b> 채워지는지를 쓴다
            </p>
            <Empty variant="pending">
              <EmptyHeader>
                <EmptyTitle>아직 제출한 학생이 없습니다</EmptyTitle>
                <EmptyDescription>
                  제출이 시작되면 반별 진행이 여기에 쌓입니다. 제출 마감은 8월 18일입니다.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
          <div>
            <p className="text-fg-subtle mb-1 text-2xs">
              empty · 없음 — 만들거나 조건을 풀면 된다 · <b>그 행동</b>을 붙인다
            </p>
            <Empty variant="empty">
              <EmptyHeader>
                <EmptyTitle>아직 프로젝트가 없습니다</EmptyTitle>
                <EmptyDescription>
                  회차를 만들고 교안을 연결하면 검증 개념 3건을 고를 수 있습니다.
                </EmptyDescription>
              </EmptyHeader>
              <Button>+ 프로젝트 생성</Button>
            </Empty>
          </div>
          <div>
            <p className="text-fg-subtle mb-1 text-2xs">failed · 실패 — 다시 시도</p>
            <ErrorState error={err(500)} subject="목록" onRetry={() => {}} />
          </div>
        </div>
      </Case>

      <Case
        title="전 — 같은 셋이 전부 점선이었다"
        note="화면이 «기다리면 채워집니다»라고 잘못 말하는 중이었다. 운영 관리 열 곳이 전부 이랬다."
      >
        <div className="flex flex-col gap-2">
          <Empty variant="pending">
            <EmptyHeader>
              <EmptyTitle>아직 등록된 교육생이 없습니다</EmptyTitle>
              <EmptyDescription>CSV로 한 번에 넣거나 직접 입력할 수 있습니다.</EmptyDescription>
            </EmptyHeader>
          </Empty>
          <Empty variant="pending">
            <EmptyHeader>
              <EmptyTitle>조건에 맞는 기수가 없습니다</EmptyTitle>
              <EmptyDescription>전체 4개에서 찾았습니다.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      </Case>

      <Case
        title="한 자리가 두 뜻일 때 — 분석 · 기수 간 비교"
        note="문구가 이미 갈라 놓은 것을 테두리가 도로 뭉개지 않게, variant도 조건부다."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <p className="text-fg-subtle mb-1.5 text-2xs">고를 기수가 있다 → 실선</p>
            <Empty variant="empty">
              <EmptyHeader>
                <EmptyTitle>견줄 기수를 골라 주세요</EmptyTitle>
                <EmptyDescription>
                  같은 교안을 쓴 기수와 같은 개념끼리 맞대어 봅니다.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
          <div>
            <p className="text-fg-subtle mb-1.5 text-2xs">첫 기수다 → 점선(기다려야 한다)</p>
            <Empty variant="pending">
              <EmptyHeader>
                <EmptyTitle>비교할 기수가 없습니다</EmptyTitle>
                <EmptyDescription>
                  9기가 이 기관의 첫 기수예요. 다음 기수가 같은 교안으로 진행되면 비교할 수
                  있습니다.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        </div>
      </Case>

      <Case
        title="0건이 좋은 소식인 자리"
        note="같은 실선이어도 문구가 갈린다 — 0건이 조치 대상인지 좋은 소식인지는 화면이 말해야 한다."
      >
        <Empty variant="empty">
          <EmptyHeader>
            <EmptyTitle>반 절반 이상이 미달한 회차가 없습니다</EmptyTitle>
            <EmptyDescription>위험 판정이 모두 개인 사유로 남았습니다.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </Case>
    </>
  )
}

const STEPS: Step[] = [
  {
    no: 1,
    title: '실패가 원인에 맞는 말을 한다',
    fixed: 'errorCopy · ErrorState · 렌더 예외 그물',
    done: true,
    render: () => <Step1 />,
  },
  {
    no: 2,
    title: '조건을 바꿔도 표가 사라지지 않는다',
    fixed: 'placeholderData · staleProps · 검색 디바운스',
    done: true,
    render: () => <Step2 />,
  },
  {
    no: 3,
    title: '「없는 것」 3종을 갈라 쓴다',
    fixed: 'Empty variant — pending · empty · failed',
    done: true,
    render: () => <Step3 />,
  },
  {
    no: 4,
    title: '첫 진입은 스켈레톤',
    fixed: 'TableSkeleton · Loading 공용화 · LoadFailed 삭제',
    done: true,
    render: () => <Step4 />,
  },
  { no: 5, title: 'isLoading 일괄 + CI 스캐너', fixed: '', done: false },
  { no: 6, title: 'OP-05 react-query 이관 · 기수 URL 통일', fixed: '', done: false },
]

export default function AsyncStatesPreview() {
  const [params, setParams] = useSearchParams()
  const requested = Number(params.get('step'))
  const active = STEPS.find((s) => s.no === requested && s.done) ?? STEPS[0]

  return (
    <ConsoleShell role="operator" cohort="9기">
      <PageHeader
        breadcrumb="dev › 비동기 상태 표준"
        title={`${active.no}단계 · ${active.title}`}
        breakdown={<span className="text-fg-subtle">{active.fixed}</span>}
        action={
          <Button
            variant="ghost"
            nativeButton={false}
            render={<Link to="/operator/projects" />}
            size="sm"
          >
            실제 화면으로 →
          </Button>
        }
      />

      {/*
        단계 고르기 — 안 끝난 단계는 **비활성으로 남겨 둔다.** 목록에서 빼면 전체가 몇
        단계인지 안 보이고, 지금 어디까지 왔는지가 이 페이지의 절반이다.
      */}
      <div className="border-border mb-5 flex flex-wrap gap-1.5 border-b pb-4">
        {STEPS.map((s) => (
          <Button
            key={s.no}
            size="sm"
            variant={s.no === active.no ? 'primary' : 'ghost'}
            disabled={!s.done}
            onClick={() => setParams({ step: String(s.no) })}
          >
            {s.no}. {s.title}
            {!s.done && <span className="text-fg-subtle ml-1 text-2xs">예정</span>}
          </Button>
        ))}
      </div>

      {active.render?.()}
    </ConsoleShell>
  )
}
