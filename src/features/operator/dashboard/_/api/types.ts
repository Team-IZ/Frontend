/*
  OP-01 대시보드 **계약** — 서버와 주고받는 모양만 둔다(api-boundary §1-③).

  이 화면의 성격이 타입에 그대로 박혀 있다.
    · **여기서 처리하지 않는다.** 요약과 링크뿐이라 요청 타입이 하나도 없다 —
      조회 하나가 전부다(OP-01 §5).
    · **화면이 집계하지 않는다.** 비율·개수·기준선은 전부 서버가 판정해 내려준다
      (api-boundary §1-②). 화면이 반 값을 합쳐 기수 값을 만들면 안 된다.
    · **문장을 서버에서 받지 않는다.** `조치 필요` 네 줄은 종류마다 다른 *사실*을
      내려받고 문구는 화면(`labels.ts`)이 만든다 — 판정을 문장으로 내려주면 규칙이
      바뀔 때마다 문구·테스트가 따라온다(체크리스트 A7).
*/

// ── 블록 ────────────────────────────────────────────────────
/**
 * 블록 하나 — 값이거나 실패다.
 *
 * **부분 실패는 그 줄만 실패로 그린다**(F2 · 목업 `#partial`). 응답 전체를 한 덩어리로
 * 두면 반 비교 하나가 실패했을 때 화면을 통째로 비우게 된다. 블록마다 갈라 두면
 * 실패한 자리에만 `다시 시도`가 붙는다.
 */
export type Block<T> = { ok: true; value: T } | { ok: false }

// ── ① 이번 회차 파이프라인 ───────────────────────────────────
/**
 * 제출 → 분석 실패 → 응시 → 리포트.
 *
 * **분석 실패는 팀 단위**다 — 제출이 팀 단위이므로(OP-01 §4). 응시 모집단은 제출이
 * 아니라 **분석 완료** 수다(응시 창이 분석 후 열린다 · B4).
 */
export type RoundPipeline = {
  projectId: string
  /** `미프 4차`. 유형·회차 라벨은 화면 것이 아니라 회차 이름 자체다 */
  roundLabel: string
  /**
   * 전체 중 몇 번째. **매니저 대시보드에는 없던 정보**다 — 오퍼레이터는 기수를
   * 운영하므로 *"아직 남았다"* 와 *"마지막 회차다"* 의 판단이 다르다(OP-01 §3).
   */
  roundNo: number
  /** 등록된 미프 회차 수. `8` 같은 상수가 아니다(OP-02 §4-2) */
  roundTotal: number
  submitted: number
  /** 명부 전체 — `231/250`의 분모 */
  total: number
  /**
   * 분석이 끝난 사람 수. **응시 분모가 이 값이다** — 응시 창이 분석 완료부터 열리므로(B4)
   * 분석에 실패한 팀은 응시할 수 없다.
   *
   * 목업은 이 단계를 그리지 않고 `제출 231 → 분석 실패 2팀 → 응시 198/231`로 이었는데,
   * **실패가 2팀인데 응시 분모가 제출 전량**이라 산술이 맞지 않았다. 단계를 실제로 넣어
   * 분모를 여기에 연결한다.
   */
  analyzed: number
  /** 분석 실패 **팀** 수. 유일하게 붉은 값이라 갈 곳이 있어야 한다(OP-04 현황) */
  analysisFailedTeams: number
  attended: number
  reportPublished: boolean
  /** 제출 마감(ISO). 진행 전 회차는 아직 없을 수 있다 */
  dueAt: string | null
  /** 제출 시작(ISO). 진행 전 케이스에서 `제출 시작 07-29 09:00`으로 쓴다 */
  startAt: string | null
  /** 제출이 하나도 안 들어온 회차인가 — 파이프라인 뒤쪽을 `—`로 그린다(F3) */
  notStarted: boolean
}

// ── ② 반 비교 ───────────────────────────────────────────────
/**
 * 막대 한 줄. **등수를 붙이지 않는다**(A6) — 순위 필드가 없는 것이 그 규칙이다.
 *
 * 값은 *"2단 이하 개념이 2개 이상인 학생 비율"*(9-2 판정과 같은 값)이고,
 * **집단 미달로 판정된 개념(9-6)은 빼고 센 뒤**의 값이다 — 안 빼면 반 전체가 같은
 * 지점에서 멈춘 것이 개인 위험이 많은 반으로 보인다(OP-01 §3).
 */
export type ClassRisk = {
  className: string
  /** 0~100. 서버가 판정한다 */
  ratio: number
  risky: number
  /** 채점된 사람. 명부 수가 아니다(14-1 · 9-4) */
  graded: number
  /** 담당 없음 표시용. 목업 `#assign`이 막대 옆에 `담당 없음`을 붙인다 */
  hasManager: boolean
}

