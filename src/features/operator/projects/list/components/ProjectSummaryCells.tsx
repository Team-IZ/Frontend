import Badge from '@/components/ui/Badge'
import type { Curriculum, Project } from '../../types'

/*
  회차의 **교안**과 **검증 개념**을 요약해 보여준다. 목록의 셀과 상세 헤더가 같은 것을
  그리므로 한 곳에 둔다 — 각자 만들면 `⚠ 미확정` 같은 신호가 화면마다 다르게 보인다.

  둘 다 **값이 없을 때 무엇을 대신 말하나**가 핵심이다(빈 칸이 곧 할 일 — OP-03 목업
  doc-head). 빅프는 개념이 없고, 교안이 없으면 후보 자체가 없고, 교안은 있는데 3건을
  아직 안 골랐으면 그것이 이 회차의 가장 급한 할 일이다.
*/

/** 교안 — 오퍼레이터에게 교안은 핵심 입력이라 무엇이 붙었는지 다 보인다(세로 나열) */
export function CurriculumSummary({
  project,
  curricula,
}: {
  project: Project
  curricula: Curriculum[]
}) {
  if (project.kind === 'BIG') {
    return <span className="text-fg-subtle">해당 없음</span>
  }
  if (project.curriculumIds.length === 0) {
    return <span className="text-warning font-semibold">교안 연결 안 됨</span>
  }
  return (
    <div className="flex flex-col gap-0.5">
      {project.curriculumIds.map((id) => {
        const c = curricula.find((x) => x.id === id)
        return c ? (
          <span key={id}>
            {c.name} {c.version}
          </span>
        ) : null
      })}
    </div>
  )
}

/*
  검증 개념 — 흡수 열이다. 넷 중 하나가 온다.
    확정    칩 3개
    미확정   ⚠ + 후보가 몇 건인지 — **3건이 없으면 문항을 만들 수 없다**(이 목록의 핵심 신호)
    교안 없음 후보 자체가 안 나온다
    빅프    본인 커밋 영역이라 개념이 없다
*/
export function ConceptSummary({ project }: { project: Project }) {
  if (project.kind === 'BIG') {
    return <span className="text-fg-subtle text-xs">본인 커밋 영역 — 사람마다 다름</span>
  }
  if (project.curriculumIds.length === 0) {
    return <span className="text-fg-subtle text-xs">교안을 먼저 연결해야 후보가 나옵니다</span>
  }
  if (project.concepts.length === 0) {
    return (
      <span className="text-warning text-xs font-semibold">
        ⚠ 미확정 · 후보 {project.conceptCandidateCount}건에서 3건
      </span>
    )
  }
  return (
    <div className="flex flex-wrap gap-1">
      {project.concepts.map((c) => (
        /*
          목업 `.kchip`은 테두리 있는 회색 칩인데, 이는 Badge에 테두리만 더한 것이다
          (radius-full · 11px · 600 · px-2 py-0.5가 이미 같다). 인라인 클래스로 다시
          만들지 않고 Badge를 쓴다.
        */
        <Badge key={c.id} className="border-border-strong bg-surface-2 text-fg-muted border">
          {c.name}
        </Badge>
      ))}
    </div>
  )
}
