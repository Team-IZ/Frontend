import { useState } from 'react'
import ErrorState from '@/components/common/ErrorState'
import Loading from '@/components/common/Loading'
import TableSkeleton from '@/components/common/TableSkeleton'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import { Spinner } from '@/components/ui/Spinner'
import { ApiError } from '@/api/_contract/errors'
import { staleProps } from '@/features/operator/_shared/listQuery'
import {
  MANAGER_COLS,
  MANAGERS,
  PROJECTS,
  PROJECT_COLS,
  ROSTER,
  ROSTER_COLS,
  managerCells,
  projectCells,
  rosterCells,
} from './data'
import { Case, DataTable, Footer, Framed, Ghost, Measured, Pair, Screen } from './Screen'

/** 진짜 `ApiError`를 만든다 — 화면과 같은 경로를 타야 문구가 실제와 같다 */
const err = (status: number, code = String(status), retryAfter?: number) =>
  new ApiError({ message: '', status, code, retryAfter })

const projectRows = PROJECTS.map(projectCells)
const rosterRows = ROSTER.map(rosterCells)
const rosterCols = ROSTER_COLS.map((c) => c.w)
const projectCols = PROJECT_COLS.map((c) => c.w)

const PROJECT_TOOLBAR = [
  '프로젝트명 검색',
  '상태 · 전체 (7)',
  '교안 · 전체',
  null,
  '정렬 · 준비 필요 순',
]
const ROSTER_TOOLBAR = ['이름 · 이메일 검색', '반 · 전체', '계정 · 전체', '정렬 · 이름순']

/* ═══ 1단계 — 실패가 원인에 맞는 말을 한다 ═══════════════════════ */

