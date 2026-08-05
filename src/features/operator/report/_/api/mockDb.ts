// ─────────────────────────────────────────────────────────────
// ⚠️ Mock 전용 데이터 — 백엔드 연동 시 이 파일을 통째로 삭제하세요.
// 실제로는 서버가 발행 시점에 얼린 리포트 스냅샷입니다.
// ─────────────────────────────────────────────────────────────
//
// 기수·회차·개념 이름은 **지어내지 않고 `projects/mockDb.ts`(OP-03/OP-04)의 값을
// 그대로 옮겼습니다.** 도메인 경계상 런타임 import는 안 되지만(features/A는
// features/B를 모른다), 같은 "7기"를 두 화면이 다른 이름으로 그리면 오퍼레이터가
// 프로젝트 탭과 리포트 탭에서 서로 다른 현실을 보게 됩니다(mock-first §2-4).
//
// ⚠ projects/mockDb.ts 기준 "7기"는 지금 미프 1·2차만 `DONE`, 3차 `RUNNING`,
// 4차 `READY`, 5·6차 `PREP`입니다 — 등록된 회차는 6개뿐이고 6차까지 전부 끝난
// 상태가 아닙니다. 이 리포트가 "본체"(확정된 개념별 도달 분포)를 보여주려면
// 6차까지 발행된 **미래 시점**을 가정해야 하는데, 그 시점의 회차 구성(5·6차에
// 어떤 개념이 배정됐는지)은 아직 어느 화면에도 없습니다 — 아래 CONFIRMED
// 시나리오의 5·6차 개념 배정은 이 파일에서 처음 지어낸 값입니다(개념 **이름**은
// 기존 카탈로그에서만 골랐고, **배정**만 새로 만들었습니다). projects 쪽 회차가
// 실제로 6차까지 끝나면 그 값으로 맞바꿉니다.

import type {
  ClassRiskRate,
  ConceptDiagnosis,
  GroupShortfall,
  Report,
  ReachDistribution,
  RoundDiagnosis,
  TopStudent,
} from './types'

export const COHORT_NAME = '7기'
export const TRAINEE_COUNT = 250
export const CLASS_COUNT = 10
export const CLASS_NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].map((c) => `${c}반`)

/**
 * 어느 시나리오를 보여줄지 — **개발·QA 전용 스위치입니다.** 실제 서버는 상태
 * 하나만 내려주지만, 케이스 표 전량(§8)을 화면에서 확인하려면 여기서 바꿔 봅니다.
 * 기본값은 화면이 가장 완성된 모습(CONFIRMED)을 보여주는 값으로 뒀습니다 —
 * 연동 시 이 상수와 아래 IN_PROGRESS 분기를 통째로 지우고 서버 값을 그대로 씁니다.
 *
 * ⚠ 원래 이 화면은 "수업 진단"(미프 종료 후 확정)·"기수 결산"(빅프 종료 후 확정)
 * 2탭이라 시나리오 스위치도 둘이었다. 빅프로젝트가 제품에서 빠지면서(사용자 결정)
 * 두 탭이 하나로 합쳐졌고, 확정 시점도 "미프 전체 회차 완료" 하나뿐이라 스위치도
 * 하나로 줄었다.
 */
export const REPORT_SCENARIO: 'IN_PROGRESS' | 'CONFIRMED' = 'CONFIRMED'

const dist = (
  level1: number,
  level2: number,
  level3: number,
  level4: number,
  unasked: number,
): ReachDistribution => ({ level1, level2, level3, level4, unasked })

// ── 개념 카탈로그 — projects/mockDb.ts CURRICULA에서 그대로 옮김 ──
const CURRICULUM = {
  aiLlmops: { name: 'AI_LLMOps', version: 'v2' },
  k8s: { name: 'Kubernetes 기초', version: 'v1' },
  streamlit: { name: 'Streamlit 실습', version: 'v1' },
}

/*
  회차별 검증 개념 배정. 1~4차는 projects/mockDb.ts PROJECTS의 실제 값이고,
  5·6차는 CONFIRMED 시나리오를 위해 이 파일이 처음 배정한 값이다(위 파일 머리 주석).
*/
const ROUND_CONCEPTS: Record<
  string,
  { id: string; name: string; curriculum: keyof typeof CURRICULUM; section: string; page: string }[]
