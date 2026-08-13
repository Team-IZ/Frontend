/*
  OP-05 리포트 계약 — 서버와 주고받는 모양·에러코드(백엔드 합의 대상).

  이 화면은 **문서 1종**이다. 빅프로젝트가 제품에서 빠지면서(사용자 결정 — "우리는
  그냥 미니프로젝트들로만 이해도를 검증한다") 원래 있던 "수업 진단"(미프 종료 후)·
  "기수 결산"(빅프 종료 후) 2탭 구조의 존재 이유(앵커가 다르다·발행 시점이 다르다,
  OP-05-report.md §2)가 둘 다 사라졌다 — 우수 교육생·반별 위험자·집단 미달도
  원래 미프 기반이라 빅프를 기다릴 이유가 없었다. 그래서 탭을 합쳤다.

  필터·드릴다운이 없는 **고정 스냅샷**이라(§4) 쿼리 파라미터는 `cohortId` 하나뿐이다.
*/

/**
 * 도달 단계. 검증 개념 하나에 대한 응답 깊이 — 기획에 정의된 절대 눈금이다.
 *
 * ⚠ 0단이 있다 — "통과한 축이 하나도 없음"(물었는데 못한 것). `unasked`("묻지 못함",
 * 문항 자체가 없던 것)와 다르다. 실제 서버 연동 전엔 4단(1~4)만 있는 줄 알았는데,
 * 서버 스펙(`CohortDiagnosisResponse.ReachDistribution`)이 0단을 계속 보낸다 —
 * 디자인 토큰도 `--color-reach-0`~`--color-reach-4` 5단계였다(D21류 실측 대조).
 */
export type ReachLevel = 0 | 1 | 2 | 3 | 4

/**
 * 도달 단계 분포 — 개념 하나(또는 회차 하나)를 채점한 인원이 각 단계에 몇 명씩
 * 있는지. `unasked`는 "묻지 못함"(그 학생 코드에 개념이 없어 문항이 안 만들어짐) —
 * 채점 실패가 아니라 **애초에 못 물은 것**이라 분포와 별도로 센다(F3).
 *
 * `belowLevel2Count`(위험 판정선)는 **level0 + level1 + level2**다. level0을
 * 빠뜨리면 막대 비율과 이 숫자가 서로 다른 모집단을 말하게 된다.
 */
export type ReachDistribution = {
  level0: number
  level1: number
  level2: number
  level3: number
  level4: number
  unasked: number
}

export type ConceptDiagnosis = {
  id: string
  name: string
  curriculumName: string
  curriculumVersion: string
  /** 출처 섹션·페이지. 예: "4장 p.62" — 교안을 고칠 자리를 가리킨다 */
  section: string
  /** 이 개념이 쓰인 회차들. 예: ["미프 3차", "미프 5차"] */
  rounds: string[]
  distribution: ReachDistribution
  gradedCount: number
  totalCount: number
  /** 2단 이하 인원 — 9-2 위험 판정선이자 11장 재시험 대상선 */
  belowLevel2Count: number
}

export type RoundDiagnosis = {
  id: string
  /** 예: "미프 1차" */
  name: string
  conceptNames: string[]
  distribution: ReachDistribution
  gradedCount: number
  totalCount: number
  belowLevel2Count: number
}

export type TopStudent = {
  id: string
  name: string
  className: string
  /** 미프 우수 횟수 */
  miniTopCount: number
  /** 우수로 뽑힌 회차 번호. 예: [1, 2, 3, 5, 7] */
  miniTopRounds: number[]
}

export type ClassRiskRate = {
  /** "기수 전체"도 한 행이다 — 기준선 */
  className: string
  traineeCount: number
  atRiskCount: number
}

export type GroupShortfall = {
  conceptName: string
  curriculumName: string
  section: string
  round: string
  className: string
  shortfallCount: number
  totalCount: number
}

export type ReportStatus = 'IN_PROGRESS' | 'CONFIRMED'

export type Report = {
  status: ReportStatus
  cohortName: string
  /** 확정 전이면 null — PDF가 잠긴 이유이기도 하다 */
  /**
   * 발행 시각. 서버가 **ISO 타임스탬프**(`2026-03-05T00:00:00Z`)로 준다 —
   * `periodStart`·`periodEnd`가 날짜(`2025-09-01`)인 것과 다르다.
   * 화면에 쓸 때는 `reportDate()`로 날짜만 잘라 쓴다.
   */
  publishedAt: string | null
  /** 지금까지 발행된 회차 수 */
  completedRounds: number
  /** 등록된 전체 회차 수. 8 고정이 아니다(OP-02 §4-2 "회차 열은 등록된 프로젝트만큼") */
  totalRounds: number
  periodStart: string
  /** 확정 전이면 아직 끝나지 않았으므로 null */
  periodEnd: string | null
  traineeCount: number
  classCount: number
  conceptCount: number
  curriculumCount: number
  gradedCount: number
  totalSubmissionCount: number
  excluded: { notTaken: number; invalid: number; interrupted: number }
  concepts: ConceptDiagnosis[]
  rounds: RoundDiagnosis[]
  topStudents: TopStudent[]
  /** 반별 위험자 비율의 기준이 된 미프 회차. 예: "미프 7차" */
  classRiskRoundLabel: string
  classRisk: ClassRiskRate[]
  groupShortfalls: GroupShortfall[]
}
