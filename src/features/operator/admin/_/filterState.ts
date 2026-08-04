/*
  필터 값의 표현 — 화면 것이다(api-boundary §1-⑤). 서버에는 `전체`라는 값이 없다.

  **컴포넌트 파일에서 뺀 이유는 재사용이 아니라 Fast Refresh다.** 한 파일이 컴포넌트와
  값을 같이 export하면 그 파일에 상태 보존 핫리로드가 안 걸린다
  (`react/only-export-components` — decision-log D20이 라우트 파일을 가른 것과 같은 이유).
  운영 관리 탭들은 필터·선택 상태를 실제로 들고 있어서 이 비용이 개발 중 계속 걸린다.
*/

/** 필터가 아무것도 안 걸렸을 때의 값. 빈 문자열은 Select가 `미선택`으로 읽어 버린다 */
export const ALL = 'ALL'

/**
 * `소속 반` 드롭다운의 `미배정`.
 *
 * **반 id가 아니라 조건이다** — 서버에서도 `classId`가 아니라 `scope=UNASSIGNED`로 나간다.
 * 사람이 보기엔 같은 축(어느 반이냐)이라 드롭다운 하나에 같이 두고, 쿼리에서만 가른다.
 */
export const UNASSIGNED = 'UNASSIGNED'

export type FilterOption = { value: string; label: string }

/** `전체`를 앞에 붙인 선택지. 라벨 맵(labels.ts)에서 바로 만든다 */
export function withAll<K extends string>(labels: Record<K, string>): FilterOption[] {
  return [
    { value: ALL, label: '전체' },
    ...(Object.keys(labels) as K[]).map((k) => ({ value: k, label: labels[k] })),
  ]
}

/** 필터 값을 쿼리로 — `ALL`은 보내지 않는다 */
export function asQuery<T extends string>(value: string): T | undefined {
  return value === ALL ? undefined : (value as T)
}
