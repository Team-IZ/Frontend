// ─────────────────────────────────────────────────────────────
// ⚠️ Mock 전용 데이터 — 백엔드 연동 시 이 파일을 통째로 삭제하세요.
// 실제로는 서버 DB의 orgs · cohorts · classes · trainees · managers · curricula ·
// usage 테이블이 이 역할을 합니다.
// (auth · projects의 mockDb.ts와 같은 방식 — 지울 것이 파일 경계로 보이게 둡니다)
// ─────────────────────────────────────────────────────────────
//
// 값은 목업 `docs/plan/v2/wireframe/operator/admin.html`에서 그대로 옮겼습니다.
// 숫자를 새로 지어내지 않습니다 — 7기의 `10반 250명`은 프로젝트 화면(OP-03)이 읽는
// 값과 같아야 하고(`features/operator/projects/mockDb.ts`의 COHORT), 반 인원 합이
// 명단 수와 어긋나면 배정 모드의 `미배정 3명`이 설명되지 않습니다.
//
// ▸ 목업끼리 어긋난 자리 셋은 아래 해당 위치에 `⚠ 목업 불일치`로 적어 뒀습니다.
import type {
  ClassRoom,
  Cohort,
  CostSummary,
  CurriculumDetail,
  Manager,
  Org,
  Trainee,
} from './types'

/**
 * 목업이 그려진 기준 시각. 실제 `new Date()`를 쓰면 값이 매일 달라져 목업과 대조할 때
 * 무엇이 맞는지 알 수 없습니다 — **기준 시각만 고정하고 계산은 실제로** 합니다.
 *
 * 날짜(`2026-07-16`)는 프로젝트 목의 `MOCK_TODAY`와 같은 날입니다. 시각은 매니저
 * 최근 접속이 `오늘 09:41` · `어제 18:02`로 읽히도록 그 뒤로 잡았습니다.
 */
export const MOCK_NOW = '2026-07-16T14:20'

export const ORG: Org = {
  id: 'green',
  name: '그린컴퍼니 부트캠프',
  domain: 'green.com',
}

// ── ① 기수 ──────────────────────────────────────────────────
export const COHORTS: Cohort[] = [
  /*
    **8기는 7기가 끝나갈 때 시작한다.** 부트캠프는 한 번에 한 기수를 돌리므로 두 기수가
    통째로 겹치면 안 된다 — 목이 `2026-06-01 ~ 09-30`으로 7기와 완전히 겹쳐 있어서
    비용 화면에 두 기수가 나란히 떴다(D39). 겹치는 것은 **전환기 한두 달**뿐이고,
    그 달의 청구서에는 실제로 두 기수가 같이 찍힌다.
  */
  {
    id: '8',
    name: '8기',
    status: 'RUNNING',
    classes: 10,
    trainees: 252,
    startAt: '2026-09-01',
    endAt: '2027-02-27',
    current: false,
  },
  {
    id: '7',
    name: '7기',
    status: 'RUNNING',
    classes: 10,
    trainees: 250,
    startAt: '2026-03-02',
    endAt: '2026-09-30',
    current: true,
  },
  {
    id: '6',
    name: '6기',
    status: 'CLOSED',
    classes: 9,
    trainees: 230,
    startAt: '2025-08-04',
    endAt: '2026-02-27',
    current: false,
  },
  {
    id: '5',
    name: '5기',
    status: 'CLOSED',
    classes: 8,
    trainees: 200,
    startAt: '2025-02-03',
    endAt: '2025-07-25',
    current: false,
  },
]