export function Step1() {
  return (
    <>
      <Case
        title="프로젝트 상세 — 무엇이 실패했든 «주소가 잘못됐다»고 했다"
        note="전에는 500이든 403이든 «회차를 찾을 수 없습니다 / 지워졌거나 주소가 잘못됐을 수 있습니다» 하나였다. 서버가 500을 주는 동안 사용자는 없는 문제(주소)를 고치러 간다. 지금은 status·에러 코드를 보고 갈린다."
      >
        <Pair>
          <Screen
            title="미니프로젝트 7차"
            breadcrumb="프로젝트 › 9기"
            label="전 · 서버 오류 500인데"
            tone="bad"
          >
            <Empty variant="failed">
              <EmptyHeader>
                <EmptyTitle>회차를 찾을 수 없습니다</EmptyTitle>
                <EmptyDescription>지워졌거나 주소가 잘못됐을 수 있습니다.</EmptyDescription>
              </EmptyHeader>
              <Button variant="ghost">프로젝트 목록으로</Button>
            </Empty>
          </Screen>
          <Screen
            title="미니프로젝트 7차"
            breadcrumb="프로젝트 › 9기"
            label="후 · 서버 오류 500"
            tone="good"
          >
            <ErrorState
              error={err(500)}
              subject="회차"
              onRetry={() => {}}
              action={<Button variant="ghost">프로젝트 목록으로</Button>}
            />
          </Screen>
        </Pair>
        <div className="mt-4">
          <Pair>
            <Screen title="미니프로젝트 7차" breadcrumb="프로젝트 › 9기" label="후 · 진짜 404">
              <ErrorState
                error={err(404)}
                subject="회차"
                onRetry={() => {}}
                action={<Button variant="ghost">프로젝트 목록으로</Button>}
              />
            </Screen>
            <Screen title="미니프로젝트 7차" breadcrumb="프로젝트 › 9기" label="후 · 권한 없음 403">
              <ErrorState
                error={err(403)}
                subject="회차"
                onRetry={() => {}}
                action={<Button variant="ghost">프로젝트 목록으로</Button>}
              />
            </Screen>
          </Pair>
        </div>
        <p className="text-fg-subtle mt-3 text-xs leading-relaxed">
          <b className="text-fg font-semibold">「다시 시도」가 있고 없는 것을 보세요.</b> 500은 다시
          누르면 결과가 바뀌지만 404·403은 눌러도 같습니다 — 눌러도 안 되는 버튼을 그리는 것은
          거짓말이라, 판정을 <code className="bg-surface-2 rounded px-1">errorCopy</code> 한 곳에
          모아 화면이 실수로도 못 그리게 했습니다.
        </p>
      </Case>

      <Case
        title="리포트 — 404가 늘 고장인 것은 아니다"
        note="COHORT_REPORT_NOT_FOUND는 «아직 발행 전»이다. 회차가 더 돌면 생기므로 다시 시도가 아무것도 바꾸지 못한다 — 빨간 실패 박스가 아니라 점선(유형 1 «아직»)이고 버튼도 없다."
      >
        <Pair>
          <Screen title="리포트" breadcrumb="리포트 › 9기" label="전" tone="bad">
            <Empty variant="failed">
              <EmptyHeader>
                <EmptyTitle>리포트를 불러오지 못했습니다</EmptyTitle>
                <EmptyDescription>잠시 후 다시 시도해 주세요.</EmptyDescription>
              </EmptyHeader>
              <Button variant="ghost">다시 시도</Button>
            </Empty>
          </Screen>
          <Screen title="리포트" breadcrumb="리포트 › 9기" label="후" tone="good">
            <ErrorState
              error={err(404, 'COHORT_REPORT_NOT_FOUND')}
              subject="리포트"
              onRetry={() => {}}
            />
          </Screen>
        </Pair>
      </Case>

      <Case
        title="명단 — 오프라인일 때 서버 탓을 하지 않는다"
        note="서버에 닿지도 못한 것(status 0)을 «잠시 후 다시»라고 쓰면 사용자가 엉뚱한 곳을 기다린다. 429는 서버가 알려준 초를 그대로 쓴다."
      >
        <Pair>
          <Screen
            title="운영 관리"
            breadcrumb="운영 관리 › 9기"
            toolbar={ROSTER_TOOLBAR}
            label="네트워크 끊김"
          >
            <ErrorState error={err(0, 'NETWORK')} subject="명단" onRetry={() => {}} />
          </Screen>
          <Screen
            title="운영 관리"
            breadcrumb="운영 관리 › 9기"
            toolbar={ROSTER_TOOLBAR}
            label="요청이 많아 일시 차단(429)"
          >
            <ErrorState
              error={err(429, 'TOO_MANY_REQUESTS', 30)}
              subject="명단"
              onRetry={() => {}}
            />
          </Screen>
        </Pair>
      </Case>

      <Case
        title="재시도 버튼이 자기 대기를 보여준다"
        note="전에는 눌러도 화면이 아무 반응이 없어서 사용자가 연타했다 — isError는 그대로라 아무것도 안 바뀐다."
      >
        <Pair>
          <Screen title="분석" breadcrumb="분석 › 9기 › 회차 흐름" label="누르기 전">
            <ErrorState error={err(500)} subject="분석 결과" onRetry={() => {}} />
          </Screen>
          <Screen title="분석" breadcrumb="분석 › 9기 › 회차 흐름" label="누른 뒤" tone="good">
            <ErrorState error={err(500)} subject="분석 결과" onRetry={() => {}} retrying />
          </Screen>
        </Pair>
      </Case>

      <Case
        title="렌더 예외 그물 — 실제로 이걸로 살았다"
        note="응답에 readinessCounts가 빠져 프로젝트 목록이 통째로 흰 화면이 됐다. 스펙에는 required로 들어가 있어 코드가 늘 온다고 믿고 있었다 — 그물이 없었으면 아무 단서도 없이 빈 화면만 봤다."
      >
        <Pair>
          <div>
            <p className="text-danger mb-1.5 text-2xs font-medium">전 · 앱이 사라진다</p>
            <div className="bg-canvas border-border flex h-[220px] items-center justify-center rounded-lg border">
              <span className="text-fg-subtle text-xs">(흰 화면 · 콘솔에도 단서 없음)</span>
            </div>
          </div>
          <div>
            <p className="text-primary mb-1.5 text-2xs font-medium">후 · AppCrashed가 받는다</p>
            <div className="bg-canvas border-border flex h-[220px] flex-col items-center justify-center gap-3 rounded-lg border text-center">
              <p className="text-lg font-semibold">화면이 표시되지 않았습니다</p>
              <p className="text-fg-muted max-w-md text-sm">
                화면을 새로 고쳐도 같으면 담당자에게 알려주세요.
              </p>
              <Button variant="ghost">새로고침</Button>
            </div>
          </div>
        </Pair>
      </Case>
    </>
  )
}