> = {
  '미니프로젝트 1차': [
    {
      id: 'k8s-service',
      name: 'Service와 셀렉터',
      curriculum: 'k8s',
      section: '네트워킹 (p.28–40)',
      page: 'p.31',
    },
    {
      id: 'k8s-deployment',
      name: 'Deployment 롤링 업데이트',
      curriculum: 'k8s',
      section: '워크로드 (p.12–27)',
      page: 'p.19',
    },
    {
      id: 'k8s-configmap',
      name: 'ConfigMap과 설정 분리',
      curriculum: 'k8s',
      section: '설정 (p.41–52)',
      page: 'p.44',
    },
  ],
  '미니프로젝트 2차': [
    {
      id: 'k8s-service',
      name: 'Service와 셀렉터',
      curriculum: 'k8s',
      section: '네트워킹 (p.28–40)',
      page: 'p.31',
    },
    {
      id: 'k8s-deployment',
      name: 'Deployment 롤링 업데이트',
      curriculum: 'k8s',
      section: '워크로드 (p.12–27)',
      page: 'p.19',
    },
    {
      id: 'k8s-configmap',
      name: 'ConfigMap과 설정 분리',
      curriculum: 'k8s',
      section: '설정 (p.41–52)',
      page: 'p.44',
    },
  ],
  '미니프로젝트 3차': [
    {
      id: 'hitl-flow',
      name: 'Supervisor 패턴의 HITL 실행 흐름',
      curriculum: 'aiLlmops',
      section: 'HITL (p.48–60)',
      page: 'p.53',
    },
    {
      id: 'supervisor-role',
      name: 'Supervisor 패턴과 역할 분리 구조',
      curriculum: 'aiLlmops',
      section: '역할 기반 설계 (p.37–46)',
      page: 'p.41',
    },
    {
      id: 'snapshot',
      name: 'Snapshot 개념과 구성 요소',
      curriculum: 'aiLlmops',
      section: '시점 관리 (p.62–75)',
      page: 'p.63',
    },
  ],
  '미니프로젝트 4차': [
    {
      id: 'hitl-def',
      name: 'HITL 개념 정의',
      curriculum: 'aiLlmops',
      section: 'HITL (p.48–60)',
      page: 'p.48',
    },
    {
      id: 'supervisor-role',
      name: 'Supervisor 패턴과 역할 분리 구조',
      curriculum: 'aiLlmops',
      section: '역할 기반 설계 (p.37–46)',
      page: 'p.41',
    },
    {
      id: 'critic-role',
      name: 'Critic 역할',
      curriculum: 'aiLlmops',
      section: '역할 기반 설계 (p.37–46)',
      page: 'p.40',
    },
  ],
  // ⚠ 5·6차는 이 파일에서 처음 배정한 값 — 위 파일 머리 주석 참고
  '미니프로젝트 5차': [
    {
      id: 'session-state',
      name: '세션 상태와 재실행',
      curriculum: 'streamlit',
      section: '세션 상태 (p.18–31)',
      page: 'p.22',
    },
    {
      id: 'hitl-def',
      name: 'HITL 개념 정의',
      curriculum: 'aiLlmops',
      section: 'HITL (p.48–60)',
      page: 'p.48',
    },
    {
      id: 'snapshot',
      name: 'Snapshot 개념과 구성 요소',
      curriculum: 'aiLlmops',
      section: '시점 관리 (p.62–75)',
      page: 'p.63',
    },
  ],
  '미니프로젝트 6차': [
    {
      id: 'critic-role',
      name: 'Critic 역할',
      curriculum: 'aiLlmops',
      section: '역할 기반 설계 (p.37–46)',
      page: 'p.40',
    },
    {
      id: 'hitl-flow',
      name: 'Supervisor 패턴의 HITL 실행 흐름',
      curriculum: 'aiLlmops',
      section: 'HITL (p.48–60)',
      page: 'p.53',
    },
    {
      id: 'k8s-service',
      name: 'Service와 셀렉터',
      curriculum: 'k8s',
      section: '네트워킹 (p.28–40)',
      page: 'p.31',
    },
  ],
}