export type ClassCompare = {
  /**
   * 기준이 된 회차 라벨. **강조하지 않으면 지금 회차 결과로 읽는다**(OP-01 §6) —
   * `미프 3차 기준 — 미프 4차는 미발행`의 앞부분이다.
   */
  basisRoundLabel: string
  /**
   * 같은 회차의 **기수 전체 비율**. 막대 트랙에 기준선으로 그린다.
   *
   * **이게 없으면 막대가 아무 말도 하지 않는다.** `32%`가 나쁜 값인지 이 회차가 원래
   * 그런지 화면에서 알 수 없기 때문이다. 목업은 상위 몇 개를 경고색으로 칠했는데 그
   * 경계에 근거가 없었다 — 화면이 기준을 정하는 것이라 E8이 금지한다.
   *
   * **기수 평균은 우리가 정한 임계값이 아니라 관측값**이라 E8에 걸리지 않는다. 그리고
   * OP-02가 *"난이도는 기수 전체를 빼면 상쇄된다"* 며 쓰는 것과 **같은 기준선**이라,
   * 두 화면이 같은 잣대로 말하게 된다.
   */
  cohortRatio: number
  /** 지금 굴러가는 회차 라벨. 위 문구의 뒷부분 */
  currentRoundLabel: string
  /** 지금 회차가 아직 시작 전인가 — 문구가 `미발행`/`아직 결과 없음`으로 갈린다 */
  currentNotStarted: boolean
  classes: ClassRisk[]
}

// ── ③ 조치 필요 ─────────────────────────────────────────────
/**
 * 네 종류. **정렬은 되돌리기 어려운 순서**이고 그 순서가 곧 우선순위라
 * 띠에 이유를 쓰지 않는다(OP-01 §3).
 */
export type TodoKind =
  /** ① 구조 문제라 그 반 전체가 방치된다 */
  | 'UNASSIGNED'
  /** ② 다음 회차 설계에 반영해야 늦지 않는다 */
  | 'CONCEPT_GAP'
  /** ③ 반 공지·재투입 */
  | 'GROUP_MISS'
  /** ④ 인력 조정 */
  | 'INTERVIEW_BACKLOG'

/**
 * 조치 한 줄. **종류마다 필드가 다르다.**
 *
 * 하나의 `{ title, sub }`로 뭉치면 문장을 서버가 만들게 되고, 그건 *"데이터가 다르면
 * 거짓말을 하는"* 판정 문장이다(A7). 여기서는 **사실만** 받고 문구는 화면이 만든다.
 */
export type Todo =
  | {
      kind: 'UNASSIGNED'
      /** 담당 없는 반. **여러 반이면 묶어서 한 줄**이다 */
      classNames: string[]
      trainees: number
      /** 왜 비었나. 목업 `박지현 매니저가 퇴사 처리된 뒤 반이 남았습니다` */
      reason: string | null
    }
  | {
      kind: 'CONCEPT_GAP'
      /** 그 회차 현황(OP-04)으로 보내려면 id가 필요하다 — 라벨로는 주소를 못 만든다 */
      projectId: string
      roundLabel: string
      conceptName: string
      /** 코드 매칭 0인 팀 수 / 전체 팀 수 — `8팀 중 6팀` */
      unmatchedTeams: number
      totalTeams: number
    }
  | {
      kind: 'GROUP_MISS'
      /**
       * 어느 회차 판정인가. **9-6은 리포트 발행 시점에 켜지므로**(10-1 일괄 발행) 항상
       * 직전 발행 회차 것이고, 진행 중 회차 것일 수 없다.
       *
       * ⚠ 계약에 없던 필드다 — 목업이 `C반 · "Graph 구성" 14/25`까지만 쓰고 회차를
       * 안 적어서 **네 줄이 전부 이번 회차 것으로 읽혔다**(MG-01이 경고한 그것).
       */
      roundLabel: string
      conceptName: string
      /**
       * 미달한 반. **여러 반이면 개념 선택 자체를 다시 봐야 한다**(OP-01 §6) —
       * 반마다 공지를 보내면 원인을 못 고친다. 화면이 개수로 문구를 가른다.
       */
      classNames: string[]
      /** 한 반일 때만 쓰는 `14/25`. 여러 반이면 반마다 달라 못 쓴다 */
      below: number | null
      total: number | null
    }
  | {
      kind: 'INTERVIEW_BACKLOG'
      className: string
      roundLabel: string
      /**
       * **회차 경과**다. 리포트가 일괄 발행되므로 등재일이 회차 안에서 전부 같아
       * 개인 대기 일수가 안 생긴다(10-2 · OP-01 §3).
       */
      elapsedDays: number
      pending: number
      /** 다른 반 범위 `3~5일`. 11일이 긴 건지는 이것으로만 판단된다 */
      othersMinDays: number
      othersMaxDays: number
    }

// ── 응답 ────────────────────────────────────────────────────
/**
 * `GET /operator/dashboard?cohort={id}`
 *
 * 케이스 표가 **호출 하나**로 정해 뒀다. 블록별로 실패가 갈리므로 재시도는 전체
 * 재조회다 — 블록 단위 엔드포인트가 생기면 그때 나눈다.
 */
export type DashboardResponse = {
  /** 헤더 빵부스러기 `대시보드 › 7기 › 250명 · 10반` */
  cohortLabel: string
  trainees: number
  classes: number
  pipeline: Block<RoundPipeline>
  compare: Block<ClassCompare>
  /** **0건도 정상이다** — 빈 배열과 실패를 갈라야 한다(F3) */
  todos: Block<Todo[]>
}

/**
 * 목업 케이스 표의 에러코드. **표에 있는 것만 둔다** — 표에 없는 코드는 문구도 다음
 * 행동도 정해진 게 없어 화면이 받아도 쓸 수 없다(mock-first §5).
 */
export type DashboardErrorCode = 'DASHBOARD_UNAVAILABLE'
