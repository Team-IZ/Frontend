// ─────────────────────────────────────────────────────────────
// 대시보드 API 격리 모듈
// 백엔드 준비 시 각 함수의 Mock 블록만 삭제하고 아래 주석의 fetch를 켜면 됩니다.
// (화면·컴포넌트 코드는 수정 불필요 — 시그니처가 이미 실제 모양입니다)
// ─────────────────────────────────────────────────────────────
import type { ClassCompare, DashboardResponse, RoundPipeline, Todo, TodoKind } from './types'

// ───────── Mock 전용 (백엔드 연동 시 이 블록 삭제) ─────────
import {
  CLASSES,
  COHORT_TOTAL,
  ROUNDS,
  currentRound,
  latestPublishedRound,
} from '@/mocks/cohortRounds'
import {
  MOCK_TODAY,
  PIPELINE_NOT_STARTED,
  PIPELINE_RUNNING,
  TODOS,
  TODOS_BEFORE,
  TODOS_MULTI,
  TODOS_UNASSIGNED,
} from './mockDb'

const LATENCY_MS = 250

const delay = <T>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS))

/**
 * 목업 뷰포트를 실제로 열어보기 위한 스위치 — `?case=ok|pre|multi|assign|partial`.
 *
 * 케이스 표의 상태를 전부 그렸는지는 **눈으로 봐야** 판정된다(git-convention §7).
 * 목 데이터가 한 벌뿐이면 정상 케이스만 렌더되고 나머지는 코드로만 존재한다.
 * 이 함수는 mockDb와 함께 사라진다.
 */
type MockCase = 'dash' | 'ok' | 'pre' | 'multi' | 'assign' | 'partial'
const CASES: MockCase[] = ['dash', 'ok', 'pre', 'multi', 'assign', 'partial']
function mockCase(): MockCase {
  const q = new URLSearchParams(window.location.search).get('case')
  return CASES.find((c) => c === q) ?? 'dash'
}
// ──────────────────────────────────────────────────────────

/**
 * 오늘 날짜(`YYYY-MM-DD`). 마감까지 남은 일수를 셀 때 쓴다.
 *
 * **화면이 목 파일을 직접 열지 않게 하려고 여기 둔다** — 기준일을 얼리는 사정은 목의
 * 것이지 화면의 것이 아니다(mock-first §3-4).
 */
export function getToday(): string {
  // ===== Mock 버전 (현재 활성) =====
  return MOCK_TODAY
  // return new Date().toISOString().slice(0, 10)
}

/**
 * `GET /operator/dashboard?cohort={cohortId}`
 *
 * 네 블록을 한 번에 받는다(케이스 표). **블록마다 성공·실패가 갈리므로** 반 비교 하나가
 * 실패해도 나머지는 그대로 그린다(F2). 재시도는 전체 재조회다 — 블록 단위 엔드포인트가
 * 생기면 그때 나눈다.
 *
 * 비율·정렬·기준선은 **전부 서버가 판정한다**(api-boundary §1-②). 목에서도 그 자리에서
 * 계산해 둔다 — 화면에서 돌리면 연동이 재작성이 된다.
 */