const ROUND_DISTRIBUTION: Record<string, ReachDistribution> = {
  '미니프로젝트 1차': dist(14, 28, 87, 105, 2),
  '미니프로젝트 2차': dist(21, 40, 92, 81, 1),
  '미니프로젝트 3차': dist(62, 71, 58, 37, 3),
  '미니프로젝트 4차': dist(28, 44, 86, 70, 1),
  '미니프로젝트 5차': dist(44, 58, 74, 48, 2),
  '미니프로젝트 6차': dist(22, 35, 88, 76, 3),
}

const below2 = (d: ReachDistribution) => d.level1 + d.level2
const graded = (d: ReachDistribution) => d.level1 + d.level2 + d.level3 + d.level4 + d.unasked

function buildRounds(roundNames: string[]): RoundDiagnosis[] {
  return roundNames.map((name) => {
    const d = ROUND_DISTRIBUTION[name]
    return {
      id: name,
      name,
      conceptNames: ROUND_CONCEPTS[name].map((c) => c.name),
      distribution: d,
      gradedCount: graded(d),
      totalCount: TRAINEE_COUNT,
      belowLevel2Count: below2(d),
    }
  })
}

// 개념별 분포 — 그 개념이 등장한 회차들에 걸친 값(이 파일이 만든 값, 위 머리 주석 참고)
const CONCEPT_DISTRIBUTION: Record<string, ReachDistribution> = {
  'k8s-service': dist(18, 34, 98, 79, 4),
  'k8s-deployment': dist(41, 66, 74, 51, 2),
  'k8s-configmap': dist(21, 33, 96, 81, 3),
  'hitl-flow': dist(29, 54, 88, 56, 4),
  'supervisor-role': dist(62, 71, 58, 37, 6),
  snapshot: dist(18, 37, 92, 79, 3),
  'hitl-def': dist(25, 40, 89, 74, 4),
  'critic-role': dist(33, 47, 87, 59, 4),
  'session-state': dist(15, 29, 101, 76, 5),
}

function buildConcepts(roundNames: string[]): ConceptDiagnosis[] {
  const byId = new Map<
    string,
    {
      name: string
      curriculum: keyof typeof CURRICULUM
      section: string
      page: string
      rounds: string[]
    }
  >()
  for (const round of roundNames) {
    for (const c of ROUND_CONCEPTS[round]) {
      const existing = byId.get(c.id)
      if (existing) existing.rounds.push(round)
      else
        byId.set(c.id, {
          name: c.name,
          curriculum: c.curriculum,
          section: c.section,
          page: c.page,
          rounds: [round],
        })
    }
  }
  const list = [...byId.entries()].map(([id, c]) => {
    const d = CONCEPT_DISTRIBUTION[id]
    const curriculum = CURRICULUM[c.curriculum]
    return {
      id,
      name: c.name,
      curriculumName: curriculum.name,
      curriculumVersion: curriculum.version,
      section: `${c.section.split(' ')[0]} ${c.page}`,
      rounds: c.rounds,
      distribution: d,
      gradedCount: graded(d),
      totalCount: TRAINEE_COUNT,
      belowLevel2Count: below2(d),
    }
  })

  // "교안을 고칠 곳"(정의서 §5②)이 본체인데 나열 순서가 회차 등장 순(우연)이면
  // 제일 심한 개념을 스캔해서 찾아야 한다. 정렬이 순위를 말하게 한다(E2) — 색
  // 임계값(E8 위반, 아래서 뺀 것)을 안 쓰는 대신 이 정렬이 "고칠 곳"을 알려준다.
  // 교안 그룹은 그 교안의 최악 개념 기준으로, 그룹 안은 개념별 심각도로 내림차순.
  const severity = (c: (typeof list)[number]) => c.belowLevel2Count / c.gradedCount
  const worstByCurriculum = new Map<string, number>()
  for (const c of list) {
    worstByCurriculum.set(
      c.curriculumName,
      Math.max(worstByCurriculum.get(c.curriculumName) ?? 0, severity(c)),
    )
  }
  return list.sort((a, b) => {
    const byCurriculum =
      worstByCurriculum.get(b.curriculumName)! - worstByCurriculum.get(a.curriculumName)!
    return byCurriculum !== 0 ? byCurriculum : severity(b) - severity(a)
  })
}