/* ═══ 2단계 — 조건을 바꿔도 표가 사라지지 않는다 ═════════════════ */

export function Step2() {
  const [stale, setStale] = useState(true)
  const [page, setPage] = useState(3)
  return (
    <>
      <Case
        title="명단 · 쪽 넘기기 — 전에는 표가 통째로 사라졌다"
        note="실측: 행 10 → 0, 본문 869 → 808px. 검색어를 한 글자 칠 때마다, 필터를 바꿀 때마다 같은 일이 났다. 조건이 곧 캐시 키라 바뀌는 순간 그 키에 캐시가 없어서다."
      >
        <Pair wide>
          <Screen
            title="운영 관리"
            breadcrumb="운영 관리 › 9기"
            count="223명"
            toolbar={ROSTER_TOOLBAR}
            label="전 · 2쪽을 누른 직후"
            tone="bad"
          >
            <Framed>
              <Loading label="명단을 불러오는 중" />
            </Framed>
          </Screen>
          <Screen
            title="운영 관리"
            breadcrumb="운영 관리 › 9기"
            count="223명"
            toolbar={ROSTER_TOOLBAR}
            label="후 · 2쪽을 누른 직후"
            tone="good"
          >
            <Framed>
              <div {...staleProps(true)}>
                <DataTable cols={ROSTER_COLS} rows={rosterRows.slice(0, 5)} />
                <div className="px-3 pb-3">
                  <Footer range="1–10 / 223명" pages={4} current={2} />
                </div>
              </div>
            </Framed>
          </Screen>
        </Pair>
        <Measured
          items={[
            ['전', '행 10 → 0 · 869 → 808px', 'bad'],
            ['후', '행 10 유지 · 869px 그대로'],
          ]}
        />
      </Case>

      <Case
        title="직접 눌러 보세요 — 갱신 중 / 도착 후"
        note="값이 옛 것인 동안 opacity-60 + aria-busy가 붙는다. 숨기지도 않고 자리를 뺏지도 않는다."
      >
        <div className="mb-3 flex items-center gap-2">
          <Button size="sm" variant={stale ? 'primary' : 'ghost'} onClick={() => setStale(true)}>
            갱신 중
          </Button>
          <Button size="sm" variant={stale ? 'ghost' : 'primary'} onClick={() => setStale(false)}>
            도착 후
          </Button>
        </div>
        <Screen
          title="프로젝트"
          breadcrumb="프로젝트 › 9기"
          count="총 7개"
          breakdown={<span className="text-fg-subtle">9기 전체 · 9반 208명</span>}
          action={<Button>+ 프로젝트 생성</Button>}
          toolbar={PROJECT_TOOLBAR}
        >
          <Framed>
            <div {...staleProps(stale)}>
              <DataTable cols={PROJECT_COLS} rows={projectRows} urgentAt={3} />
              <div className="px-3 pb-3">
                <Footer range="1–4 / 7개" />
              </div>
            </div>
          </Framed>
        </Screen>
      </Case>

      <Case
        title="푸터가 앞서 가지 않는다 — 이전 값 유지를 켜자 새로 생긴 문제"
        note="1쪽 열 줄을 보여주면서 «21–30»이라고 썼다. 쪽 번호가 바뀌는 시점과 그 쪽 데이터가 오는 시점이 다르기 때문이다. 범위는 응답이 알려준 쪽으로 세고, 페이저 하이라이트만 누른 쪽을 따른다."
      >
        <div className="mb-3 flex items-center gap-2">
          <span className="text-fg-subtle text-xs">누른 쪽:</span>
          {[1, 2, 3, 4].map((n) => (
            <Button
              key={n}
              size="sm"
              variant={page === n ? 'primary' : 'ghost'}
              onClick={() => setPage(n)}
            >
              {n}
            </Button>
          ))}
        </div>
        <Pair wide>
          <Screen title="운영 관리" count="223명" label="전 · 데이터와 어긋난다" tone="bad">
            <Framed>
              <div {...staleProps(true)}>
                <DataTable cols={ROSTER_COLS} rows={rosterRows.slice(0, 3)} />
                <div className="px-3 pb-3">
                  <Footer
                    range={`${(page - 1) * 10 + 1}–${page * 10} / 223명`}
                    pages={4}
                    current={page}
                  />
                </div>
              </div>
            </Framed>
          </Screen>
          <Screen title="운영 관리" count="223명" label="후 · 보이는 것을 설명한다" tone="good">
            <Framed>
              <div {...staleProps(true)}>
                <DataTable cols={ROSTER_COLS} rows={rosterRows.slice(0, 3)} />
                <div className="px-3 pb-3">
                  <Footer range="1–10 / 223명" pages={4} current={page} />
                </div>
              </div>
            </Framed>
          </Screen>
        </Pair>
      </Case>

      <Case
        title="분석 — 로딩 중 툴바가 빈 목록으로 열렸다"
        note="열어도 아무것도 없는 컨트롤은 실패보다 나쁘다. 그리고 «전체 0반»이라고 썼다 — 모르는 것을 0으로 단언한 것이다(0과 없음은 다르다)."
      >
        <Pair>
          <Screen
            title="분석"
            breadcrumb="분석 › 9기 › 회차 흐름"
            toolbar={[
              '반별 / 팀',
              '반 전체 0반',
              '회차 1 – 1',
              '등록 0회',
              '정렬 · 최근 발행 회차 나쁜 순',
            ]}
            label="전"
            tone="bad"
          >
            <Loading label="분석 결과를 불러오는 중" />
          </Screen>
          <Screen
            title="분석"
            breadcrumb="분석 › 9기 › 회차 흐름"
            toolbar={['반별 / 팀', '반 전체', '회차 1 – 1', '정렬 · 최근 발행 회차 나쁜 순']}
            label="후 · 잠김 + 개수 없음"
            tone="good"
          >
            <Loading label="분석 결과를 불러오는 중" />
          </Screen>
        </Pair>
      </Case>

      <Case
        title="검색 디바운스"
        note="OP-03만 빠져 있었다. 운영 관리 6탭·슈퍼어드민은 이미 쓰고 있었다."
      >
        <Card className="p-4">
          <p className="text-fg-muted text-xs">
            «미니프로젝트» 6글자 타이핑 · <b className="text-danger font-semibold">전 요청 6건</b> →{' '}
            <b className="text-fg font-semibold">후 1건</b> · 한글은 자모가 조합되는 중에도 input이
            떠서 실제로는 더 나갔다
          </p>
        </Card>
      </Case>
    </>
  )
}

