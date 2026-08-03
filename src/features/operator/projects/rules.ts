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
 * 제출 마감 시각 — **마감일 그날 자정까지**다. 회차마다 다른 값이 아니라서 입력으로
 * 받지 않는다(운영자가 매번 같은 값을 치게 하면 잘못 칠 여지만 생긴다).
 *
 * `24:00`이 아니라 `23:59`인 이유 — 자정은 **다음 날 00:00**이라 "9월 26일 마감"이
 * 실제로는 27일에 끝나는 것처럼 읽힌다. 그날 안에 끝난다는 뜻을 그대로 쓴다.
 *
 * 목업은 `18:00`으로 그렸지만 실제 운영 기준이 자정이라 이 값을 쓴다. 기획이 바꾸면
 * 여기만 고친다.
 */
export const DUE_TIME = '23:59'

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
 * 고른 두 날짜를 저장 형식으로. 시작은 날짜만, 마감은 고정 시각(자정)이 붙는다.
 * 둘 중 하나라도 없으면 `null` — 저장 가능 여부 판정이 이 반환값 하나로 끝난다.
 */
export function toSchedule(startAt: Date | undefined, dueAt: Date | undefined) {
  if (!startAt || !dueAt) return null
  return { startAt: toIsoDate(startAt), dueAt: toIsoDateTime(dueAt, DUE_TIME) }
}

/** 표시용 `07-21 18:00`. 저장·전송은 ISO로 두고 화면에서만 자른다 */
export function formatDue(iso: string): string {
  return `${iso.slice(5, 10)} ${iso.slice(11, 16)}`
}