const IN_PROGRESS_ROUNDS = ['미니프로젝트 1차', '미니프로젝트 2차']
const CONFIRMED_ROUNDS = [
  '미니프로젝트 1차',
  '미니프로젝트 2차',
  '미니프로젝트 3차',
  '미니프로젝트 4차',
  '미니프로젝트 5차',
  '미니프로젝트 6차',
]

// ── 우수 교육생(9-3 "회차마다 반 상위 1~2명") — 미프만으로 완성되는 값이라
// 빅프를 기다릴 이유가 없었다. 빅프 삭제로 실제로 바뀐 것은 "빅프 최저 도달"
// 열 하나뿐이다 — 그 열을 뺀 것 말고는 손 안 댔다.
const TOP_STUDENTS: TopStudent[] = [
  { id: 't1', name: '정하늘', className: 'A반', miniTopCount: 5, miniTopRounds: [1, 2, 3, 5, 6] },
  { id: 't2', name: '김서윤', className: 'C반', miniTopCount: 5, miniTopRounds: [1, 3, 4, 5, 6] },
  { id: 't3', name: '이준서', className: 'D반', miniTopCount: 4, miniTopRounds: [2, 4, 5, 6] },
  { id: 't4', name: '박도윤', className: 'B반', miniTopCount: 4, miniTopRounds: [1, 2, 5, 6] },
  { id: 't5', name: '최유나', className: 'I반', miniTopCount: 4, miniTopRounds: [3, 4, 5, 6] },
  { id: 't6', name: '오세림', className: 'E반', miniTopCount: 3, miniTopRounds: [1, 4, 6] },
  { id: 't7', name: '윤가온', className: 'G반', miniTopCount: 3, miniTopRounds: [2, 3, 5] },
  { id: 't8', name: '권나윤', className: 'F반', miniTopCount: 3, miniTopRounds: [1, 4, 5] },
  { id: 't9', name: '문태준', className: 'H반', miniTopCount: 3, miniTopRounds: [2, 3, 6] },
  { id: 't10', name: '백승우', className: 'J반', miniTopCount: 3, miniTopRounds: [1, 3, 5] },
  { id: 't11', name: '남시우', className: 'J반', miniTopCount: 2, miniTopRounds: [4, 6] },
  { id: 't12', name: '한지우', className: 'F반', miniTopCount: 2, miniTopRounds: [3, 5] },
  { id: 't13', name: '강태희', className: 'H반', miniTopCount: 2, miniTopRounds: [1, 2] },
  { id: 't14', name: '임채원', className: 'A반', miniTopCount: 2, miniTopRounds: [2, 5] },
  { id: 't15', name: '조은채', className: 'B반', miniTopCount: 2, miniTopRounds: [1, 3] },
  { id: 't16', name: '배시현', className: 'C반', miniTopCount: 2, miniTopRounds: [4, 6] },
  { id: 't17', name: '신하람', className: 'D반', miniTopCount: 2, miniTopRounds: [2, 6] },
  { id: 't18', name: '류지호', className: 'E반', miniTopCount: 1, miniTopRounds: [5] },
  { id: 't19', name: '권나윤', className: 'F반', miniTopCount: 1, miniTopRounds: [2] },
  { id: 't20', name: '문태준', className: 'G반', miniTopCount: 1, miniTopRounds: [6] },
  { id: 't21', name: '백승우', className: 'H반', miniTopCount: 1, miniTopRounds: [1] },
  { id: 't22', name: '손민재', className: 'I반', miniTopCount: 1, miniTopRounds: [4] },
  { id: 't23', name: '양지훈', className: 'J반', miniTopCount: 1, miniTopRounds: [3] },
  { id: 't24', name: '우다인', className: 'A반', miniTopCount: 1, miniTopRounds: [6] },
]

// 마지막 확정 회차 below2를 반별로 나눈다(순위는 OP-01 반 비교와 같은 감각으로 배치)
const CLASS_AT_RISK: [string, number][] = [
  ['C반', 9],
  ['D반', 8],
  ['I반', 7],
  ['A반', 6],
  ['F반', 6],
  ['B반', 5],
  ['H반', 5],
  ['J반', 4],
  ['E반', 4],
  ['G반', 3],
]

