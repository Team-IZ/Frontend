import type { Curriculum, ProjectStatus } from './types'

/*
  기획이 정한 규칙과, 그 규칙에서 나오는 표시값.

  **서버도 같은 규칙을 검증한다.** 클라이언트 검증만 있으면 우회되므로, 여기 있는
  값이 바뀌면 백엔드와 같이 바꾼다(`docs/dev/api/api-boundary.md` §1-④).
  목 데이터가 아니므로 **연동해도 이 파일은 남는다.**
*/

/**
 * 검증 개념은 **3건 고정**이다(14번 Tier1-4).
 *
 * 이 3건이 그 회차 모든 학생의 문항 3개가 되고, 반·팀·개인이 달라도 같은 3건이라
 * **유일한 비교 축**이 된다. 미만이면 문항을 만들 수 없고, 초과하면 축이 어긋난다.
 */
export const CONCEPT_COUNT = 3

/**
 * 이 교안을 회차에 붙일 수 있나 — **분석이 끝난 것만** 고를 수 있다.
 *
 * ─── 왜 이 판정이 필요한가 ──────────────────────────────────────
 * 검증 개념은 교안 분석 결과(가르친 항목)에서 나온다. 분석 전 교안을 고르면
 * 후보 조회(`GET /curricula/{id}/sections`)가 **409 `CURRICULUM_ANALYSIS_NOT_COMPLETED`**
 * 로 떨어져 개념을 못 고르고, 그러면 회차 생성이 그 자리에서 막힌다.
 *
 * ⚠ 전에는 `pageCount == null`로 **추측**했다. 서버가 상태를 안 줘서 쪽수 유무로
 * 대신 판정한 것인데, 「쪽수를 아직 모른다」와 「분석 중」은 다른 말이고 **실패한 교안과도
 * 구분이 안 됐다**(18차 R2로 요청해 `analysisStatus`를 받았다).
 *
 * @returns 못 고르는 이유. 고를 수 있으면 `null`
 */
export function curriculumBlockedReason(
  c: Pick<Curriculum, 'analysisStatus' | 'teachesCount'>,
): string | null {
  /*
    `null`(분석 전)과 `FAILED`(분석 실패)를 갈라 쓴다 — **전자는 기다리면 되고 후자는
    다시 올려야 한다.** 한 문구로 접으면 사용자가 무엇을 해야 하는지 모른다.
  */
  if (c.analysisStatus === null) return '분석 전'
  if (c.analysisStatus === 'FAILED') return '분석 실패 · 다시 올려 주세요'
  if (c.analysisStatus !== 'SUCCEEDED') return '분석 중 · 끝나면 고를 수 있음'
  /*
    분석은 됐는데 가르친 항목이 3건 미만이면 이 교안만으로는 개념을 채울 수 없다.
    **막지는 않는다** — 다른 교안과 같이 고르면 3건이 된다. 사실만 알린다.
  */
  return null
}

/**
 * 고를 수 있는 것과 없는 것으로 가른다 — **순서가 아니라 두 무리다.**
 *
 * ─── 왜 서버에서 안 거르나 ──────────────────────────────────────
 * `analysisStatus`가 이미 응답에 있어 **거르는 것은 여기서 공짜**다. 서버에
 * `?analysisStatus=SUCCEEDED` 같은 필터를 만들면 왕복만 하나 늘어나는데, 이 지연은
 * 왕복 수가 지배한다(응답 3,502B와 488B의 TTFB가 같았다 — 22차 R3).
 *
 * **그리고 숨기면 안 된다.** `FAILED`는 *다시 올려야 하는* 상태이고 `PENDING`은
 * *방금 올린* 것이다 — 목록에서 사라지면 「업로드가 실패했나」가 되고, 못 고르는 이유를
 * 물어볼 자리가 없어진다. OP-02가 비교 불가한 기수를 같은 이유로 목록에 남긴다.
 *
 * 그래서 **감추지 않고 접는다** — 위에는 고를 수 있는 것만, 아래는 열어서 본다.
 */
export function splitByAvailability<T extends Pick<Curriculum, 'analysisStatus' | 'teachesCount'>>(
  curricula: readonly T[],
): { ready: T[]; blocked: T[] } {
  const ready: T[] = []
  const blocked: T[] = []
  for (const c of curricula) (curriculumBlockedReason(c) ? blocked : ready).push(c)
  return { ready, blocked }
}

/** 이 교안 하나로 검증 개념 3건을 채울 수 있나. 막는 판정이 아니라 **알리는** 값이다 */
export function coversConceptQuota(c: Pick<Curriculum, 'teachesCount'>): boolean {
  return c.teachesCount >= CONCEPT_COUNT
}