// ── ③ 매니저 ────────────────────────────────────────────────
/*
  ⚠ 목업 불일치 — 헤더는 `매니저 9명 · 활성 8 · 초대됨 1`인데 표에는 **정지 행**이
  같이 있습니다(최상현 · 퇴사). 8 + 1 = 9라 정지가 어디에도 안 세어져 있습니다.
  → 데이터를 원천으로 두고 화면이 **세 상태를 다 세어 보여줍니다**(활성 7 · 초대 대기
  1 · 정지 1 = 9). 숫자를 손으로 적으면 목을 고칠 때 헤더가 안 따라옵니다.
*/
/*
  ⚠ **`assignments` · `headcount` · `pastCohorts`를 손으로 적지 않는다.**

  셋 다 **반(CLASSES)에서 나오는 값**이라 손으로 적으면 반을 고칠 때 어긋난다.
  아래 목록에는 빈 값으로 두고, `api.ts`가 첫 조회 전에 한 번 파생시킨다
  (`syncManagerAssignments`) — 이 파일의 규칙(*"반 정의에서 채운다"*)을 매니저에도 적용한 것이다.
*/
export const MANAGERS: Manager[] = [
  {
    id: 'm-jihyun',
    name: '박지현',
    email: 'jihyun@green.com',
    cohortIds: [],
    assignments: [],
    pastCohorts: 0,
    headcount: null,
    status: 'ACTIVE',
    statusNote: null,
    lastSeenAt: '2026-07-16T09:41',
    invitedAt: '2026-02-20',
    invitedBy: '김오퍼레이터',
  },
  {
    id: 'm-doyun',
    name: '이도윤',
    email: 'doyun@green.com',
    cohortIds: [],
    assignments: [],
    pastCohorts: 0,
    headcount: null,
    status: 'ACTIVE',
    statusNote: null,
    lastSeenAt: '2026-07-15T18:02',
    invitedAt: '2026-02-20',
    invitedBy: '김오퍼레이터',
  },
  {
    id: 'm-yujin',
    name: '최유진',
    email: 'yujin@green.com',
    cohortIds: [],
    assignments: [],
    pastCohorts: 0,
    headcount: null,
    status: 'ACTIVE',
    statusNote: null,
    lastSeenAt: '2026-07-16T08:12',
    invitedAt: '2026-02-20',
    invitedBy: '김오퍼레이터',
  },
  {
    id: 'm-minseo',
    name: '강민서',
    email: 'minseo@green.com',
    cohortIds: [],
    assignments: [],
    pastCohorts: 0,
    headcount: null,
    status: 'ACTIVE',
    statusNote: null,
    lastSeenAt: '2026-07-14T11:30',
    invitedAt: '2026-02-20',
    invitedBy: '김오퍼레이터',
  },
  {
    id: 'm-seojun',
    name: '윤서준',
    email: 'seojun@green.com',
    cohortIds: [],
    assignments: [],
    pastCohorts: 0,
    headcount: null,
    status: 'ACTIVE',
    statusNote: null,
    lastSeenAt: '2026-07-16T10:05',
    invitedAt: '2026-02-20',
    invitedBy: '김오퍼레이터',
  },
  {
    id: 'm-haneul',
    name: '임하늘',
    email: 'haneul.lim@green.com',
    cohortIds: [],
    assignments: [],
    pastCohorts: 0,
    headcount: null,
    status: 'ACTIVE',
    statusNote: null,
    lastSeenAt: '2026-07-13T16:44',
    invitedAt: '2026-02-20',
    invitedBy: '김오퍼레이터',
  },
  {
    id: 'm-eunbi',
    name: '조은비',
    email: 'eunbi@green.com',
    cohortIds: [],
    assignments: [],
    pastCohorts: 0,
    headcount: null,
    status: 'ACTIVE',
    statusNote: null,
    lastSeenAt: '2026-07-16T09:02',
    invitedAt: '2026-02-20',
    invitedBy: '김오퍼레이터',
  },
  {
    // 초대만 나가고 아직 가입 전 — 이름은 받는 사람이 정한다
    id: 'm-invited',
    name: null,
    email: 'newmgr@green.com',
    // **7기 매니저로 초대받았다** — 반은 아직 없어도 소속은 있다(D38)
    cohortIds: ['7'],
    assignments: [],
    pastCohorts: 0,
    headcount: null,
    status: 'INVITED',
    statusNote: null,
    lastSeenAt: null,
    // 3주 전 초대라 아직 안 들어왔다 — `재발송`을 눌러야 할지가 이 날짜로 갈린다
    invitedAt: '2026-07-24',
    invitedBy: '김오퍼레이터',
  },
  {
    /*
      퇴사한 매니저를 **지우지 않고 정지로 남긴다**(OP-06 §3). 담당 반 배정이 기간형
      이력이라 6기 A·B반 담당이 누구였는지가 이 계정에 붙어 있다 — 지우면 지난 기수의
      기록이 끊긴다.
    */
    id: 'm-sanghyun',
    name: '최상현',
    email: 'sanghyun@green.com',
    /*
      **6기 소속이라 7기 목록에는 안 나온다**(D38). 6기 때 퇴사한 사람을 7기 운영 화면에서
      볼 이유가 없고, 기수를 6기로 바꾸면 그때 담당과 함께 보인다.
      `cohortIds`는 아래 6기 반에서도 파생되지만, 담당이 풀려도 소속은 남아야 한다.
    */
    cohortIds: ['6'],
    assignments: [],
    pastCohorts: 0,
    headcount: null,
    status: 'SUSPENDED',
    statusNote: '퇴사 2026-05-02',
    lastSeenAt: null,
    invitedAt: '2025-07-28',
    invitedBy: '김오퍼레이터',
  },
]

