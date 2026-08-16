import type { components } from '@/api/schema'

/*
  MG-09 교안이 읽는 모양 — 서버 스키마를 그대로 별칭한다(MG-08 `_/api/types.ts`와
  같은 판단: 이름만 바꾼 평행 타입은 서버가 필드를 늘릴 때마다 두 곳을 고치게 한다).

  목과 갈린 것 셋(integration-process §3).

  ① 이름까지 같다 — 섹션(제목·페이지 범위·항목) · 가르친 항목(이름·정의문·페이지) ·
     ★ 검증 개념 표시 · 쓰인 회차

  ② **서버가 낫다**
     · `analysisStatus`가 4종 + **`null`**이다. 목은 `DONE`·`FAILED` 둘뿐이었는데
       서버는 `PENDING·RUNNING·SUCCEEDED·FAILED`이고, **한 번도 분석하지 않은
       교안은 값 자체가 null**이다 — 스펙이 「실패와 구분해야 해서 값을 만들어
       넣지 않는다」고 못박았다. 목이었다면 미분석 교안이 "분석 실패"로 보였다
     · `definitionMissing`이 따로 온다. 목은 `definition === null`로 판정하고
       원인은 `isSummary`로 갈랐다 — 두 사정이 한 필드에 겹쳐 있었다
     · `usedRoundLabels[]`가 **배열**이다. 목 `verifiedAs`는 회차 하나만 담을 수
       있어, 한 항목이 두 회차의 검증 개념이면 하나를 버려야 했다

  ③ **목이 지어냈다 — 서버에 자리가 없다**
     · `verifiedAs.index`(`개념 3`) — 회차 안 몇 번째인지. 순번이 오지 않는다
     · `UsedRound.attendance`(`응시 58/71`) — `attendedCount`(분자)만 온다.
       분모가 없어 비율을 못 만든다
     · `UsedRound.resultStatus`(발행 완료·발행 전·예정) — 회차 조회에 없다
     · 목록의 **섹션 수** — 기수 연결 목록에 없다(교안 상세에만 있다)
     넷 다 32차 요청서로 올린다.

  🔴 **버전 축이 둘이다.** 목록(`CohortCurriculumResponse`)은 **이 기수가 연결한
  버전**(`versionId`·`versionNo`)을 주는데, 상세 조회 셋은 `materialId`를 받아
  **최신 버전**으로 해석한다(스펙 명시). 둘이 다르면 목록 행과 상세 화면이 서로
  다른 버전을 말한다. 화면이 고를 수 있는 문제가 아니라 32차로 올린다.
*/

/** 기수에 연결된 교안 한 줄 — MG-09 목록의 행 */
export type LinkedCurriculum = components['schemas']['CohortCurriculumResponse']

/** 교안 머리글 — 상세 화면 위쪽 */
export type CurriculumHead = components['schemas']['CurriculumCatalogItem']

export type Section = components['schemas']['SectionResponse']
export type SectionItem = components['schemas']['SectionItemResponse']

/** 이 교안을 쓴 회차 한 줄 */
export type UsedProject = components['schemas']['CurriculumUsingProjectResponse']

/**
 * 분석 상태 — **`null`이 「한 번도 안 했다」의 값이다.** 실패와 다르다.
 * `PENDING`·`RUNNING`은 화면에서 한 덩어리(`분석 중`)로 묶는다(스펙이 그렇게 쓴다).
 */
export type AnalysisStatus = components['schemas']['CurriculumAnalysisStatus']

export function analysisLabel(s: AnalysisStatus | null | undefined): {
  text: string
  variant: 'success' | 'warning' | 'neutral' | 'danger'
} {
  if (s == null) return { text: '분석 전', variant: 'neutral' }
  if (s === 'SUCCEEDED') return { text: '분석 완료', variant: 'success' }
  if (s === 'FAILED') return { text: '분석 실패', variant: 'danger' }
  return { text: '분석 중', variant: 'warning' }
}

/** `spring_backend_v1.pdf` 옆에 붙는 `v3` */
export function versionLabel(versionNo: number): string {
  return `v${versionNo}`
}
