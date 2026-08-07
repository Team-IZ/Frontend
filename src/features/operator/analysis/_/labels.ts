import type { CellState, RoundSort, Sign } from './api/types'

/*
  표시 라벨 — **화면 것이다.** 연동해도 남는다(api-boundary §1-⑤).
*/

/**
 * 셀 색 — **기수 대비 부호 셋뿐이다.**
 *
 * 값에 칠하지 않는다. 위험자 비율에는 **기획이 정한 눈금이 없어서** 구간을 나누면
 * 화면이 기준을 만드는 것이 된다(E8 · 02-layout §7). 부호까지만 쓰면 정할 것이 없다.
 *
 * **MG-02 램프를 쓰지 않는다**(op-06-admin.md OP06-2). 정의서는 *"오퍼레이터와 매니저가 같은
 * 회차를 두고 이야기하므로 램프가 같아야 한다"* 고 했는데, 실제로는 **같은 붉은색이 두
 * 화면에서 다른 뜻**이었다 — MG-02는 `도달 0단`(절대), 여기는 `기수보다 나쁨`(상대).
 * *"빨간 거 봤어요?"* 가 서로 다른 것을 가리킨다. 색을 갈라야 그 혼선이 없어지고,
 * **기수 간 비교 탭에서만 램프를 공유**해 그 탭은 MG-02와 진짜로 말이 통한다.
 *
 * 청↔무채↔적을 고른 이유 — 색 검증기에서 적↔녹은 색각 이상 ΔE 6.8(하한 밴드)인데
 * 청↔적은 20.1로 전 검사를 통과한다. 그리고 **중간점에 색상이 있으면 "약간 나쁨"으로
 * 읽히므로** 중립은 무채색이다.
 */
/*
  **중립은 색을 아예 뺀다.** 셀 100개가 전부 칠해져 있으면 색이 더 이상 신호가 아니다 —
  실측에서 이 화면의 색 면적이 9%(프로젝트 목록은 1%)였고, 그래서 붉은 칸을 눈으로
  고를 수 없었다.

  `기수와 같음`은 **말 그대로 아무 일도 없는 것**이라 바탕이 맞다. 색이 빠지면 남는
  붉은 줄·푸른 줄이 실제로 튀어서, 정의서가 말한 *"가로로 붉은 줄이 이어지는 모양"* 이
  비로소 보인다.
*/
export const SIGN_CLASS: Record<Sign, string> = {
  BETTER: 'bg-info-soft text-info',
  SAME: 'text-fg-muted',
  WORSE: 'bg-danger-soft text-danger',
  // 기준선 자신 — 자기와 비교할 수 없으므로 색이 없다
  BASELINE: 'text-fg',
}

/** 범례에서만 쓴다 — 셀에는 색이 없지만 범례에는 자리가 있어야 셋이 나란히 읽힌다 */
export const SIGN_SWATCH: Record<'BETTER' | 'SAME' | 'WORSE', string> = {
  BETTER: 'bg-info-soft',
  SAME: 'bg-surface',
  WORSE: 'bg-danger-soft',
}

/** 값이 없는 칸. **셋이 서로 다르고 `0%`와도 다르다**(F3) */
export const CELL_STATE_LABEL: Record<Exclude<CellState, 'VALUE'>, string> = {
  PENDING: '집계 전',
  BEFORE: '시작 전',
}

/** 셀에 두 줄을 넣지 않는다(E11) — 뜻은 범례가 말한다 */
export const CELL_STATE_HINT: Record<Exclude<CellState, 'VALUE'>, string> = {
  PENDING: '리포트 미발행 — 발행되면 값이 채워집니다',
  BEFORE: '아직 시작하지 않은 회차입니다',
}

/**
 * 범례에 쓰는 설명. **둘을 한 줄로 묶지 않는다.**
 *
 * `값이 아직 없음` 하나로 뭉치면 오퍼레이터가 할 일이 같아 보이는데 실제로는 다르다 —
 * `집계 전`은 **기다리면 채워지고**, `시작 전`은 **아직 시작도 안 한 회차**다.
 * 없음과 0을 다르게 표시하는 것과 같은 이유다(F3).
 */
export const CELL_STATE_LEGEND: { label: string; desc: string }[] = [
  { label: CELL_STATE_LABEL.PENDING, desc: '리포트가 발행되면 채워집니다' },
  { label: CELL_STATE_LABEL.BEFORE, desc: '아직 시작하지 않은 회차' },
]

/**
 * `위험자` 정의 — 9-2 판정 그대로.
 *
 * 화면에 아홉 번 나오는 말인데 정의가 어디에도 없었다. 다만 **매번 보일 필요는 없어서**
 * 범례의 `?`로 접는다 — 처음 보는 사람은 열고, 아는 사람은 안 본다.
 */
export const RISK_DEFINITION = '검증 개념 3건 중 2단 이하가 2개 이상인 학생'