export function getDashboard(cohortId: string): Promise<DashboardResponse> {
  // ===== Mock 버전 (현재 활성) =====
  void cohortId
  const view = mockCase()
  const current = view === 'pre' ? ROUNDS[4] : (currentRound() ?? ROUNDS[ROUNDS.length - 1])
  const basis = latestPublishedRound()

  const pipeline: RoundPipeline = {
    projectId: current.projectId,
    roundLabel: `미프 ${current.no}차`,
    roundNo: current.no,
    // 등록된 회차 수다. `8` 같은 상수를 쓰면 6회로 끝나는 기수에서 거짓이 된다(OP-02 §4-2)
    roundTotal: ROUNDS.length,
    ...(current.state === 'BEFORE' ? PIPELINE_NOT_STARTED : PIPELINE_RUNNING),
  }

  /*
    기준선 — 같은 회차의 기수 전체 비율. **반 값의 합에서 나온다**(`cohortRounds` 주석).
    이 값이 반 막대의 위/아래를 가르므로 목업의 별도 기수 행을 쓰면 색이 뒤집힌다.
  */
  const cohortCell = basis ? COHORT_TOTAL.cells.find((x) => x.round === basis.no) : undefined
  const ratio = (risky: number, graded: number) =>
    graded === 0 ? 0 : Math.round((risky / graded) * 100)

  const todos =
    view === 'ok'
      ? []
      : view === 'multi'
        ? TODOS_MULTI
        : view === 'assign'
          ? TODOS_UNASSIGNED
          : view === 'pre'
            ? TODOS_BEFORE
            : TODOS

  /*
    **담당 공백은 `조치 필요`가 단일 원천이다.** 막대 옆 `담당 없음`을 목 배열에서 따로
    읽으면 두 블록이 서로 반박한다 — `미배정 반이 모두 없습니다`라고 써놓고 막대에는
    `담당 없음`이 남는 상태를 실제로 만들었다(D1 — 한 데이터는 한 곳에서만).
    실제 API에서도 같은 응답 안의 두 필드이므로 서버가 이 일관성을 보장한다.
  */
  const unassigned = new Set(todos.flatMap((t) => (t.kind === 'UNASSIGNED' ? t.classNames : [])))

  const compare: ClassCompare = {
    basisRoundLabel: basis ? `미프 ${basis.no}차` : '',
    cohortRatio: cohortCell ? ratio(cohortCell.risky, cohortCell.graded) : 0,
    currentRoundLabel: pipeline.roundLabel,
    currentNotStarted: pipeline.notStarted,
    classes: CLASSES.map((c) => {
      const cell = basis ? c.cells.find((x) => x.round === basis.no) : undefined
      const risky = cell?.risky ?? 0
      const graded = cell?.graded ?? 0
      return {
        className: c.className,
        // 비율은 서버가 낸다. 화면은 이 값을 막대 폭으로 쓰기만 한다
        ratio: ratio(risky, graded),
        risky,
        graded,
        hasManager: !unassigned.has(c.className),
      }
    })
      /*
        **나쁜 순.** OP-02 기본 정렬(`최근 회차 나쁜 순`)의 근거가 *"OP-01에서 넘어왔을 때
        거기서 본 순서와 같아야 한다"* 인데, 목업은 여기가 이름순이라 넘어가면 순서가
        뒤집혔다. 그리고 이 블록의 질문이 *"어느 반이 처지나"* 라 값 순이 그 질문에 답한다.

        **A6을 어기지 않는다** — 금지된 것은 `1위·2위` 같은 **순위 숫자**이지 정렬이 아니다.
        같은 값이면 이름순으로 갈라 순서가 흔들리지 않게 한다.
      */
      .sort((a, b) => b.ratio - a.ratio || a.className.localeCompare(b.className)),
  }

  return delay({
    cohortLabel: '7기',
    trainees: COHORT_TOTAL.trainees,
    classes: COHORT_TOTAL.classes,
    pipeline: { ok: true, value: pipeline },
    // 부분 실패 — 반 비교만 못 가져온 상태(`#partial`)
    compare: view === 'partial' ? { ok: false } : { ok: true, value: compare },
    todos: { ok: true, value: sortTodos(todos) },
  })

  // ===== 실제 버전 (연동 시 위를 지우고 아래를 켠다) =====
  // return http<DashboardResponse>(`/operator/dashboard?cohort=${cohortId}`)
}

/**
 * 되돌리기 어려운 순서 — 미배정 → 개념 공백 → 집단 미달 → 면담 적체(OP-01 §3).
 *
 * **서버가 이 순서로 준다.** 목에서도 서버 자리에서 정렬해 둔다 — 화면이 정렬하면
 * 페이지가 나뉘는 순간 현재 페이지 안에서만 맞는 순서가 된다(api-boundary §1-②).
 * 순서가 곧 우선순위라 화면은 띠에 이유를 쓰지 않는다.
 */
function sortTodos(todos: Todo[]): Todo[] {
  const order: Record<TodoKind, number> = {
    UNASSIGNED: 0,
    CONCEPT_GAP: 1,
    GROUP_MISS: 2,
    INTERVIEW_BACKLOG: 3,
  }
  return [...todos].sort((a, b) => order[a.kind] - order[b.kind])
}