/**
 * 검증 개념이 확정됐나 — **문항이 만들어졌나**와 같은 말이다(OP-04 §6).
 *
 * 3건이 정해져야 학생에게 낼 문항 3개가 만들어지고, 그때부터 현황이 집계된다.
 * **탭을 잠그는 데 쓰지 않는다** — 잠긴 탭은 왜 잠겼는지도 어떻게 열리는지도 말하지
 * 못한다(C1). 현황 탭이 이 값으로 **자기가 왜 비었는지**를 쓴다.
 */
export function conceptsFixed(conceptCount: number): boolean {
  return conceptCount === CONCEPT_COUNT
}

/**
 * 개념 하나를 켜고 끈다. **3건을 넘기면 아무 일도 일어나지 않는다** — 저장 시점에
 * 막으면 무엇을 빼야 할지 모르므로 애초에 안 켜진다.
 *
 * 생성(OP-03)과 변경(OP-04)이 같은 규칙을 쓴다 — 각자 구현하면 상한이 바뀔 때
 * 한쪽만 고쳐진다.
 */
export function toggleConcept(picked: string[], teachId: string): string[] {
  if (picked.includes(teachId)) return picked.filter((x) => x !== teachId)
  if (picked.length >= CONCEPT_COUNT) return picked
  return [...picked, teachId]
}

/**
 * 이 교안을 해제할 수 있나 — **확정된 개념이 하나라도 이 교안에서 나왔으면 못 뺀다**(OP-04 §5).
 *
 * 출처가 끊긴 개념은 교안 위치를 가리킬 수 없다. 해제하려면 **그 개념부터 바꿔야 한다** —
 * 순서가 반대면 3건이 조용히 2건이 되고, **학생에게 낼 문항이 사라진다**(`conceptsFixed`).
 *
 * **생성(OP-03)은 이 규칙을 쓰지 않는다** — 아래 `dropOrphanConcepts`를 본다.
 */
export function canUnlinkCurriculum(
  concepts: { curriculumVersionId: string | null }[],
  curriculumVersionId: string,
): boolean {
  return !concepts.some((c) => c.curriculumVersionId === curriculumVersionId)
}

/**
 * 교안을 빼면 그 교안에서 고른 개념도 같이 빠진다 — **생성 전용이다.**
 *
 * 확정된 회차(OP-04)는 위 `canUnlinkCurriculum`으로 **막는다.** 여기서 드롭이 맞는 이유는
 * 아직 저장 전이고, 빠지는 것이 고르는 화면에 그 자리에서 보이기 때문이다(`지금 2건`).
 * 확정된 상태에서 같은 일이 일어나면 사용자는 교안만 건드렸는데 화면이 되돌아간다.
 */
export function dropOrphanConcepts(
  picked: string[],
  candidates: { mappingId: string; curriculumVersionId: string }[],
  keptVersionIds: string[],
): string[] {
  const alive = new Set(
    candidates
      .filter((c) => keptVersionIds.includes(c.curriculumVersionId))
      .map((c) => c.mappingId),
  )
  return picked.filter((id) => alive.has(id))
}

/**
 * 요구사항을 목록에 더한다 — **항목 하나가 판정 단위다**(14번 6-3 · MG-08).
 *
 * 매니저 화면이 항목마다 `✓`/`✗`와 이유를 붙이므로(MG-08 `✓ 2 · ✗ 1`) 요구사항은
 * 문장 덩어리가 아니라 **항목의 목록**이다. 그래서 저장 모양도 배열이다.
 *
 * 규칙 셋. 셋 다 **입력 시점에** 적용해서, 저장된 것과 화면에 보이는 것이 같게 한다.
 *   · 앞뒤 공백을 버린다
 *   · **빈 항목은 안 들어간다** — 판정할 대상이 없다
 *   · **같은 항목은 두 번 안 들어간다** — 같은 것을 두 번 판정하면 `✓ 2 · ✗ 1`의
 *     분모가 부풀고, 매니저가 서로 다른 두 항목이라고 읽는다
 *
 * 여러 줄을 한 번에 받는다(`text`에 개행이 있으면 나눈다). 오퍼레이터가 과제 문서에서
 * 통째로 붙여 넣는 것이 실제 동선이라, 그때 한 덩어리가 되면 항목이 아니게 된다.
 */
export function addRequirements(list: string[], text: string): string[] {
  const next = [...list]
  for (const line of text.split('\n')) {
    const v = line.trim()
    if (v && !next.includes(v)) next.push(v)
  }
  return next
}