// ── ② 반 ────────────────────────────────────────────────────
/*
  7기 10반. **인원 합이 247명**이고 미배정 3명을 더하면 명단 250명이다 —
  배정 모드의 `미배정 3명`이 이 산수에서 나온다.

  F반만 담당이 없다. OP-01 `조치 필요`의 `⚠ 미배정 F반에 담당 매니저가 없습니다`가
  같은 사실을 가리킨다 — 두 화면이 같은 데이터를 읽어야 어긋나지 않는다.
*/
export const CLASSES: ClassRoom[] = [
  cls('A', 25, 'm-jihyun', '박지현', '2026-03-02'),
  cls('B', 25, 'm-doyun', '이도윤', '2026-03-02'),
  cls('C', 25, 'm-yujin', '최유진', '2026-03-02'),
  cls('D', 25, 'm-doyun', '이도윤', '2026-06-15'), // 중간에 넘겨받은 반
  cls('E', 25, 'm-minseo', '강민서', '2026-03-02'),
  cls('F', 22, null, null, null), // 담당 없음 — 배정된 적이 없으니 구간도 없다
  cls('G', 25, 'm-minseo', '강민서', '2026-05-11'),
  cls('H', 25, 'm-seojun', '윤서준', '2026-03-02'),
  cls('I', 25, 'm-haneul', '임하늘', '2026-03-02'),
  cls('J', 25, 'm-eunbi', '조은비', '2026-03-02'),

  /*
    **끝난 기수의 반들.** 담당은 기간형 이력이라(OP-06 §3) 지난 기수 반도 남아 있고,
    **기수 필터가 실제로 볼 것이 여기 있다** — 6기로 걸러 보면 그때 누가 무엇을 맡았는지가
    나와야 한다. 손으로 `MANAGERS`에 적지 않고 반에서 파생시킨다(이 파일의 규칙).

    5·6·7기를 연달아 맡은 사람(이도윤)을 일부러 뒀다 — 담당·인원이 역대 누적되면
    화면에서 바로 드러나는 자리다(D36).

    끝난 기수는 `CLOSED`라 반 탭(선택 기수=7기)·담당 없음 경고 어디에도 안 나온다.
  */
  { ...cls('A', 23, 'm-sanghyun', '최상현', '2025-08-04'), id: 'c6-a', cohortId: '6' },
  { ...cls('B', 24, 'm-sanghyun', '최상현', '2025-08-04'), id: 'c6-b', cohortId: '6' },
  { ...cls('C', 25, 'm-doyun', '이도윤', '2025-08-04'), id: 'c6-c', cohortId: '6' },
  { ...cls('D', 24, 'm-jihyun', '박지현', '2025-08-04'), id: 'c6-d', cohortId: '6' },
  { ...cls('A', 25, 'm-doyun', '이도윤', '2025-02-03'), id: 'c5-a', cohortId: '5' },
  { ...cls('B', 22, 'm-yujin', '최유진', '2025-02-03'), id: 'c5-b', cohortId: '5' },
]

