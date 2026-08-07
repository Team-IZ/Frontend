/*
  도달 단계(0~4단) 표시 로직 — 색 스케일과 "문항 없음" 해치 무늬. 반·팀 평균처럼
  반올림한 값이든 개인처럼 원값이든 이 스케일 하나로 칠한다(어느 쪽을 쓸지는
  각 사용처 책임).

  ⚠ trainees(MG-05·MG-06)에서 시작해 projects(MG-08, `PersonResultPanel.tsx`)가
  두 번째로 복제해 쓰다가(decision-log D14 "두 번은 기록, 세 번째에 올린다" —
  값만 같으면 되는 5줄이라 그때는 복제가 더 쌌다), heatmap(MG-02)이 세 번째로
  필요해지면서 여기로 승격했다. oxlint `no-restricted-imports`가 feature 간
  교차 import를 막는데 그 에러 메시지 자체가 "공통은 components/common으로
  올린다"고 명시하고 있어, D14가 예고한 "세 번째 도메인" 조건과 린트 규칙이
  같은 결론을 가리켰다. `trainees/lib/reach.ts`는 이 파일을 재수출하고(같은
  도메인 상대경로 참조는 그대로 유지), `projects/components/PersonResultPanel.tsx`
  의 복제본은 지우고 여기서 가져오게 바꿨다.

  ⚠ 도메인 타입에 의존하는 `roundBadgeKind`·`riskBadgeKind`(RoundRecord 판정)는
  여기로 옮기지 않았다 — `src/components/**`는 `@/features/**`를 모른다는 반대편
  린트 규칙을 어기게 된다. 그 둘은 `trainees/lib/reach.ts`에 그대로 남는다.
*/

/** 도달 단계 배경색(0~4단) — 0·4단은 배경이 진해 흰 글자 */
export const REACH_STYLE: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'bg-reach-0 text-white',
  1: 'bg-reach-1 text-reach-fg',
  2: 'bg-reach-2 text-reach-fg',
  3: 'bg-reach-3 text-reach-fg',
  4: 'bg-reach-4 text-white',
}

/** 문항 없음(코드에 그 개념이 없어 못 물었다) 해치 무늬 — 회색 두 톤 반복 대각선 */
export const NA_PATTERN = {
  background:
    'repeating-linear-gradient(45deg, var(--color-reach-na-bg), var(--color-reach-na-bg) 4px, var(--color-border) 4px, var(--color-border) 8px)',
}