/* ═══ 3단계 — 「없는 것」 3종 ═════════════════════════════════ */

export function Step3() {
  return (
    <>
      <Case
        title="세 종류 — 질문 하나로 갈린다: 사용자가 지금 할 일이 있나"
        note="Empty 기본값이 점선이라 전에는 셋이 전부 점선이었다. 화면이 «기다리면 채워집니다»라고 잘못 말하는 중이었다 — 운영 관리 열 곳이 그랬다."
      >
        <div className="grid gap-4 xl:grid-cols-3">
          <Screen
            title="프로젝트 상세"
            breadcrumb="프로젝트 › 9기 › 현황"
            label="pending · 아직 — 기다리면 채워진다"
          >
            <Empty variant="pending">
              <EmptyHeader>
                <EmptyTitle>아직 제출한 학생이 없습니다</EmptyTitle>
                <EmptyDescription>
                  제출이 시작되면 반별 진행이 여기에 쌓입니다. 제출 마감은 8월 18일입니다.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </Screen>
          <Screen
            title="프로젝트"
            breadcrumb="프로젝트 › 9기"
            action={<Button>+ 프로젝트 생성</Button>}
            label="empty · 없음 — 만들면 채워진다"
          >
            <Empty variant="empty">
              <EmptyHeader>
                <EmptyTitle>아직 프로젝트가 없습니다</EmptyTitle>
                <EmptyDescription>
                  회차를 만들고 교안을 연결하면 검증 개념 3건을 고를 수 있습니다.
                </EmptyDescription>
              </EmptyHeader>
              <Button>+ 프로젝트 생성</Button>
            </Empty>
          </Screen>
          <Screen title="운영 관리" breadcrumb="운영 관리 › 9기" label="failed · 실패 — 다시 시도">
            <ErrorState error={err(500)} subject="명단" onRetry={() => {}} />
          </Screen>
        </div>
      </Case>

      <Case
        title="같은 화면, 같은 0건 — 그런데 이유가 다르다"
        note="빈 결과가 «필터에 안 걸림»인지 «아직 없음»인지에 따라 문구도 행동도 갈린다. 이건 이미 잘 돼 있던 것이라 손대지 않았다 — 테두리만 실선으로 맞췄다."
      >
        <Pair>
          <Screen
            title="운영 관리"
            breadcrumb="운영 관리 › 9기"
            count="223명"
            toolbar={['"존재하지않는이름"', '반 · 전체', '계정 · 전체', '정렬 · 이름순']}
            label="필터에 안 걸림 — 풀면 된다"
          >
            <Empty variant="empty">
              <EmptyHeader>
                <EmptyTitle>&quot;존재하지않는이름&quot;와 맞는 사람이 없습니다</EmptyTitle>
                <EmptyDescription>9기 223명에서 찾았습니다.</EmptyDescription>
              </EmptyHeader>
              <Ghost>필터 해제</Ghost>
            </Empty>
          </Screen>
          <Screen
            title="운영 관리"
            breadcrumb="운영 관리 › 10기"
            count="0명"
            toolbar={ROSTER_TOOLBAR}
            label="아직 없음 — 등록하면 된다"
          >
            <Empty variant="empty">
              <EmptyHeader>
                <EmptyTitle>아직 등록된 교육생이 없습니다</EmptyTitle>
                <EmptyDescription>
                  CSV로 한 번에 넣거나 직접 입력할 수 있습니다. 등록과 동시에 활성화 초대가
                  나갑니다.
                </EmptyDescription>
              </EmptyHeader>
              <Button>+ 명단 추가</Button>
            </Empty>
          </Screen>
        </Pair>
      </Case>

      <Case
        title="한 자리가 두 뜻일 때 — 분석 · 기수 간 비교"
        note="문구가 이미 갈라 놓은 것을 테두리가 도로 뭉개지 않게, variant도 조건부다."
      >
        <Pair>
          <Screen
            title="분석"
            breadcrumb="분석 › 9기 › 기수 간 비교"
            toolbar={['비교 · 없음', '같은 교안 · 같은 개념만']}
            label="고를 기수가 있다 → 실선"
          >
            <Empty variant="empty">
              <EmptyHeader>
                <EmptyTitle>견줄 기수를 골라 주세요</EmptyTitle>
                <EmptyDescription>
                  같은 교안을 쓴 기수와 같은 개념끼리 맞대어 봅니다.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </Screen>
          <Screen
            title="분석"
            breadcrumb="분석 › 1기 › 기수 간 비교"
            toolbar={['같은 교안 · 같은 개념만']}
            label="첫 기수다 → 점선(기다려야 한다)"
          >
            <Empty variant="pending">
              <EmptyHeader>
                <EmptyTitle>비교할 기수가 없습니다</EmptyTitle>
                <EmptyDescription>
                  1기가 이 기관의 첫 기수예요. 다음 기수가 같은 교안으로 진행되면 같은 개념끼리
                  비교할 수 있습니다.
                </EmptyDescription>
              </EmptyHeader>
              <Ghost>회차 흐름에서 기수 안의 변화 보기</Ghost>
            </Empty>
          </Screen>
        </Pair>
      </Case>

      <Case
        title="0건이 좋은 소식인 자리 — 리포트"
        note="같은 실선이어도 문구가 갈린다. 0건이 조치 대상인지 좋은 소식인지는 화면이 말해야 한다."
      >
        <Screen title="리포트" breadcrumb="리포트 › 9기 › 반 · 집단 미달">
          <Empty variant="empty">
            <EmptyHeader>
              <EmptyTitle>반 절반 이상이 미달한 회차가 없습니다</EmptyTitle>
              <EmptyDescription>위험 판정이 모두 개인 사유로 남았습니다.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </Screen>
      </Case>
    </>
  )
}