function cls(
  letter: string,
  size: number,
  managerId: string | null,
  managerName: string | null,
  assignedAt: string | null,
): ClassRoom {
  return {
    id: `c-${letter.toLowerCase()}`,
    cohortId: '7',
    name: `${letter}반`,
    capacity: 25,
    size,
    managerId,
    managerName,
    assignedAt,
    // 조직 세팅을 하는 사람은 오퍼레이터 하나뿐이라 목에서는 고정이다
    assignedBy: assignedAt ? '김오퍼레이터' : null,
  }
}

// ── ② 명단 ──────────────────────────────────────────────────
/*
  목업에 이름이 적힌 사람만 손으로 두고, 나머지 정원은 아래에서 채운다. 250줄을 손으로
  적으면 반 인원과 어긋나는 순간을 아무도 못 잡는다 — **반 정의(CLASSES)에서 채운다.**

  ⚠ 목업 불일치 — 명단 탭은 `오지훈 · B반 · 초대됨`인데 배정 모드는 같은 사람을
  **미배정**으로 그린다. 배정 모드 쪽이 `미배정 3명`(양쪽 헤더가 같이 쓰는 수)과 맞으므로
  그쪽을 따랐다.
*/
/** 7기 개강일 — 명단 대부분이 이 날 한 번에 등록됐다(COHORTS의 `7기` 시작일) */
const OPENED_AT = '2026-03-02'

const UNASSIGNED: Trainee[] = [
  {
    id: 't-dohyun',
    name: '한도현',
    email: 'dohyun@green.com',
    classId: null,
    className: null,
    account: 'ACTIVE',
    statusNote: null,
    registeredAt: '2026-07-20',
  },
  {
    id: 't-haneul',
    name: '정하늘',
    email: 'haneul@green.com',
    classId: null,
    className: null,
    account: 'INVITED',
    statusNote: null,
    registeredAt: '2026-07-28',
  },
  {
    id: 't-jihoon',
    name: '오지훈',
    email: 'jihoon@green.com',
    classId: null,
    className: null,
    account: 'ACTIVE',
    statusNote: null,
    registeredAt: '2026-07-28',
  },
]

/** 목업에 이름이 나온 배정 완료 교육생 */
const NAMED_ASSIGNED: Trainee[] = [
  {
    id: 't-minjun',
    name: '김민준',
    email: 'minjun@green.com',
    classId: 'c-a',
    className: 'A반',
    account: 'ACTIVE',
    statusNote: null,
    registeredAt: OPENED_AT,
  },
  {
    id: 't-jiwoo',
    name: '서지우',
    email: 'jiwoo@green.com',
    classId: 'c-a',
    className: 'A반',
    account: 'INVITED',
    statusNote: null,
    registeredAt: OPENED_AT,
  },
  {
    id: 't-hyunwoo',
    name: '배현우',
    email: 'hyunwoo@green.com',
    classId: 'c-b',
    className: 'B반',
    account: 'ACTIVE',
    statusNote: null,
    registeredAt: OPENED_AT,
  },
]

/*
  나머지 정원을 채운다. 이름은 규칙으로 만들되 **반 인원(CLASSES.size)을 넘지 않는다** —
  목록의 `1–25 / 250명`과 반 표의 인원이 같은 원천에서 나와야 어긋나지 않는다.
*/
/*
  ⚠ **길이가 서로소여야 한다.** 처음에 성 10개 × 이름 10개를 `n % 10`으로 돌렸더니
  주기가 같아 **250명이 이름 10개를 25번씩** 나눠 가졌다 — 이름순으로 정렬하니 같은
  이름이 25줄씩 이어져서 검색·정렬이 도는지 화면으로 확인할 수 없었다.
  10과 13은 서로소라 130명까지 조합이 겹치지 않는다.
*/
const SURNAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임']
const GIVEN = [
  '서연',
  '지호',
  '하윤',
  '도윤',
  '서준',
  '지우',
  '예은',
  '시우',
  '수아',
  '건우',
  '나은',
  '태윤',
  '유진',
]

