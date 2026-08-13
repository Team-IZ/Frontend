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
  /*
    **이름을 쓴다**(18차 R3). `1개`만 있을 때는 교안 필터를 걸어도 **무엇이 걸린 건지**
    표에서 확인할 수 없었다 — 0건이 나와도 *"정말 없어서"* 인지 *"필터가 안 먹어서"* 인지
    구분이 안 됐다.

    ⚠ **개수는 `curriculumCount`로 센다.** 이름을 못 찾은 항목은 조용히 빠져서 배열
    길이가 원장 개수와 다를 수 있다(회신 명시). 길이로 세면 화면이 없는 사실을 주장한다.
  */
  return (
    <span className="truncate">
      {project.curriculumNames.length > 0
        ? project.curriculumNames.join(' · ')
        : `${project.curriculumCount}개`}
    </span>
  )
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

      **이름을 쓴다**(18차 R3). `3건 확정`은 개수일 뿐이고, **무엇을 확정했는지**가
      이 회차의 정체다 — 전에는 그걸 보려고 회차마다 상세를 열어야 했다.
      출처 교안·페이지는 여전히 상세 구성 탭이 갖는다.

      ⚠ 개수 표기는 `conceptCount`다 — 배열 길이가 다를 수 있다(회신 명시).
    */
    <span className="flex flex-wrap gap-1">
      {project.conceptNames.length > 0 ? (
        project.conceptNames.map((n) => (
          <Badge key={n} className="border-border-strong bg-surface-2 text-fg-muted border">
            {n}
          </Badge>
        ))
      ) : (
        <Badge className="border-border-strong bg-surface-2 text-fg-muted border">
          {project.conceptCount}건 확정
        </Badge>
      )}
    </span>
  )
}