/* ═══ 4단계 — 첫 진입은 스켈레톤 ═════════════════════════════ */

export function Step4() {
  return (
    <>
      <Case
        title="명단 첫 진입 — 스피너 vs 스켈레톤"
        note="스피너는 «기다려»만 말하고 스켈레톤은 «이런 것이 올 것이다»까지 말한다. 차이는 높이에서 난다 — 스피너 자리(py-16)와 표 높이가 달라 도착 순간 본문이 튄다."
      >
        <Pair>
          <Screen
            title="운영 관리"
            breadcrumb="운영 관리 › 9기"
            toolbar={ROSTER_TOOLBAR}
            label="전 · 스피너"
            tone="bad"
          >
            <Framed>
              <Loading label="명단을 불러오는 중" />
            </Framed>
          </Screen>
          <Screen
            title="운영 관리"
            breadcrumb="운영 관리 › 9기"
            toolbar={ROSTER_TOOLBAR}
            label="후 · 스켈레톤"
            tone="good"
          >
            <Framed>
              <TableSkeleton rows={5} cols={rosterCols} />
            </Framed>
          </Screen>
        </Pair>
        <Measured
          items={[
            ['스피너 → 표', '61px 점프', 'bad'],
            ['스켈레톤 → 표', '9px'],
          ]}
        />
      </Case>

      <Case
        title="스켈레톤 → 실제 — 같은 자리에 같은 폭으로 온다"
        note="행 수는 그 화면의 페이지 크기와 맞춘다. 10행짜리 목록에 3행을 그리면 도착할 때 또 점프해서 스켈레톤을 쓰는 이유가 없어진다. 높이도 눈대중이 아니라 실제 표에서 잰 값(헤더 38.5px · 본문 53px)이다 — 처음엔 눈대중이라 133px이 어긋났다."
      >
        <Pair wide>
          <Screen title="운영 관리" count="223명" toolbar={ROSTER_TOOLBAR} label="0.0초">
            <Framed>
              <TableSkeleton rows={10} cols={rosterCols} />
            </Framed>
          </Screen>
          <Screen title="운영 관리" count="223명" toolbar={ROSTER_TOOLBAR} label="도착">
            <Framed>
              <DataTable cols={ROSTER_COLS} rows={rosterRows} />
              <div className="px-3 pb-3">
                <Footer range="1–10 / 223명" pages={4} current={1} />
              </div>
            </Framed>
          </Screen>
        </Pair>
      </Case>

      <Case
        title="프로젝트 목록도 같다 — 열 폭을 그대로 넘긴다"
        note="화면이 이미 갖고 있는 폭 토큰(w-[200px] · w-[108px] …)을 스켈레톤에 그대로 넘긴다. 컬럼 정의를 새로 추상화하지 않는 이유다 — 이 레포는 표를 각 화면이 직접 쓴다."
      >
        <Pair wide>
          <Screen
            title="프로젝트"
            breadcrumb="프로젝트 › 9기"
            action={<Button>+ 프로젝트 생성</Button>}
            toolbar={PROJECT_TOOLBAR}
            label="첫 진입"
          >
            <Framed>
              <TableSkeleton rows={4} cols={projectCols} />
            </Framed>
          </Screen>
          <Screen
            title="프로젝트"
            breadcrumb="프로젝트 › 9기"
            count="총 7개"
            action={<Button>+ 프로젝트 생성</Button>}
            toolbar={PROJECT_TOOLBAR}
            label="도착"
          >
            <Framed>
              <DataTable cols={PROJECT_COLS} rows={projectRows} urgentAt={3} />
              <div className="px-3 pb-3">
                <Footer range="1–4 / 7개" />
              </div>
            </Framed>
          </Screen>
        </Pair>
      </Case>

      <Case
        title="매니저 탭 — 열이 다르면 스켈레톤도 다르다"
        note="같은 컴포넌트에 그 화면의 열 폭만 넘긴다."
      >
        <Pair wide>
          <Screen title="운영 관리" breadcrumb="운영 관리 › 9기 › 매니저" label="첫 진입">
            <Framed>
              <TableSkeleton rows={3} cols={MANAGER_COLS.map((c) => c.w)} />
            </Framed>
          </Screen>
          <Screen title="운영 관리" breadcrumb="운영 관리 › 9기 › 매니저" count="3명" label="도착">
            <Framed>
              <DataTable cols={MANAGER_COLS} rows={MANAGERS.map(managerCells)} />
              <div className="px-3 pb-3">
                <Footer range="1–3 / 3명" />
              </div>
            </Framed>
          </Screen>
        </Pair>
      </Case>

      <Case
        title="스피너가 남는 자리 — 모양을 모르는 것"
        note="응답에 따라 구조가 갈리는 것(모달 안 목록·비용 매트릭스)은 그릴 모양을 미리 알 수 없다. 거기서만 스피너를 쓴다."
      >
        <Pair>
          <Screen title="운영 관리" breadcrumb="운영 관리 › 9기 › 비용" label="비용 매트릭스">
            <Framed>
              <Loading label="비용을 불러오는 중" />
            </Framed>
          </Screen>
          <div>
            <p className="text-fg-subtle mb-1.5 text-2xs font-medium">모달 안 목록</p>
            <Card className="mx-auto max-w-md p-5">
              <p className="mb-1 text-sm font-bold">담당 반</p>
              <p className="text-fg-subtle mb-3 text-xs">이 매니저가 맡을 반을 고릅니다.</p>
              <Loading label="반을 불러오는 중" />
              <div className="mt-3 flex justify-end gap-2">
                <Ghost>취소</Ghost>
                <Button size="sm" disabled>
                  저장
                </Button>
              </div>
            </Card>
          </div>
        </Pair>
      </Case>
    </>
  )
}