function fill(): Trainee[] {
  const rows: Trainee[] = []
  let n = 0
  for (const room of CLASSES) {
    const already = NAMED_ASSIGNED.filter((t) => t.classId === room.id).length
    for (let i = already; i < room.size; i++) {
      const name = `${SURNAMES[n % SURNAMES.length]}${GIVEN[n % GIVEN.length]}`
      rows.push({
        id: `t-${room.id}-${i}`,
        name,
        email: `t${String(n).padStart(3, '0')}@green.com`,
        classId: room.id,
        className: room.name,
        /*
          대부분 활성이고 몇 명만 초대 대기·비활성이다 — 필터가 실제로 걸리는지 보이게.
          **비활성이어도 반은 그대로다**(MG-05 헤더가 비활성을 반 인원 안에 센다).
        */
        account: n % 23 === 0 ? 'INVITED' : n % 41 === 0 ? 'INACTIVE' : 'ACTIVE',
        statusNote: n % 41 === 0 && n % 23 !== 0 ? '중도 이탈 2026-06-30' : null,
        // 대부분 개강일 일괄 등록이고 몇 명만 중도 합류다 — 등록일 정렬이 도는지 보이게
        registeredAt: n % 37 === 0 ? '2026-06-08' : OPENED_AT,
      })
      n++
    }
  }
  return rows
}

export const TRAINEES: Trainee[] = [...UNASSIGNED, ...NAMED_ASSIGNED, ...fill()]