/*
  ─── 회차 상태별로 무엇을 할 수 있나 ──────────────────────────────

  **한 곳에 모은다.** 화면마다 `status === 'RUNNING'`을 쓰면 상태가 하나 늘 때 어디를
  고쳐야 하는지 모르고, 버튼과 모달이 서로 다른 조건을 갖게 된다(버튼은 막혔는데 URL로
  모달이 열리는 식).

  가르는 기준은 **학생 데이터가 이미 붙었나** 하나다.

    PREP·READY   아직 아무도 안 냈다 → 전부 바꿀 수 있다
    RUNNING      제출·분석·응시가 돈다 → 측정 기준을 바꾸면 학생마다 다른 시험이 된다
    DONE         리포트까지 나갔다 → 과거를 바꾸면 리포트와 화면이 다른 말을 한다
*/

/** 학생이 이미 냈거나 결과가 나왔나 — 아래 판정들의 공통 축 */
function hasStudentData(status: ProjectStatus): boolean {
  return status === 'RUNNING' || status === 'DONE'
}

/**
 * 교안·검증 개념·요구사항을 바꿀 수 있나.
 *
 * **응시가 시작되면 막는다.** 먼저 본 학생과 나중 학생이 다른 문항을 받으면 그 회차는
 * 비교 축이 아니게 된다(OP-04 §5 — 검증 개념 3건이 유일한 비교 축이다). 요구사항도
 * 같다 — 구현 P/F 판정 기준이라 이미 판정된 팀과 기준이 갈린다(MG-08).
 */
export function canEditConfig(status: ProjectStatus): boolean {
  return !hasStudentData(status)
}

/**
 * 일정을 바꿀 수 있나. **진행 중에도 연다** — 아래 `canOnlyExtendDue`와 함께 읽는다.
 *
 * 장애·공지 지연으로 마감을 미루는 것은 실무에 있다. 전부 막으면 그 수단이 없어져
 * 회차를 다시 만들게 된다. 끝난 회차는 미룰 대상이 없다.
 */
export function canEditSchedule(status: ProjectStatus): boolean {
  return status !== 'DONE'
}

/**
 * 마감을 **미루는 것만** 되나 — 진행 중이면 그렇다.
 *
 * **당기는 것을 막는 이유:** 학생은 이미 "언제까지"를 알고 있다. 그것을 앞당기면
 * 낼 수 있다고 알고 있던 기회가 **조용히** 사라진다(되돌릴 수 없는 마감 — B1).
 * 시작일도 이미 지났으므로 바꿀 대상이 아니다.
 */
export function canOnlyExtendDue(status: ProjectStatus): boolean {
  return status === 'RUNNING'
}

/**
 * 회차를 지울 수 있나.
 *
 * **학생 데이터가 붙으면 못 지운다.** 제출·분석·응시·리포트가 그 회차에 매달려 있어서,
 * 지우면 학생이 실제로 한 일이 같이 사라진다. 끝난 회차는 **기록**이다.
 */
export function canDelete(status: ProjectStatus): boolean {
  return !hasStudentData(status)
}

/** 왜 막혔는지 — 흐린 버튼만 두면 이유를 모른다(C1). 상태 이름이 아니라 **사유**를 쓴다 */
export function lockedReason(status: ProjectStatus): string | null {
  if (status === 'RUNNING') return '응시가 시작돼 바꿀 수 없습니다'
  if (status === 'DONE') return '종료된 프로젝트라 바꿀 수 없습니다'
  return null
}

/** 생성 가능한 상태인지 — 교안 1개 이상 + 개념 정확히 3건 */
export function canCreate(curriculumIds: string[], conceptIds: string[]): boolean {
  return curriculumIds.length > 0 && conceptIds.length === CONCEPT_COUNT
}

/*
  ⚠ 이 숫자는 기획에 없다 — 프론트가 정한 값이다.

  목록의 유일한 경고가 **마감 임박 + 준비 중** 조합인데(목업 doc-head) 임박의 정의가
  어느 문서에도 없다. 목업은 `5일 남음`을 붉게, `72일 남음`을 회색으로 그려 경계가
  그 사이라는 것만 말한다.

  일주일을 고른 이유는 **다음 주에 시작할 회차를 이번 주에 준비한다**는 것뿐이다.
  01-design-checklist E8(화면이 기준을 만들지 않는다)의 경계에 있으므로, 기획에서
  값이 나오면 여기만 바꾼다. 상세는 api-boundary §2-2.
*/
export const DUE_SOON_DAYS = 7

const DAY_MS = 86_400_000

