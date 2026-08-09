import Badge from '@/components/ui/Badge'
import { CONCEPT_COUNT } from '../../rules'
import type { Project } from '../../types'

/*
  회차의 **교안**과 **검증 개념**을 요약해 보여준다.

  둘 다 **값이 없을 때 무엇을 대신 말하나**가 핵심이다(빈 칸이 곧 할 일 — OP-03 목업
  doc-head). 교안이 없으면 후보 자체가 없고, 교안은 있는데 3건을 아직 안 골랐으면
  그것이 이 회차의 가장 급한 할 일이다.

  ─── 연동하며 바뀐 것 ───────────────────────────────────────────
  **목록은 숫자만 받는다.** 목에서는 교안 id 배열을 받아 교안 목록과 조인해 이름을
  나열했는데, 서버 목록 응답은 `curriculumCount`·`conceptCount`만 준다(교안·개념 배열은
  상세에만 온다 — 회차마다 전량을 끌고 오지 않으려는 것이고, 9차 R1에서 우리가 그렇게
  요청했다).

  그래서 **이름 나열을 개수로 바꿨다.** 조인이 사라지면서 목록 화면의 교안 조회도
  필요 없어졌다 — 표가 이름을 안 그리므로 부를 이유가 없다.
*/

/** 교안 — 몇 개 붙었나. 0이면 **후보 자체가 없다**는 뜻이라 그 사실을 쓴다 */
export function CurriculumSummary({ project }: { project: Project }) {
  if (project.curriculumCount === 0) {
    return <span className="text-warning font-semibold">교안 연결 안 됨</span>
  }
  return <span className="tabular-nums">{project.curriculumCount}개</span>
}

/*
  검증 개념 — 흡수 열이다. 셋 중 하나가 온다.
    확정    `3건 확정` — 문항이 만들어졌다
    미확정   ⚠ + 후보가 몇 건인지 — **3건이 없으면 문항을 만들 수 없다**(이 목록의 핵심 신호)
    교안 없음 후보 자체가 안 나온다
*/
export function ConceptSummary({ project }: { project: Project }) {
  if (project.curriculumCount === 0) {
    return <span className="text-fg-subtle text-xs">교안을 먼저 연결해야 후보가 나옵니다</span>
  }
  if (project.conceptCount === 0) {
    return (
      <span className="text-warning text-xs font-semibold">
        ⚠ 미확정 · 후보 {project.conceptCandidateCount}건에서 {CONCEPT_COUNT}건
      </span>
    )
  }
  return (
    /*
      목업 `.kchip`은 테두리 있는 회색 칩인데, 이는 Badge에 테두리만 더한 것이다
      (radius-full · 11px · 600 · px-2 py-0.5가 이미 같다). 인라인 클래스로 다시
      만들지 않고 Badge를 쓴다.

      ⚠ **이름을 못 쓴다.** 목록 응답에 개념 배열이 없어 `3건 확정`까지만 말한다 —
      이름은 상세 구성 탭이 출처·페이지와 함께 그린다.
    */
    <Badge className="border-border-strong bg-surface-2 text-fg-muted border">
      {project.conceptCount}건 확정
    </Badge>
  )
}