// ── ④ 교안 ──────────────────────────────────────────────────
/*
  ⚠ 목업 불일치 — 목록의 `섹션 12 · 항목 87`은 상세에 그려진 섹션 8개(항목 82)와
  맞지 않는다. **개수를 손으로 적지 않고 `sectionList`에서 센다**(아래 `withCounts`) —
  목록과 상세가 같은 원천을 읽어야 둘이 어긋나지 않는다(D1).

  ⚠ 프로젝트 목과 다른 자리 — `features/operator/projects/mockDb.ts`는 Kubernetes를
  `teaches: []`(= 교안 항목 0 케이스)로 두는데, 이 화면 목업은 `완료 · 미프 2차 사용`
  이다. 이 화면의 목업을 따랐다. 두 목이 하나가 되는 것은 API가 붙을 때다.

  항목의 이름·정의·쪽수는 목업과 프로젝트 목에서 그대로 옮겼다 — 리포트·면담 브리프가
  이 위치를 가리키므로 지어내면 안 되는 값이다(14번 6-3).
*/
const AI_LLMOPS: Omit<CurriculumDetail, 'sections' | 'teachItems'> = {
  id: 'ai-llmops',
  name: 'AI_LLMOps',
  version: 'v2',
  linkedProjectNames: ['미프 3차', '미프 4차'],
  status: 'DONE',
  fileName: 'ai_llmops_v2.pdf',
  pageCount: 168,
  registeredAt: '2026-06-28 10:14',
  failureReason: null,
  sectionList: [
    {
      id: 's-hitl',
      name: 'HITL (Human In The Loop)',
      pages: 'p.48–60',
      items: [
        {
          id: 'hitl-def',
          name: 'HITL 개념 정의',
          page: 'p.48',
          definition:
            'HITL은 LLM 시스템의 의사결정을 통제하기 위한 Control Layer로, 실행 결과를 검증·차단·수정하며 사람을 시스템의 구성요소로 설계한다.',
        },
        {
          id: 'hitl-why',
          name: 'HITL이 필요한 이유',
          page: 'p.49',
          definition:
            '무한 재시도로 인한 비용 증가, Tool/API 호출 비용 리스크, 정책 위반으로 인한 법적·보안 사고를 통제하기 위해 HITL이 필요하다.',
        },
        {
          id: 'hitl-cases',
          name: 'HITL 적용 사례 비교',
          page: 'p.50',
          definition:
            '콘텐츠 생성·고객 응대 사례에서 Trigger 조건에 따라 사람이 승인/수정/차단/직접 응답으로 개입하는 패턴을 보여준다.',
        },
        {
          id: 'hitl-position',
          name: 'HITL의 위치와 역할',
          page: 'p.51',
          definition:
            'HITL은 특정 단계가 아니라 Design–Run–Trace–Evaluate–Improve 전체 운영 사이클을 관통하는 정책이다.',
        },
        {
          id: 'hitl-supervisor',
          name: 'Supervisor 패턴에서 HITL 구현 원칙',
          page: 'p.52',
          definition:
            'HITL은 중앙에서 통제되어야 하므로 Supervisor가 흐름과 개입을 모두 통제하며, Worker는 HITL을 호출하지 않고 사람도 하나의 Node로 취급한다.',
        },
        {
          id: 'hitl-flow',
          name: 'Supervisor 패턴의 HITL 실행 흐름',
          page: 'p.53',
          definition:
            'Supervisor가 HITL Trigger 함수로 개입 조건을 판정하고, Human은 APPROVE/REVISE/ABORT로 최종 의사결정을 수행한다.',
        },
        {
          id: 'hitl-checklist',
          name: 'HITL Design Checklist과 사용자 부담 Trade-off',
          page: 'p.58',
          definition:
            '개입 조건(정량+정책), 개입 방식, 개입 이후 흐름을 정의해야 하며, 안전성 vs 사용성 Trade-off를 위해 3가지 방안을 고려한다.',
        },
      ],
    },
    {
      id: 's-roles',
      name: '역할 기반 설계',
      pages: 'p.37–46',
      items: [
        {
          id: 'critic-role',
          name: 'Critic 역할',
          page: 'p.40',
          definition:
            'Critic은 실행 결과를 독립적으로 검토하여 정확성·일관성·정책 준수 여부를 평가하고, 필요 시 재실행을 요청한다.',
        },
        {
          id: 'supervisor-role',
          name: 'Supervisor 패턴과 역할 분리 구조',
          page: 'p.41',
          definition:
            'Supervisor 패턴은 전체 흐름을 통제하는 중앙 조정자가 Planner, Executor, Critic Worker를 호출해 역할을 분리하는 아키텍처이다.',
        },
      ],
    },
    {
      id: 's-snapshot',
      name: '시점 관리 (Snapshot)',
      pages: 'p.62–75',
      items: [
        {
          id: 'snapshot',
          name: 'Snapshot 개념과 구성 요소',
          page: 'p.63',
          definition:
            '실행 중 특정 시점의 State를 저장해 이후 재개·디버깅에 쓰는 구조와 그 구성 요소를 다룬다.',
        },
      ],
    },
    {
      id: 's-agent-design',
      name: 'AI Agent 설계 — 면접관 예제',
      pages: 'p.21–35',
      items: [
        {
          id: 'graph',
          name: 'Graph 구성',
          page: 'p.24',
          definition: '노드와 엣지로 실행 순서를 정의하고 조건 분기와 종료 조건을 설계한다.',
        },
        {
          id: 'state',
          name: 'State 관리',
          page: 'p.28',
          definition: 'AgentState를 TypedDict로 정의하고 노드 사이에서 무엇을 넘길지 결정한다.',
        },
      ],
    },
    {
      id: 's-trace',
      name: 'Trace 실행 관측',
      pages: 'p.77–154',
      items: [
        {
          id: 'trace-span',
          name: 'Trace와 Span 구조',
          page: 'p.80',
          definition:
            '한 번의 실행을 Trace로 묶고 각 노드·도구 호출을 Span으로 남겨 지연과 실패 지점을 추적한다.',
        },
      ],
    },
    {
      id: 's-llmops',
      name: 'LLMOps 개념 이해',
      pages: 'p.7–10',
      items: [
        {
          id: 'llmops-def',
          name: 'LLMOps 정의',
          page: 'p.7',
          definition:
            'LLM 기반 시스템을 설계·운영·관측·개선하는 반복 사이클 전체를 다루는 운영 방법론이다.',
        },
      ],
    },
  ],
  linked: [
    {
      id: 'mif-3',
      name: '미프 3차',
      cohortName: '7기',
      conceptNames: ['HITL Trigger 조건', 'Supervisor 역할 분리', 'Snapshot 구성 요소'],
      status: 'RUNNING',
      attended: 198,
      attendable: 231,
    },
    {
      id: 'mif-4',
      name: '미프 4차',
      cohortName: '7기',
      conceptNames: [],
      status: 'READY',
      attended: null,
      attendable: null,
    },
  ],
}

