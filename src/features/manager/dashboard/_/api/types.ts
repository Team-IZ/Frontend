/*
  MG-01 인박스가 읽는 모양. 서버 응답 넷을 여기서 한 목록으로 접는다.

  **행 종류가 목과 다르다**(대조표 · `docs/dev/screens/mg-01-situations.md` 정정):
  · `RETRY`(다시 보기)를 뺐다 — 32차 R14②로 「오퍼레이션 없음」 확답을 받았다.
    목은 이 행을 그렸는데 서버에 근거가 아예 없어서 지어낸 것이 된다.

    ⚠ **2026-08-19 정정 — 이제 근거가 생겼다.** 38차 R1이 풀리면서 인박스 조회가
    `REVIEW` 항목을 준다(마감 `review_due_at`이 안 지난 사람만 · 실측 4건, 그 4명이
    6차 불합격 4명과 같다). 다만 **우리는 아직 인박스 조회를 안 쓴다**(아래) —
    그래서 이 화면에는 여전히 없다. 갈아탈 때 같이 들어온다.
  · `SESSION_INCOMPLETE`(응시 중단)를 넣었다 — 목에 없던 유형인데 실데이터에
    11건 있다. 미응시(9건)와 나란히 오는 값이라 한쪽만 그리면 절반을 숨긴다.
*/

/**
 * 밴드는 **서버에 없다.** 응답은 마감 정렬만 주고 이 묶음은 화면이 정한다 —
 * 매니저가 「오늘 뭐부터」를 읽는 순서라서 사용자가 못 고른다(정의서 §1).
 */
export type InboxBand = 1 | 2 | 3 | 4

type Base = { id: string; band: InboxBand }

/** 1층 응시 상태 — 명부 `roundPrimaryStatusCode`가 그대로 종류가 된다 */
export type AttendanceItem = Base & {
  kind: 'ABSENT' | 'SESSION_INCOMPLETE'
  band: 1
  traineeId: string
  name: string
  className: string | null
  /** 마감 시각. `NOT_ATTENDED`·`SESSION_INCOMPLETE`일 때만 값이 있다(스펙) */
  terminalAt: string | null
}

export type InvalidItem = Base & {
  kind: 'INVALID'
  band: 2
  traineeId: string
  name: string
  className: string | null
  /**
   * 🔴 **[면담 목록에서 확인]이 쓰는 값은 이름이 아니라 이 id다.** 목록 화면의
   * `?class=`가 그대로 `classId`로 나가는데 이름을 보내서 **0행**이 됐다
   * (하드닝에서 잡았다 — 5명이 전부 그 반인데 빈 목록이 떴다).
   */
  classId: string | null
  assessmentRoundId: string
  detectedAt: string
  /**
   * signals `summary`를 푼 값. **서버가 JSON을 문자열로 준다**(36차 R3) —
   * 못 풀면 `null`이고, 그때는 화면이 판정 문구를 안 그린다(지어내지 않는다).
   */
  reviewStatus: string | null
}

export type InterviewItem = Base & {
  kind: 'INTERVIEW'
  band: 3
  caseId: string
  traineeId: string
  name: string
  className: string | null
  /** 서버가 만든 근거 한 줄(`개념 3건 전부 2단 이하 · 2회 연속`) */
  riskSummary: string | null
  /** `FAILED`면 브리프를 열어도 내용이 없다 — 버튼을 막는 근거다 */
  briefState: string | null
}

/**
 * 미제출 — **팀 단위다.** 36차 R2로 `actionItems[].teams[{teamId, teamName}]`가
 * 생겨서 팀 이름을 쓸 수 있게 됐다. 그전에는 `teamCount`만 와서 「C반 미제출
 * 2팀」으로 반 한 줄로 접어야 했다(지어낼 수 없었다).
 *
 * ⚠ **`teams`가 비어 있을 수 있다** — `teamCount`만 오고 목록이 없으면 접는다.
 * 실제로 `INTERVIEW_BACKLOG`가 그 모양이다(그쪽은 이 행이 아니다).
 */
export type UnsubmittedItem = Base & {
  kind: 'UNSUBMITTED'
  band: 4
  classId: string
  className: string
  teamCount: number
  /** 비어 있으면 반 단위로 접어 그린다 */
  teams: { teamId: string; teamName: string }[]
}

/** 분석 실패 — 이쪽은 `class-progress`가 팀 이름을 준다 */
export type AnalysisFailedItem = Base & {
  kind: 'ANALYSIS_FAILED'
  band: 4
  classId: string
  className: string
  teamId: string
  teamName: string
  representativeName: string | null
  failureReason: string | null
}

export type InboxItem =
  AttendanceItem | InvalidItem | InterviewItem | UnsubmittedItem | AnalysisFailedItem

/** 머리의 진행 줄 — `class-progress`가 그대로 대응한다(대조표 ①) */
export type RunSummary = {
  projectName: string
  roundName: string
  roundNo: number
  totalRoundCount: number
  submitted: number
  submittedTotal: number
  attended: number
  attendedTotal: number
  reportPublished: boolean
  /** 시각까지 온다 — 날짜만 오는 `startDate`와 다르다 */
  dueAt: string | null
}

export type ProjectOption = { projectId: string; name: string; status: string }

export type InboxView = {
  /** 진행 중 프로젝트가 없으면 `null` — 「모른다」가 아니라 「없다」다 */
  run: RunSummary | null
  /**
   * 진행 줄이 **아직 오는 중**. `run: null`과 반드시 갈라야 한다 — 둘을 합치면
   * 기다리는 동안 「진행 중인 프로젝트가 없습니다」라고 **있는데 없다고** 말한다.
   */
  runPending: boolean
  /**
   * 목록을 만드는 조회 셋 중 **하나라도 아직 안 온 상태**. 이걸 안 가르면
   * 느린 조회(명부 5~6초)가 도착하기 전에 **밴드 하나가 통째로 빠진 목록**을
   * 완성된 것처럼 그린다 — 실측에서 8건이 7건으로 보였다. 부분을 전부인 척
   * 보여주는 것이 비어 보이는 것보다 나쁘다.
   */
  itemsPending: boolean
  /**
   * **밴드 단위 실패.** 조회 하나가 죽어도 나머지 밴드는 그린다
   * (`async-states` §3-5 「부분 실패는 화면을 비우지 않는다」).
   *
   * 🔴 처음에 「하나라도 실패하면 전체 실패」로 만들었다가 가로채기에서 잡았다 —
   * signals 하나가 500이면 **멀쩡한 22건까지 안 보였다.** 목의 `bandTwoFailed`가
   * 이미 이 구조였는데 연동하며 없앴던 것이다.
   *
   * 밴드 4(미제출·분석 실패)는 여기 안 온다 — 그 원천이 곧 축(프로젝트·회차)이라
   * 죽으면 화면 전체가 설 자리를 잃는다.
   *
   * ⚠ 값은 **그 조회의 에러 그대로**다 — 화면이 `errorCopy`에 넘겨 문구와 재시도
   * 여부를 정한다(규칙 I). `true`만 담았더니 403에도 「다시 시도」가 그려졌다.
   */
  failedBands: Partial<Record<InboxBand, unknown>>
  items: InboxItem[]
  projects: ProjectOption[]
  projectId: string | null
}