const GROUP_SHORTFALLS: GroupShortfall[] = [
  {
    conceptName: 'Supervisor 패턴과 역할 분리 구조',
    curriculumName: 'AI_LLMOps v2',
    section: '역할 기반 설계 (p.37–46) · p.41',
    round: '미니프로젝트 3차',
    className: 'C반',
    shortfallCount: 14,
    totalCount: 25,
  },
  {
    conceptName: 'Supervisor 패턴과 역할 분리 구조',
    curriculumName: 'AI_LLMOps v2',
    section: '역할 기반 설계 (p.37–46) · p.41',
    round: '미니프로젝트 4차',
    className: 'A반',
    shortfallCount: 13,
    totalCount: 24,
  },
  {
    conceptName: 'Deployment 롤링 업데이트',
    curriculumName: 'Kubernetes 기초 v1',
    section: '워크로드 (p.12–27) · p.19',
    round: '미니프로젝트 2차',
    className: 'F반',
    shortfallCount: 13,
    totalCount: 25,
  },
]

export function loadReport(): Report {
  const roundNames = REPORT_SCENARIO === 'CONFIRMED' ? CONFIRMED_ROUNDS : IN_PROGRESS_ROUNDS
  const rounds = buildRounds(roundNames)
  const concepts = buildConcepts(roundNames)
  const gradedCount = rounds.reduce((n, r) => n + r.gradedCount, 0)
  const totalSubmissionCount = TRAINEE_COUNT * roundNames.length
  const excludedTotal = totalSubmissionCount - gradedCount
  // 미응시:무효:중단 비 71:33:15(=119) 비율을 그대로 늘려 쓴다 — 새 숫자를 짓지 않는다
  const notTaken = Math.round((excludedTotal * 71) / 119)
  const invalid = Math.round((excludedTotal * 33) / 119)
  const interrupted = excludedTotal - notTaken - invalid

  const isConfirmed = REPORT_SCENARIO === 'CONFIRMED'
  const lastRound = roundNames[roundNames.length - 1]

  /*
    우수 교육생 · 반별 위험자 비율 · 집단 미달 — 셋 다 CONFIRMED에서만 채운다.
    개념별 도달 분포는 완료된 회차만큼 부분적으로 보여줄 수 있지만(§4-1), 이
    셋의 목 데이터는 6회차가 전부 끝났다는 전제로 지어져 있어(우수 판정 이력이
    6차까지 참조) IN_PROGRESS 상태에서 그대로 보여주면 아직 없는 회차의 결과를
    미리 보여주는 셈이 된다 — 그래서 CONFIRMED로 게이트한다.
  */
  const topStudents = isConfirmed ? TOP_STUDENTS : []
  const classRisk: ClassRiskRate[] = isConfirmed
    ? [
        {
          className: '기수 전체',
          traineeCount: TRAINEE_COUNT,
          atRiskCount: below2(ROUND_DISTRIBUTION[lastRound]),
        },
        ...CLASS_AT_RISK.map(([className, atRiskCount]) => ({
          className,
          traineeCount: TRAINEE_COUNT / CLASS_COUNT,
          atRiskCount,
        })),
      ]
    : []
  const groupShortfalls = isConfirmed ? GROUP_SHORTFALLS : []

  return {
    status: isConfirmed ? 'CONFIRMED' : 'IN_PROGRESS',
    cohortName: COHORT_NAME,
    publishedAt: isConfirmed ? '2026-08-25' : null,
    completedRounds: roundNames.length,
    totalRounds: CONFIRMED_ROUNDS.length,
    periodStart: '2026-03-02',
    periodEnd: isConfirmed ? '2026-08-25' : null,
    traineeCount: TRAINEE_COUNT,
    classCount: CLASS_COUNT,
    // 개념별 도달 분포 섹션과 같은 값 — 회차×3(배정 슬롯 수)이 아니라 중복 제거한 고유 개념 수.
    // 한 개념이 여러 회차에 걸쳐 쓰이므로(예: 미프 1·2·6차 모두 "Service와 셀렉터") 둘은 다르다.
    conceptCount: concepts.length,
    curriculumCount: new Set(concepts.map((c) => c.curriculumName)).size,
    gradedCount,
    totalSubmissionCount,
    excluded: { notTaken, invalid, interrupted },
    concepts,
    rounds,
    topStudents,
    classRiskRoundLabel: `${lastRound} 기준`,
    classRisk,
    groupShortfalls,
  }
}