/**
 * 도달 단계 계단 — 14번 5절의 L1~L4 그대로.
 *
 * **`2단 이하`가 기준인 이유가 이 표에 있다.** L2(설계논리)까지가 필수 구간이고,
 * 그 위(L3 대안비교·L4 반례대응)는 선택이다 — 9-1이 *"2단 이하인 검증 개념이 있으면
 * 처방 대상"* 이라 한 것은 **필수를 못 넘겼다**는 뜻이다.
 *
 * 매니저 화면(`project-detail.html`)이 이미 같은 문구를 쓴다 — **같은 말이 두 화면에서
 * 같아야** 한다.
 *
 * `0단`(응답 없음·무성의)은 뺀다 — 이 표는 평균값이라 단독으로 나오지 않고, 무효 응시는
 * 애초에 평균에서 제외된다(14-1).
 */
export const REACH_STEPS = [
  { step: 1, label: '무엇을 하는지', required: true },
  { step: 2, label: '왜 그렇게 했는지', required: true },
  { step: 3, label: '다른 방법과 비교', required: false },
  { step: 4, label: '언제 깨지는지', required: false },
] as const

/**
 * 이 표로 무엇을 판단하나 — **탭마다 다르다.**
 *
 * 축 라벨(`숫자 = 위험자 비율`)은 **읽는 법**이지 **왜 보는지**가 아니다. 격자만 주고
 * 사용자가 용도를 유추하게 두면, 처음 보는 사람은 숫자를 훑다가 나간다.
 *
 * A8이 금지한 것은 *"화면의 숫자를 문장으로 다시 읽어주는 것"* 이다. 이건 숫자 해설이
 * 아니라 **표의 용도**라 걸리지 않는다 — 다만 한 줄을 넘기면 그때부터 잔소리다.
 */
export const TAB_PURPOSE = {
  rounds: '기수와 견줘 어느 반이 계속 벗어나 있는지 봅니다 — 붉은 칸이 가로로 이어지면 그 반입니다',
  cohorts: '교안을 고친 것이 효과가 있었는지 봅니다 — 버전이 바뀐 개념의 값을 견줍니다',
} as const

/** 정렬 4종은 **서로 다른 질문**이다(OP-02 §4-3) */
export const ROUND_SORT_LABEL: Record<RoundSort, string> = {
  LATEST_WORST: '최근 발행 회차 나쁜 순',
  WORSE_COUNT: '기준보다 나쁜 회차가 많은 순',
  UNCOUNTED: '미집계 많은 순',
  NAME: '이름순',
}

export const ROUND_SORTS = Object.keys(ROUND_SORT_LABEL) as RoundSort[]

/** 미집계 3종. 쏠린 종류마다 **오퍼레이터가 볼 곳이 다르다**(OP-02 §4-2) */
export const UNCOUNTED_LABEL = {
  absent: '미응시',
  invalid: '무효 응시',
  aborted: '중단',
} as const

/**
 * **색 배경 대신 글자색을 쓴다.** 배경을 칠하면 그 위 글자의 대비를 세 색 전부에서
 * 맞춰야 하는데, 연한 배경(`border-strong`) 위 흰 글자는 1.6:1로 한참 미달이었다.
 * 배경을 빼면 대비는 글자색 하나로 결정되고 셋 다 4.5:1을 넘는다.
 *
 * 그리고 **셀 색(청↔적)과 겹치지 않는다** — 미집계는 값이 아니라 분모가 깎인 사유라
 * 같은 색 체계로 읽히면 안 된다.
 */
export const UNCOUNTED_CLASS = {
  absent: 'text-fg-muted',
  invalid: 'text-warning',
  aborted: 'text-info',
} as const

/**
 * 열 머리에 얹는 짧은 라벨. **숫자만 나열하면 무엇이 무엇인지 알 수 없다.**
 *
 * 표에서 값의 뜻을 말하는 것은 열 머리다 — 범례는 표 아래 오른쪽 끝이라 눈이 왕복해야
 * 하고, 그 왕복이 매 행마다 필요하면 읽히지 않는다. 전체 이름은 `title`로 준다.
 */
export const UNCOUNTED_SHORT = {
  absent: '미응시',
  invalid: '무효',
  aborted: '중단',
} as const

/** 열 머리를 누르면 그 회차 현황으로 간다 */
export const projectPath = (id: string) => `/operator/projects/${id}`

export const REACH_RAMP = [
  'bg-reach-0',
  'bg-reach-1',
  'bg-reach-2',
  'bg-reach-3',
  'bg-reach-4',
] as const

/**
 * 평균 도달 단계 → MG-02와 **같은 램프**. 여기서만 공유가 성립한다 —
 * 같은 개념·같은 교안이라 1~4단이 두 기수에서 같은 뜻이다.
 *
 * **반올림이 아니라 내림이다.** 반올림을 쓰면 `2.5 · 2.9 · 3.2 · 3.4`가 **전부 3단**이
 * 되어 색이 하나로 뭉갠다(실제 렌더에서 여섯 행이 같은 초록이었다). 내림은 `2단대`와
 * `3단대`를 가르는데, 그 둘은 실제로 다른 뜻이다.
 *
 * **0.1 차이를 색으로 구분하지 않는다** — 그건 없는 정밀도이고, 그 크기는 `변화` 열이
 * 이미 숫자로 말한다.
 */
export function reachClass(avg: number): string {
  const step = Math.max(0, Math.min(4, Math.floor(avg)))
  return REACH_RAMP[step]
}

/** 0·1단은 배경이 진해 흰 글자, 2~4단은 밝아 어두운 글자 */
export const reachFg = (avg: number) => (Math.floor(avg) <= 1 ? 'text-white' : 'text-reach-fg')
