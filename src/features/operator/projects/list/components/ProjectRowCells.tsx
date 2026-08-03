import Badge from '@/components/ui/Badge'
import { cn } from '@/lib/utils/cn'
import { dueLabel, formatDue } from '../../rules'
import type { Curriculum, Project } from '../../types'

/*
  목록 표의 셀 셋. 화면 파일에서 뺀 이유 —

  이 셋은 전부 **"값이 없을 때 무엇을 대신 말하나"** 를 정하는 분기다(빈 칸이 곧 할
  일이라는 이 화면의 원칙, OP-03 목업 doc-head). 화면 파일에 두면 레이아웃 사이에
  분기 30여 줄이 끼어 표의 골격이 안 읽힌다.

  **목록 전용이다.** 상세(OP-04)는 같은 데이터를 다른 방식으로 그린다 — 교안은 등록일과
  함께, 개념은 출처·페이지와 함께, 마감은 응시 창·재시험 창과 함께. 그래서 `list/`
  아래에 두고 공유 위치로 올리지 않는다.
*/

/** 교안 — 오퍼레이터에게 교안은 핵심 입력이라 무엇이 붙었는지 다 보인다(세로 나열) */
export function CurriculumCell({
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
export function ConceptCell({ project }: { project: Project }) {
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

/** 제출 마감 — 날짜 + 남은 일수. `now`는 화면이 넘긴다(목 단계에서는 목업 기준일) */
export function DueCell({ project, now }: { project: Project; now: string }) {
  if (!project.dueAt) {
    return <span className="text-warning font-semibold">미설정</span>
  }
  const due = dueLabel(project.dueAt, now)
  return (
    <div className="flex flex-col gap-0.5">
      <span className="tabular-nums">{formatDue(project.dueAt)}</span>
      {due && (
        // 색만으로 상태를 구분하지 않는다 — 남은 시간 텍스트가 같이 있다(F4)
        <span className={cn('text-2xs', due.urgent ? 'text-danger font-bold' : 'text-fg-subtle')}>
          {due.text}
        </span>
      )}
    </div>
  )
}
