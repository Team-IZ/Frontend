// ⚠️ Mock 전용 데이터 — 백엔드 연동 시 이 파일을 통째로 삭제하세요.
//
// 반·회차·위험 비율은 여기 없다 — OP-01 대시보드와 **같은 값을 읽어야** 해서
// `@/mocks/cohortRounds`에 있다(mock-first §2-4). 이 파일은 **분석에만 있는 값**만
// 갖는다: 팀 계층, 기수 간 비교.
import type { ConceptCompare } from './types'

/**
 * C반의 팀. **팀은 프로젝트마다 재편성된다**(TeamMembership) — 사람에 고정으로 붙지
 * 않는다. 그래서 가로로 이으면 **다른 사람들의 값을 잇는 것**이라 방향이 뜻을 갖지 않고,
 * 화면도 세로로만 읽는다.
 *
 * **위험자를 실수로 둔다.** 4명 팀에서 1명이면 25%라 비율이 튀므로 화면이 실수를 같이
 * 쓰고, 무엇보다 **팀 합이 반 값과 맞아야** 한다 — 안 맞으면 같은 반을 두 계층이 다르게
 * 말한다(OP-01에서 기수↔반 합계로 같은 문제를 겪었다).
 *
 * ⚠ **목업 2차 값을 하나 고쳤다.** 목업은 6팀 2차를 `25%`로 뒀는데 **5명의 25%는
 * 1.25명이라 애초에 나올 수 없는 값**이고, 그대로 두면 팀 합 7명 ≠ C반 2차 6명이 된다.
 * `0`으로 내렸다 — 1·3차는 목업 그대로 합이 맞는다(4명 · 8명).
 */
export const C_TEAMS = [
  { name: '1팀', size: 4, risky: [0, 1, 0] },
  { name: '2팀', size: 4, risky: [2, 3, 3] },
  { name: '3팀', size: 4, risky: [1, 1, 2] },
  { name: '4팀', size: 4, risky: [1, 0, 0] },
  { name: '5팀', size: 4, risky: [0, 1, 3] },
  { name: '6팀', size: 5, risky: [0, 0, 0] },
]

/** 팀별 미집계. 합(4)이 C반 미집계와 같아야 한다 */
export const C_TEAM_UNCOUNTED: Record<
  string,
  { absent: number; invalid: number; aborted: number }
> = {
  '1팀': { absent: 1, invalid: 0, aborted: 0 },
  '2팀': { absent: 1, invalid: 0, aborted: 0 },
  '3팀': { absent: 0, invalid: 0, aborted: 0 },
  '4팀': { absent: 0, invalid: 0, aborted: 0 },
  '5팀': { absent: 0, invalid: 1, aborted: 0 },
  '6팀': { absent: 0, invalid: 1, aborted: 0 },
}

/** 비교 가능한 기수. 비어 있으면 첫 기수다 — **다른 기관 평균을 만들지 않는다** */
export const AVAILABLE_COHORTS = [{ id: '6', label: '6기' }]

/**
 * 기수 간 비교 — **같은 교안·같은 개념만.**
 *
 * 값이 **평균 도달 단계(1~4)** 다. 같은 것을 물었으므로 두 기수에서 뜻이 같고,
 * 그래서 회차 흐름 탭과 달리 **절대 눈금**으로 읽는다.
 */
export const CONCEPT_COMPARE: ConceptCompare[] = [
  {
    conceptId: 'c-graph',
    conceptName: 'Graph 구성',
    source: '교안 AI_LLMOps · 4장 p.62 · 미프 3차',
    baseAvg: 2.9,
    currentAvg: 2.5,
    baseVersion: 'v1',
    currentVersion: 'v2',
  },
  {
    conceptId: 'c-tx',
    conceptName: '트랜잭션',
    source: '교안 Kubernetes 기초 · 3장 p.44 · 미프 2차',
    baseAvg: 3.2,
    currentAvg: 2.9,
    baseVersion: 'v3',
    currentVersion: 'v3',
  },
  {
    conceptId: 'c-hitl',
    conceptName: 'HITL Trigger',
    source: '교안 AI_LLMOps · 3장 p.55 · 미프 3차',
    baseAvg: 2.7,
    currentAvg: 2.8,
    baseVersion: 'v2',
    currentVersion: 'v2',
  },
  {
    conceptId: 'c-rest',
    conceptName: 'REST 설계',
    source: '교안 Kubernetes 기초 · 1장 p.12 · 미프 1차',
    baseAvg: 3.3,
    currentAvg: 3.4,
    baseVersion: 'v1',
    currentVersion: 'v1',
  },
  {
    // 새 개념. **빈칸으로 두지 않는다** — 0점이나 나빠진 것으로 읽힌다
    conceptId: 'c-state',
    conceptName: 'State 관리',
    source: '교안 AI_LLMOps · 5장 p.88 · 미프 3차',
    baseAvg: null,
    currentAvg: 3.3,
    baseVersion: null,
    currentVersion: 'v2',
  },
  {
    conceptId: 'c-cache',
    conceptName: '캐시 전략',
    source: '교안 Kubernetes 기초 · 5장 p.71 · 미프 2차',
    baseAvg: null,
    currentAvg: 3.4,
    baseVersion: null,
    currentVersion: 'v3',
  },
]