const STREAMLIT: Omit<CurriculumDetail, 'sections' | 'teachItems'> = {
  id: 'streamlit',
  name: 'Streamlit 실습',
  version: 'v1',
  linkedProjectNames: ['미프 3차'],
  status: 'DONE',
  fileName: 'streamlit_v1.pdf',
  pageCount: 64,
  registeredAt: '2026-07-02 09:20',
  failureReason: null,
  sectionList: [
    {
      id: 's-session',
      name: '세션 상태',
      pages: 'p.18–31',
      items: [
        {
          id: 'session-state',
          name: '세션 상태와 재실행',
          page: 'p.22',
          definition:
            '위젯을 조작하면 스크립트가 처음부터 다시 실행되며, 유지해야 할 값은 session_state에 둔다.',
        },
      ],
    },
    {
      id: 's-layout',
      name: '레이아웃과 위젯',
      pages: 'p.8–17',
      items: [
        {
          id: 'layout-widget',
          name: '컬럼·컨테이너 배치',
          page: 'p.11',
          definition: 'columns와 container로 화면을 나누고 위젯을 배치하는 방법을 다룬다.',
        },
      ],
    },
  ],
  linked: [
    {
      id: 'mif-3',
      name: '미프 3차',
      cohortName: '7기',
      conceptNames: [],
      status: 'RUNNING',
      attended: 198,
      attendable: 231,
    },
  ],
}

const K8S: Omit<CurriculumDetail, 'sections' | 'teachItems'> = {
  id: 'k8s',
  name: 'Kubernetes 기초',
  version: 'v1',
  linkedProjectNames: ['미프 2차'],
  status: 'DONE',
  fileName: 'k8s_basic_v1.pdf',
  pageCount: 88,
  registeredAt: '2026-06-10 15:33',
  failureReason: null,
  sectionList: [
    {
      id: 's-workload',
      name: '워크로드',
      pages: 'p.20–39',
      items: [
        {
          id: 'deployment',
          name: 'Deployment',
          page: 'p.24',
          definition: 'ReplicaSet을 통해 파드 수를 유지하고 롤링 업데이트로 버전을 교체한다.',
        },
        {
          id: 'configmap',
          name: 'ConfigMap',
          page: 'p.33',
          definition: '설정값을 이미지와 분리해 두고 파드에 환경변수·볼륨으로 주입한다.',
        },
      ],
    },
    {
      id: 's-network',
      name: '네트워킹',
      pages: 'p.41–58',
      items: [
        {
          id: 'service',
          name: 'Service',
          page: 'p.45',
          definition: '셀렉터로 파드 묶음을 고정 주소 뒤에 두어 클러스터 안팎에서 접근하게 한다.',
        },
      ],
    },
  ],
  linked: [
    {
      id: 'mif-2',
      name: '미프 2차',
      cohortName: '7기',
      conceptNames: ['Service', 'Deployment', 'ConfigMap'],
      status: 'DONE',
      attended: null,
      attendable: null,
    },
  ],
}

/**
 * 분석 실패 교안. **가르친 항목이 없으므로 프로젝트에 연결할 수 없다**(OP-03 `교안에 항목 0`).
 * 실패 사유를 그대로 화면에 쓴다 — 무엇을 고쳐야 하는지가 거기 있다.
 */
const DATA_PIPELINE: Omit<CurriculumDetail, 'sections' | 'teachItems'> = {
  id: 'data-pipeline',
  name: '데이터 파이프라인',
  version: 'v1',
  linkedProjectNames: [],
  status: 'FAILED',
  fileName: 'data_pipeline_v1.pdf',
  pageCount: 92,
  registeredAt: '2026-07-26 14:02',
  failureReason:
    '파일에 암호가 걸려 있어 본문을 읽을 수 없습니다. 암호를 푼 파일로 다시 올려 주세요.',
  sectionList: [],
  linked: [],
}

/**
 * 섹션 수·항목 수를 **손으로 적지 않고 센다.**
 * 손으로 적으면 목을 고칠 때 목록만 낡고, 목록과 상세가 서로 다른 말을 하게 된다.
 * 분석이 안 끝난 교안은 `null`이다 — **0과 다르다**(F3).
 */
function withCounts(c: Omit<CurriculumDetail, 'sections' | 'teachItems'>): CurriculumDetail {
  const analyzed = c.status === 'DONE'
  return {
    ...c,
    sections: analyzed ? c.sectionList.length : null,
    teachItems: analyzed ? c.sectionList.reduce((n, s) => n + s.items.length, 0) : null,
  }
}

