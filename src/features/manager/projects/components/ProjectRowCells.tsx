import { TriangleAlertIcon } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import { cn } from '@/lib/utils/cn'
import {
  attendanceReachLevel,
  dueLabel,
  formatDue,
  type ActionItem,
  type ClassProgress,
  type Project,
  type ProgressCell,
} from '../mockData'

/*
  목록 표의 셀 셋 — 화면 파일에서 뺀 이유는 OP-03 ProjectRowCells와 같다: 이 셋은
  전부 "값이 없을 때 무엇을 대신 말하나"를 정하는 분기라, 화면 파일에 두면 표의
  골격이 안 읽힌다. **목록 전용이다** — MG-08 상세는 같은 데이터를 다른 방식으로
  그린다(반별 표로 편다).
*/

/**
 * 교안 — OP-03 `CurriculumSummary`와 같은 세로 나열. 아직 교안이 안 붙었으면
 * "교안 연결 안 됨"(경고색) — OP-03과 같은 톤이다(4차 반영, 정의서의
 * "경고 안 띄운다" 판단을 뒤집었다).
 */
export function CurriculumCell({ project }: { project: Project }) {
  if (project.curricula.length === 0) {
    return <span className="text-warning text-xs font-semibold">교안 연결 안 됨</span>
  }
  return (
    <div className="flex flex-col gap-0.5 text-xs">
      {project.curricula.map((c) => (
        <span key={c}>{c}</span>
      ))}
    </div>
  )
}

/**
 * 검증 개념 3건 — 확정 칩 3개 · 미확정(⚠ + 후보 건수) · 교안 미연결.
 * OP-03 `ConceptSummary`와 같은 3분기로 맞췄다(4차 반영).
 */
export function ConceptCell({ project }: { project: Project }) {
  if (project.curricula.length === 0) {
    return <span className="text-fg-subtle text-xs">교안을 먼저 연결해야 후보가 나옵니다</span>
  }
  if (project.concepts === null) {
    return (
      <span className="text-warning flex items-center gap-1 text-xs font-semibold">
        <TriangleAlertIcon className="size-3.5" />
        미확정 · 후보 {project.conceptCandidateCount}건에서 3건
      </span>
    )
  }
  return (
    <div className="flex flex-wrap gap-1">
      {project.concepts.map((c) => (
        // kchip = Badge + 테두리(OP-03 ConceptSummary와 같은 조합)
        <Badge key={c} className="border-border-strong bg-surface-2 text-fg-muted border">
          {c}
        </Badge>
      ))}
    </div>
  )
}

export function ProjectNameCell({ project }: { project: Project }) {
  return <span className="text-fg font-semibold">{project.name}</span>
}

/**
 * 반 — 이 회차에 실제로 반별 데이터가 있으면 그 반 이름을(A반·B반·C반), 아직
 * 없으면(예정 회차) "—"(4차 반영, 사용자 지시로 새로 추가한 열).
 */
export function ClassesCell({ classes }: { classes: ClassProgress[] }) {
  if (classes.length === 0) return <span className="text-fg-subtle text-xs">—</span>
  return <span className="text-xs">{classes.map((c) => c.className).join(' · ')}</span>
}

/**
 * 프로젝트 기간 — 시작~마감 전체 범위 + 남은 일수(OP-03 `PeriodCell`과 같은 모양,
 * 4차 반영 — "제출 마감" 단일 날짜에서 바뀌었다). 마감이 임박했을 때만 빨간
 * 굵은 글씨, 아니면 옅은 회색 — 색만으로 구분하지 않고 글자도 같이 바뀐다(F4).
 * 시작·마감이 둘 다 없으면 "미설정"(경고색). 시작·마감 둘 다 날짜+시간까지 보여준다
 * (5차 반영 — 시작일은 원래 시간을 잘라 날짜만 보였는데, 마감과 같은 정밀도로 맞췄다).
 * 남은 일수 줄은 위 날짜 범위 줄보다 짧아 눈에 안 맞아 보였다 — 가운데 정렬한다.
 */
export function PeriodCell({ startAt, dueAt }: { startAt: string | null; dueAt: string | null }) {
  if (!startAt && !dueAt) {
    return <span className="text-warning text-xs font-semibold">미설정</span>
  }
  const due = dueAt ? dueLabel(dueAt) : null
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-fg-muted text-xs tabular-nums">
        {startAt ? formatDue(startAt) : '—'}
        <span className="text-fg-subtle"> ~ </span>
        {dueAt ? formatDue(dueAt) : '—'}
      </span>
      {due && (
        <span
          className={cn(
            'text-center text-2xs',
            due.urgent ? 'text-danger font-bold' : 'text-fg-subtle',
          )}
        >
          {due.text}
        </span>
      )}
    </div>
  )
}

/** 응시 실수 분자(`58`)의 강조 색 — 0/25/50/75/100% 경계로 reach 5단(사용자 지시) */
const REACH_TEXT: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'text-reach-0',
  1: 'text-reach-1',
  2: 'text-reach-2',
  3: 'text-reach-3',
  4: 'text-reach-4',
}

/** 진행 — 파이프라인 현재 단계 하나(정의서 §3). 예정 회차는 아직 아무 일도 없다 */
export function ProgressColCell({ cell }: { cell: ProgressCell | null }) {
  if (!cell) return <span className="text-fg-subtle text-sm">—</span>
  if (cell.kind === 'DONE') {
    return (
      <div className="text-sm">
        <span className="text-fg-subtle block text-2xs font-bold tracking-wide">리포트</span>
        <span className="text-success font-bold">발행 완료</span>
      </div>
    )
  }
  const level = attendanceReachLevel(cell.attended, cell.attendable)
  return (
    <div className="text-sm">
      <span className="text-fg-subtle block text-2xs font-bold tracking-wide">응시</span>
      <span className="tabular-nums">
        <span className={cn('font-bold', REACH_TEXT[level])}>{cell.attended}</span>
        <span className="text-fg-muted">/{cell.attendable}</span>
      </span>
    </div>
  )
}

const ACTION_TONE_CLASS: Record<ActionItem['tone'], string> = {
  warning: 'text-warning font-semibold',
  danger: 'text-danger font-semibold',
  todo: 'text-primary font-semibold',
}

/** 조치 — 이 화면의 질문("무엇이 밀렸는지")에 직접 답한다. 비면 "—"(축하 문구 없음) */
export function ActionColCell({ items }: { items: ActionItem[] }) {
  if (items.length === 0) return <span className="text-fg-subtle text-xs">—</span>
  return (
    <div className="flex flex-col gap-0.5 text-xs">
      {items.map((a, i) => (
        <span key={i} className={ACTION_TONE_CLASS[a.tone]}>
          {a.text}
        </span>
      ))}
    </div>
  )
}