/*
  ⚠ **마감 시각을 화면이 정하지 않는다** — 입력 자체를 뺐다.

  한때 `DEFAULT_DUE_TIME = '23:59'`을 붙여 `07-21 23:59`을 마감이라고 썼는데,
  **서버가 그 시각을 뒷받침하지 않는다.** `project.end_date`는 `DATE`이고 학생에게
  나가는 실제 마감(`project_assessment_round.submission_due_at`)은 다른 테이블이며
  두 값이 연결돼 있지 않다(9차 회신 §15).

  그대로 두면 일정을 수정하는 순간 **화면이 말한 마감과 실제 마감이 갈린다.** 되돌릴 수
  없는 값이고 학생 화면에도 나가므로, 모르는 것을 아는 척하지 않고 **날짜만 다룬다.**
  결론(ⓐ 서버가 파생 · ⓑ 운영자 입력 · ⓒ `submissionDueAt`만 표시)이 나오면 되살린다.
*/

/** 로컬 날짜를 `YYYY-MM-DD`로. `toISOString()`은 UTC로 밀려 하루가 어긋난다 */
export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const pad = (n: number) => String(n).padStart(2, '0')

export type DueLabel = {
  text: string
  /** 마감이 지났다 */
  overdue: boolean
  /** 마감이 임박했다 — 위 상수 기준 */
  urgent: boolean
}

/**
 * 마감까지 남은 일수. 목업이 `5일 남음` · `72일 남음` · `지남`으로 쓴다.
 *
 * **서버는 마감 시각만 주고 남은 일수는 화면이 센다.** 응답에 `daysLeft`를 넣으면
 * 그 응답이 캐시되는 순간 틀리기 때문이다(api-boundary §2-3).
 *
 * 날짜만 보고 세므로(시각 무시) `오늘 18:00 마감`은 `0일 남음`이지 `지남`이 아니다 —
 * 마감 시각 전인데 지났다고 쓰면 거짓말이 된다.
 *
 * @param now 기준 시각. 목 단계에서는 목업 기준일을 넣어 값을 고정한다
 */
export function dueLabel(dueAt: string | null, now: string): DueLabel | null {
  if (!dueAt) return null
  const days = Math.round((dateOnly(dueAt) - dateOnly(now)) / DAY_MS)
  if (Number.isNaN(days)) return null
  return days < 0
    ? { text: '지남', overdue: true, urgent: false }
    : { text: `${days}일 남음`, overdue: false, urgent: days <= DUE_SOON_DAYS }
}

/** 날짜 부분만 남긴 밀리초. 시각·타임존이 섞이면 하루 차이가 들쭉날쭉해진다 */
function dateOnly(iso: string): number {
  return new Date(iso.slice(0, 10)).getTime()
}

/**
 * 고른 두 날짜를 저장 형식(`YYYY-MM-DD`)으로. 하나라도 없으면 `null` — 저장 가능
 * 여부 판정이 이 반환값 하나로 끝난다.
 *
 * **같은 날은 허용한다.** 하루짜리 회차가 실제로 있고, 시각이 없으므로 `시작 = 마감`을
 * 막을 근거가 없다. `시작 > 마감`은 달력이 서로를 막아 애초에 안 만들어지지만 서버도
 * 검증하므로 여기서도 본다.
 */
export function toSchedule(startAt: Date | undefined, dueAt: Date | undefined) {
  if (!startAt || !dueAt) return null
  const startDate = toIsoDate(startAt)
  const endDate = toIsoDate(dueAt)
  if (endDate < startDate) return null
  return { startDate, endDate }
}

/**
 * 표시용 `2026-07-21`. 저장·전송은 `YYYY-MM-DD` 그대로다.
 *
 * ⚠ **연도를 자르지 않는다.** `07-21`만 쓰면 **어느 해 7월인지 알 수 없다** — 기수는
 * 해를 넘겨 이어지고 종료 회차는 몇 달 전 것이라, 목록·상세·타임라인이 전부 연도 없이
 * 같은 `07-21`을 말하고 있었다.
 *
 * ⚠ **시각은 아직 못 쓴다.** 서버 컬럼이 `DATE`라 마감 시각이 존재하지 않는다
 * (18차 R5 — `submissionDueAt`을 요청해 두었다). 없는 값을 `23:59`로 지어내지 않는다 —
 * 화면이 그렇게 말하면 학생은 그 시각까지 낼 수 있다고 믿는데 서버는 그 약속을 모른다.
 *
 * @param compact 목록 표처럼 폭이 좁은 자리에서 `07-21`로 줄인다. **기본은 전체 표기다.**
 */
export function formatDue(date: string, compact = false): string {
  return compact ? date.slice(5, 10) : date
}