/* ═══ 5단계 — 규칙을 CI가 지킨다 ═════════════════════════════ */

export function Step5() {
  return (
    <>
      <Case
        title="현황 탭 — 꺼 둔 조회가 로딩으로 보이던 자리"
        note="isPending은 «데이터가 없다»는 뜻이라, enabled:false로 꺼 둔 조회는 요청이 나가지도 않았는데 영원히 참이다. 현황 탭은 검증 개념 3건이 정해져야 조회하는데, 가드 순서가 우연히 막아주고 있었을 뿐이다 — 순서를 바꾸는 순간 끝나지 않는 스피너가 된다."
      >
        <Pair>
          <Screen
            title="미니프로젝트 7차"
            breadcrumb="프로젝트 › 9기 › 현황"
            label="전 · 개념 미확정인데 조회가 꺼져 있다"
            tone="bad"
          >
            <Framed>
              <Loading label="현황을 불러오는 중" />
            </Framed>
          </Screen>
          <Screen
            title="미니프로젝트 7차"
            breadcrumb="프로젝트 › 9기 › 현황"
            label="후 · 왜 비었는지를 말한다"
            tone="good"
          >
            <Empty variant="empty">
              <EmptyHeader>
                <EmptyTitle>아직 집계할 것이 없습니다</EmptyTitle>
                <EmptyDescription>
                  검증 개념 3건이 정해져야 학생에게 낼 문항이 만들어지고, 그때부터 제출·분석·응시가
                  집계됩니다. 지금은 1건입니다.
                </EmptyDescription>
              </EmptyHeader>
              <Button>구성 탭에서 개념 정하기</Button>
            </Empty>
          </Screen>
        </Pair>
      </Case>

      <Case
        title="쓰기의 isPending은 그대로 둔다"
        note="useMutation에서는 «요청이 떠 있다»가 맞는 뜻이다. 저장 버튼이 자기 대기를 보여주는 자리 — 여기까지 바꾸면 오히려 틀린다. 그래서 스캐너도 조회 분기 모양만 잡는다."
      >
        <Card className="mx-auto max-w-lg p-5">
          <p className="mb-1 text-sm font-bold">검증 개념 고르기</p>
          <p className="text-fg-subtle mb-4 text-xs">3건이 정해지면 문항이 만들어집니다.</p>
          <div className="mb-4 flex flex-col gap-2">
            {['테스트 경계와 대역 설계', '트랜잭션 경계', '예외 변환과 응답 매핑'].map((c) => (
              <div
                key={c}
                className="border-primary bg-primary-soft flex items-center gap-2 rounded-md border px-3 py-2 text-xs"
              >
                <span className="bg-primary size-3.5 rounded-[3px]" />
                {c}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" disabled>
              취소
            </Button>
            <Button disabled>
              <Spinner className="size-3.5" />
              저장
            </Button>
          </div>
        </Card>
      </Case>

      <Case
        title="문서는 지켜지지 않는다 — CI가 지킨다"
        note="npm run check:async. 되돌아가면 아픈 두 가지만 막는다. 규칙을 일부러 되돌려 보고 둘 다 정확한 파일:줄과 함께 걸리는 것을 확인했다 — 안 걸리는 규칙은 없느니만 못하다."
      >
        <Card className="p-4">
          <pre className="text-danger overflow-x-auto text-xs leading-relaxed">
            {`✗ 조회 분기에 isPending을 썼습니다
    isPending은 "데이터가 없다"이지 "불러오는 중"이 아닙니다 …
    src/features/operator/report/ReportScreen.tsx:149  {report.isPending ? (

✗ <Empty>에 variant가 없습니다
    기본값이 pending(점선)이라 "기다리면 채워집니다"라고 말하게 됩니다 …
    src/features/operator/dashboard/DashboardScreen.tsx:67  <Empty>`}
          </pre>
        </Card>
      </Case>
    </>
  )
}

/* ═══ 6단계 — 한 화면만 다른 길을 쓰지 않는다 ═════════════════ */

export function Step6() {
  return (
    <>
      <Case
        title="리포트만 다른 기수를 보고 있었다"
        note="이 화면만 상수 UUID(8기)를 들고 있었다. 헤더 스위처는 자리표시자(7기)를 그리고 본문은 8기를 말하는데, 정작 다른 화면은 9기를 보고 있었다 — 화면은 아무 경고도 안 낸다."
      >
        <Pair>
          <Screen title="리포트" breadcrumb="리포트 › 8기" label="전 · 셋이 서로 다르다" tone="bad">
            <Card className="gap-2 p-4">
              <p className="text-fg text-sm font-bold">리포트 · 8기</p>
              <p className="text-fg-subtle text-xs">
                2026-03-05 미니프로젝트 전체 6회 완료 시점으로 고정
              </p>
              <p className="text-danger mt-2 text-2xs">
                헤더 스위처 <b>7기</b> · 본문 <b>8기</b> · 다른 화면 <b>9기</b>
              </p>
            </Card>
          </Screen>
          <Screen title="리포트" breadcrumb="리포트 › 9기" label="후 · 전부 같은 기수" tone="good">
            <Card className="gap-2 p-4">
              <p className="text-fg text-sm font-bold">리포트 · 9기</p>
              <p className="text-fg-subtle text-xs">미니프로젝트 4 / 6회 진행 중 · 아직 확정 전</p>
              <p className="text-primary mt-2 text-2xs">
                헤더 스위처 <b>9기</b> · 본문 <b>9기</b> · 다른 화면 <b>9기</b>
              </p>
            </Card>
          </Screen>
        </Pair>
      </Case>

      <Case
        title="생성물의 아래층만 쓰고 있었다"
        note="생성기는 호출 함수와 조회 훅 두 층을 만든다. 다른 화면은 훅을 쓰는데 리포트만 호출 함수를 로컬 useAsync로 감쌌다 — 층 하나를 건너뛴 것이라 이 화면만 캐시·무효화·isFetching이 없었다."
      >
        <Card className="p-4">
          <pre className="text-fg-muted overflow-x-auto text-xs leading-relaxed">
            {`전  OP-01~04·06   화면 → 생성 훅(useFindX)           → react-query
    OP-05         화면 → 로컬 useAsync → 생성 호출함수  → react-query 밖

후  전부          화면 → 생성 훅(useFindX)           → react-query`}
          </pre>
        </Card>
        <Measured
          items={[
            ['리포트 → 프로젝트 → 리포트 재요청', '0건 (캐시)'],
            ['지운 파일', 'report/_/useAsync.ts · report/_/cohortScope.ts'],
          ]}
        />
      </Case>

      <Case
        title="남은 것 — 기수 스위처"
        note="스코프는 지금 «진행 중인 기수»를 서버가 고른다. 표준(§5)은 «URL이 갖는다»인데, 주소만 바꾸고 헤더 스위처가 없으면 사용자에게 바꿀 수단이 없어진다 — 둘은 같이 가야 한다."
      >
        <Screen title="리포트" breadcrumb="리포트 › 9기">
          <Empty variant="pending">
            <EmptyHeader>
              <EmptyTitle>기수 스위처가 붙을 때 함께 한다</EmptyTitle>
              <EmptyDescription>
                shells/Header.tsx는 공용이라 IZ-frontend와 조율이 필요한 유일한 파일입니다.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </Screen>
      </Case>
    </>
  )
}