export const CURRICULA: CurriculumDetail[] = [AI_LLMOPS, STREAMLIT, K8S, DATA_PIPELINE].map(
  withCounts,
)

// ── ⑤ 비용 ──────────────────────────────────────────────────
/*
  ⚠ 이번 달(2026-07)에는 **7기만 돌고 있다.** 8기는 9월 시작이라 아직 비용이 없다 —
  기수 카드가 하나만 뜨는 것이 정상이고, 전환기(9월)에 둘이 된다.

  `previousTotal`은 증감의 근거다 — `+12%`만 있으면 얼마에서 얼마로 늘었는지 모른다(D39).
*/
export const COST: CostSummary = {
  month: '2026-07',
  total: 268,
  previousTotal: 239,
  /*
    기수 누적 — 아래 `monthly` 합과 같아야 한다. 화면이 둘을 같이 보여주므로 어긋나면
    바로 드러난다(D39에서 반 합계가 기수 총액과 안 맞던 것과 같은 자리).
  */
  cohortTotal: 1147,
  // 계약 예산은 **기수 전체** 기준이다 — 월 예산으로 두면 7개월치 판단을 못 한다
  budget: 2400,
  monthsLeft: 2,
  changePct: 12,
  /*
    **최근이 앞으로.** 3월 개강이라 다섯 달치가 쌓였다.

    `projectNames`가 금액을 설명한다 — 회차가 둘인 6·7월이 비싸고, 5월은 회차 없이
    재시험만 있던 달이라 싸다. 이것이 없으면 `$268`이 많은지 적은지 판단할 수 없다(D40).
  */
  monthly: [
    { month: '2026-07', amount: 268, sessions: 668, projectNames: ['미프 4차', '빅프 1차'] },
    { month: '2026-06', amount: 239, sessions: 601, projectNames: ['미프 3차'] },
    { month: '2026-05', amount: 168, sessions: 422, projectNames: [] },
    { month: '2026-04', amount: 251, sessions: 631, projectNames: ['미프 1차', '미프 2차'] },
    { month: '2026-03', amount: 221, sessions: 555, projectNames: ['오리엔테이션 진단'] },
  ],
  cohorts: [{ id: '7', name: '7기', amount: 268, trainees: 250, period: '2026-03 ~ 09' }],
}

/*
  반별 [이번 달 세션, 이번 달 비용, 누적 세션, 누적 비용].

  **합이 위 총계와 맞아야 한다** — 이번 달 비용 합 = `COST.total`(268), 누적 비용 합 =
  `COST.cohortTotal`(1147), 이번 달 세션 합 = `monthly[0].sessions`(668). 화면이 이 수들을
  같이 보여주므로 어긋나면 바로 드러난다.

  **F반이 이번 달은 중간인데 누적 1위다.** 이번 달만 보면 안 보이는 반을 일부러 뒀다 —
  그래야 누적 열이 왜 필요한지가 화면에서 보인다(D41). 22명인데 재시험이 계속 많았던 반이다.
*/
/*
  반별 **기수 누적** [세션, 비용].

  이 값이 **월별 배분의 가중치이자 누적 합계**다 — 반 10개 × 월 5개 = 50칸을 손으로 적으면
  월 총액과 어긋나는 순간을 아무도 못 잡는다. `api.ts`가 이 가중치로 각 달을 나눈다(D42).

  합계가 위 총계와 맞는다 — 세션 2877 = `monthly` 세션 합, 비용 1147 = `cohortTotal`.

  **F반이 누적 1위다.** 22명인데 재시험이 계속 많았던 반이라, *이번 달만 보면 중간인데
  누적으로는 가장 비싼* 자리를 만든다(D41).
*/
export const CLASS_TOTAL: Record<string, [number, number]> = {
  'c-a': [296, 118],
  'c-b': [281, 112],
  'c-c': [321, 128],
  'c-d': [288, 115],
  'c-e': [256, 102],
  'c-f': [346, 138],
  'c-g': [296, 118],
  'c-h': [286, 114],
  'c-i': [263, 105],
  'c-j': [244, 97],
}
