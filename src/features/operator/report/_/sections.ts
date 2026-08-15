/*
  다섯 섹션의 **제목과 질문** — 화면(탭·제목줄)·인쇄·CSV가 같이 읽는다.

  `ReportScreen`에만 두면 CSV가 같은 문장을 다시 적어야 하고, 그러면 화면에서 문구를
  고쳐도 내보낸 파일은 옛 문장을 들고 나간다 — 같은 문서의 세 형식이 서로 다른 말을
  하게 된다. 개수·메타처럼 화면에만 필요한 것은 여기 두지 않는다(그건 `ReportScreen`이
  `Report`를 받아 붙인다).

  **순서가 곧 문서의 순서다** — 넓은 단위에서 좁은 단위로:
  요약(전체) → 회차별(시간) → 개념별(내용) → 반·집단(집단) → 우수 교육생(개인).
  `question`이 그 순서를 실제로 전달한다 — 각 섹션이 앞 섹션이 남긴 물음을 받아 적는다.
*/
export const REPORT_SECTIONS = [
  { key: 'summary', title: '요약', question: '무엇을, 몇 명에게서, 어디까지 셌나' },
  { key: 'round', title: '프로젝트별', question: '어느 프로젝트가 어려웠나' },
  {
    key: 'concept',
    title: '개념별 도달 분포',
    question: '그 프로젝트의 어느 개념에서 갈렸나 — 교안을 고칠 곳',
  },
  { key: 'ops', title: '반 · 집단 미달', question: '특정 반의 문제였나, 개념 자체의 문제였나' },
  { key: 'top', title: '우수 교육생', question: '그럼에도 끝까지 도달한 사람은 누구인가' },
] as const

export type ReportSectionKey = (typeof REPORT_SECTIONS)[number]['key']

/** CSV 블록 제목처럼 화면 밖에서 질문을 붙여 쓸 때 */
export const sectionQuestion = (key: ReportSectionKey) =>
  REPORT_SECTIONS.find((s) => s.key === key)!.question
