import type { components } from '@/api/schema'

/*
  MG-08 프로젝트 상세가 읽는 모양.

  **목 계약을 그대로 옮기지 않는다.** `mockData.ts`는 서버가 없던 동안의 임시
  어휘이고(파일 머리 주석에 "프론트가 정했다"가 여러 줄 있다), 이제 서버가 같은
  값을 판정해 준다. 그래서 여기서는 **서버 스키마를 그대로 별칭한다** — 이름만
  바꾼 평행 타입을 만들면 서버가 필드를 하나 늘릴 때마다 두 곳을 고쳐야 한다.

  목과 갈린 것 셋(integration-process §3).

  ① 이름까지 같다 — `teamFormationStage`(목 `TeamPhase` 5국면과 값이 1:1) ·
     `locked` · `reportPublished` · 축 4단계 · 개념별 도달/다시 보기 대상
  ② **서버가 낫다 — 목이 화면에서 파생하던 판정을 서버가 필드로 준다.**
     · `submissionOpened` — 목은 `teamPhase === 'LOCKED' || 'SUBMITTING'`으로
       화면이 계산했다. 스펙이 「화면은 이 값만 보고 정한다」고 못박았다
     · `attendanceStatus` 4종(DONE·OPEN·MISSED·BLOCKED) — 목의 D56 B절 판정 그대로
     · `resultStatus` 5종 — 목에 없던 축이다. `AVAILABLE`이 아니면 합격·불합격을
       말하지 않는다(응시 중인 사람이 전부 불합격으로 잡히는 것을 막는다)
  ③ **목이 지어냈다 — 서버에 자리가 없다.**
     · 다시 보기 활성화·취소(`retrySentAt`·`retryDueAt`·`retryTakenAt`)
     · 리포트 발행(`publishReport`) — `reportPublished`는 읽기 전용이다
     둘 다 32차 요청서로 올린다. 그때까지 화면은 그 액션을 잠근다.
*/

/**
 * 상세 조회는 목록과 **다른 스키마**다(`ProjectDetailResponse`) — 목록이 개수와
 * 이름 배열만 주는 자리에 상세는 교안·개념을 객체로 주고 요구사항 제목도 싣는다.
 * 22차 R5 이후 두 응답이 갈렸으니 목록 타입으로 상세를 읽지 않는다.
 */
export type Project = components['schemas']['ProjectDetailResponse']
export type ProjectListItem = components['schemas']['ProjectResponse']
export type ProjectStatus = components['schemas']['ProjectStatus']

export type TeamList = components['schemas']['TeamListResponse']
export type Team = components['schemas']['TeamResponse']
export type TeamMember = components['schemas']['TeamMemberResponse']
export type UnassignedMember = components['schemas']['UnassignedMemberResponse']

export type SubmissionStatus = components['schemas']['ProjectSubmissionStatusResponse']
export type SubmissionTeam = components['schemas']['SubmissionStatusTeam']
export type SubmissionMember = components['schemas']['Member']
export type RequirementResult = components['schemas']['SubmissionStatusRequirementResult']

export type ClassProgressView = components['schemas']['ClassProgressResponse']

export type EvaluationSummary = components['schemas']['ProjectEvaluationSummaryResponse']
export type EvaluationTrainee = components['schemas']['ProjectEvaluationTrainee']
export type TraineeEvaluation = components['schemas']['TraineeEvaluationDetailResponse']
export type EvaluationStep = components['schemas']['TraineeEvaluationStep']

/**
 * 팀 편성 5국면 — 목 `TeamPhase`와 값이 1:1이다(`BEFORE`→`NOT_STARTED`,
 * `READY`→`READY_TO_CONFIRM`, `LOCKED`→`CONFIRMED`). 스펙이 `string`으로 열어 둬
 * 좁혀 쓴다.
 */
export type TeamFormationStage =
  'NOT_STARTED' | 'FORMING' | 'READY_TO_CONFIRM' | 'CONFIRMED' | 'CLOSED'

export const TEAM_STAGE_LABEL: Record<TeamFormationStage, string> = {
  NOT_STARTED: '편성 전',
  FORMING: '편성 중',
  READY_TO_CONFIRM: '전원 배정',
  CONFIRMED: '확정됨',
  CLOSED: '종료',
}

/** 개인 응시 4종 — 서버가 판정한다(`Member.attendanceStatus`) */
export type AttendanceStatus = 'DONE' | 'OPEN' | 'MISSED' | 'BLOCKED'

export const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  DONE: '응시 완료',
  OPEN: '응시 전',
  MISSED: '미응시',
  BLOCKED: '—',
}

/**
 * 채점 결과 5종. **`AVAILABLE`이 아니면 합격·불합격을 말하지 않는다**(스펙 🔴) —
 * 목에는 없던 구분이라 화면이 새로 다뤄야 하는 상태다.
 */
export type ResultStatus = 'AVAILABLE' | 'IN_PROGRESS' | 'INCOMPLETE' | 'NOT_ATTENDED' | 'INVALID'

export const RESULT_STATUS_LABEL: Record<ResultStatus, string> = {
  AVAILABLE: '응시 완료',
  IN_PROGRESS: '응시 중',
  INCOMPLETE: '중단',
  NOT_ATTENDED: '미응시',
  INVALID: '무효',
}

/** 축 4단계 — 서버는 `stepNo`(1~4)로 준다. 라벨은 화면 어휘다 */
export const AXIS_LABEL: Record<number, string> = {
  1: '코드이해',
  2: '설계논리',
  3: '대안비교',
  4: '반례대응',
}

/**
 * 다시 보기 대상 인원 — **화면이 더한다.** 스펙이 「발행 전에는 이 합을 보여주지
 * 않기로 한 화면 규칙이 있어 서버가 미리 더하지 않는다」고 명시했다.
 */
export function retryTargetCount(s: EvaluationSummary['summary']): number {
  return s.failedCount + s.notAttendedCount
}
