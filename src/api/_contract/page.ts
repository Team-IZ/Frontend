/*
  목록 응답을 표가 읽는 한 가지 모양으로 바꾼다.

  백엔드 목록 봉투가 다섯 가지다(`content|page|size|totalElements|totalPages` ·
  `content|activeCount` · `classrooms` · `enrollments` …). 통일 요청은 철회하고 우리가
  흡수하기로 했다 — DTO를 고치는 것보다 싸다(backend-api-requests-2.md 4절).

  ## 왜 생성 함수가 아니라 여기서 하나
  처음엔 생성기가 호출 함수의 반환값을 통째로 `Page`로 바꾸게 하려 했다. **그러면 봉투에
  같이 실려 오는 값이 사라진다** — `SuperAdminListResponse.activeCount`처럼 화면이 실제로
  쓰는 것들이다. 그래서 생성 함수는 서버 응답을 **그대로** 주고, 표에 넘기기 직전
  화면 어댑터(`features/{역할}/{도메인}/api.ts`)에서 이 함수를 통과시킨다. 손실이 없고 마법도 없다.

  ```ts
  const res = await findOrganizations({ query })
  return toPage(res)                        // content 봉투
  return toPage({ content: res.classrooms }) // 이름이 다른 둘은 여기서 맞춰 준다
  ```
*/

export type Page<T> = {
  items: T[]
  /** 조건에 맞는 전체 건수 */
  total: number
  /** 0부터 */
  page: number
  size: number
  /**
   * 서버가 페이지를 나눠 준 응답인가.
   *
   * `false`면 `total`은 **받은 배열의 길이**다 — 서버가 나중에 이 목록에 페이징을 붙이면
   * 그때부터 "한 페이지 개수"를 전체로 보고하게 된다. 조용히 틀리는 종류라 표식을 남긴다.
   * (백엔드에 "페이징을 추가하면 알려 달라"고 요청해 뒀다)
   */
  pagedByServer: boolean
}

type PageMeta = { page: number; size: number; totalElements: number; totalPages: number }

export function toPage<T>(res: { content: T[] } & Partial<PageMeta>): Page<T> {
  const items = res.content ?? []
  const paged = typeof res.totalElements === 'number'
  return {
    items,
    total: paged ? res.totalElements! : items.length,
    page: res.page ?? 0,
    size: res.size ?? items.length,
    pagedByServer: paged,
  }
}
