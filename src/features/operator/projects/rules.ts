import type { ProjectStatus } from './types'

/*
  기획이 정한 규칙과, 그 규칙에서 나오는 표시값.

  **서버도 같은 규칙을 검증한다.** 클라이언트 검증만 있으면 우회되므로, 여기 있는
  값이 바뀌면 백엔드와 같이 바꾼다(`docs/dev/api-boundary.md` §1-④).
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
  concepts: { curriculumId: string }[],
  curriculumId: string,
): boolean {
  return !concepts.some((c) => c.curriculumId === curriculumId)
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
  curricula: { id: string; teaches: { id: string }[] }[],
  keptCurriculumIds: string[],
): string[] {
  const alive = new Set(
    curricula
      .filter((c) => keptCurriculumIds.includes(c.id))
      .flatMap((c) => c.teaches.map((t) => t.id)),
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
  if (status === 'DONE') return '종료된 회차라 바꿀 수 없습니다'
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

/**
 * 시각 입력의 **초기값**일 뿐이다 — 회차마다 다르므로 사용자가 바꾼다.
 *
 * 한때 `DUE_TIME` 상수로 **고정**해 화면이 붙여서 보냈다. 목업의 `18:00`도 이 값도
 * 예시였을 뿐인데 상수로 두니 *"자정 마감이 규칙"* 인 것처럼 굳었다 — 실제로는 회차마다
 * 다르게 잡는다. **기준을 화면이 만들지 않는다**(E8).
 */
export const DEFAULT_DUE_TIME = '23:59'
/** 시작 시각 초기값. 하루의 시작이라 `00:00`이다 */
export const DEFAULT_START_TIME = '00:00'

/** 로컬 날짜를 `YYYY-MM-DD`로. `toISOString()`은 UTC로 밀려 하루가 어긋난다 */
export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 날짜 + 고정 시각을 `YYYY-MM-DDTHH:mm`으로 */
export function toIsoDateTime(d: Date, time: string): string {
  return `${toIsoDate(d)}T${time}`
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
 * 고른 날짜·시각을 저장 형식(`YYYY-MM-DDTHH:mm`)으로. 둘 중 하나라도 없으면 `null` —
 * 저장 가능 여부 판정이 이 반환값 하나로 끝난다.
 *
 * **시작에도 시각이 붙는다.** 한쪽만 시각을 받으면 왜 다른지를 화면이 설명해야 하고,
 * `09:00 시작 · 18:00 마감` 같은 운영이 실제로 있다.
 *
 * `시작 > 마감`은 달력·시각 입력이 서로 막아 애초에 만들어지지 않지만, **같은 날**이면
 * 시각까지 봐야 갈린다 — 날짜만 비교하던 때는 통과하던 조합이라 여기서 막는다.
 */
export function toSchedule(
  startAt: Date | undefined,
  startTime: string,
  dueAt: Date | undefined,
  dueTime: string,
) {
  if (!startAt || !dueAt || !startTime || !dueTime) return null
  const start = toIsoDateTime(startAt, startTime)
  const due = toIsoDateTime(dueAt, dueTime)
  if (due <= start) return null
  return { startAt: start, dueAt: due }
}

/** 표시용 `07-21 18:00`. 저장·전송은 ISO로 두고 화면에서만 자른다 */
export function formatDue(iso: string): string {
  return `${iso.slice(5, 10)} ${iso.slice(11, 16)}`
}
