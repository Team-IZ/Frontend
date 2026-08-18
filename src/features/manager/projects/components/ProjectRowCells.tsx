import { TriangleAlertIcon } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import { cn } from '@/lib/utils/cn'
import { formatDate, formatDateTime } from '@/lib/format'
import type { ProjectAction, ProjectProgress, ProjectRow } from '../_/api/listTypes'

/*
  목록 표의 셀 셋 — 화면 파일에서 뺀 이유는 OP-03 ProjectRowCells와 같다: 이 셋은
  전부 "값이 없을 때 무엇을 대신 말하나"를 정하는 분기라, 화면 파일에 두면 표의
  골격이 안 읽힌다. **목록 전용이다** — MG-08 상세는 같은 데이터를 다른 방식으로
  그린다(반별 표로 편다).

  ⚠ **연동으로 바뀐 것** — 목은 회차마다 `classes: ClassProgress[]`(반별 7지표)를
  들고 있었고 셀이 그걸 합산했다. 서버는 회차 집계 하나(`progress`)와 조치 배열
  (`actionItems`)을 주므로 **합산·조립이 사라지고 그리기만 남는다**
  (`docs/dev/screens/mg-07-situations.md` §2).
*/

/**
 * 교안 — 아직 안 붙었으면 "교안 연결 안 됨"(경고색).
 *
 * ⚠ **버전이 없다.** 서버가 파일명만 준다(`curriculumNames`) — 목은 `… v1`을 붙여
 * 뒀는데 지어낼 수 없어 그대로 그린다(요청서 §5).
 */
export function CurriculumCell({ project }: { project: ProjectRow }) {
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
 *
 * ⚠ **미확정 판정이 바뀌었다.** 목은 `concepts === null`이었는데 서버는 **빈 배열**로
 * 온다(MG-09 `conceptNames`와 같다) — 길이로 가른다.
 */
export function ConceptCell({ project }: { project: ProjectRow }) {
  if (project.curricula.length === 0) {
    return <span className="text-fg-subtle text-xs">교안을 먼저 연결해야 후보가 나옵니다</span>
  }
  if (project.concepts.length === 0) {
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

export function ProjectNameCell({ project }: { project: ProjectRow }) {
  return <span className="text-fg font-semibold">{project.name}</span>
}

/**
 * 반 — **조치가 실어 온 반 이름**을 쓴다.
 *
 * 목은 `classes[]`에서 뽑았는데 서버에 그 축이 없다. 조치가 없는 회차는 반 이름을
 * 알 길이 없어 `—`가 된다 — **담당 반 전체를 적지 않는다.** 이 열이 답하는 질문은
 * 「이 회차에 내 반 얘기가 있나」인데, 조치가 없으면 그 답이 「없다」이기 때문이다.
 */
export function ClassesCell({ actions }: { actions: ProjectAction[] }) {
  const names = [...new Set(actions.map((a) => a.className))]
  if (names.length === 0) return <span className="text-fg-subtle text-xs">—</span>
  return <span className="text-xs">{names.join(' · ')}</span>
}

/**
 * 프로젝트 기간 — 시작~마감 + 남은 일수. 마감이 임박했을 때만 빨간 굵은 글씨,
 * 아니면 옅은 회색 — 색만으로 구분하지 않고 글자도 같이 바뀐다(F4).
 *
 * ⚠ **정밀도가 서로 다르다.** `startDate`는 날짜만(`2026-08-03`), `submissionDueAt`은
 * 시각까지 온다. 목은 둘 다 시각이 있어 같은 형식으로 그렸는데, 없는 시각을 `00:00`으로
 * 지어내지 않는다(규칙 D — 모르는 값).
 */
export function PeriodCell({
  startDate,
  dueAt,
}: {
  startDate: string | null
  dueAt: string | null
}) {
  if (!startDate && !dueAt) {
    return <span className="text-warning text-xs font-semibold">미설정</span>
  }
  const due = dueAt ? dueLabel(dueAt) : null
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-fg-muted text-xs tabular-nums">
        {startDate ? formatDate(startDate) : '—'}
        <span className="text-fg-subtle"> ~ </span>
        {dueAt ? formatDateTime(dueAt) : '—'}
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

/**
 * 마감까지 남은 날 — **기준일이 실제 오늘이다**(목은 `MOCK_TODAY` 상수를 썼다).
 *
 * 하루 미만은 「오늘 마감」으로 접는다 — `D-0`은 지났다는 뜻인지 오늘인지 안 갈린다.
 */
function dueLabel(dueAt: string): { text: string; urgent: boolean } {
  const ms = new Date(dueAt).getTime() - Date.now()
  if (Number.isNaN(ms)) return { text: '', urgent: false }
  if (ms < 0) return { text: '마감 지남', urgent: false }
  const days = Math.floor(ms / 86_400_000)
  if (days === 0) return { text: '오늘 마감', urgent: true }
  return { text: `D-${days}`, urgent: days <= 3 }
}

/**
 * 응시 실수 분자(`58`)의 강조 — 0/25/50/75/100% 경계로 reach 5단(사용자 지시).
 *
 * **글자색이 아니라 배경으로 칠한다.** 같은 스케일을 글자에 쓰면 흰 면에서 대비가
 * 1.61~3.52라 안 읽힌다(캔버스 픽셀로 실측). 배경으로 두면 어두운 글자를 받아
 * 4.90~11.29로 통과한다 — 공용 `REACH_STYLE`이 이미 그 조합이다.
 *
 * ⚠ **`REACH_STYLE`을 그대로 쓰지 않고 여기서 다시 적는다.** 그 상수는 히트맵·명부·
 * 상세·리포트가 함께 쓰는 전역 값이고, 0·4단이 흰 글자다(그 화면들에서는 그 모양이
 * 맞다). 여기만 어두운 글자로 바꾸려고 전역을 건드리면 다른 화면 다섯이 같이 바뀐다.
 */
const REACH_CHIP: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'bg-reach-0 text-reach-fg',
  1: 'bg-reach-1 text-reach-fg',
  2: 'bg-reach-2 text-reach-fg',
  3: 'bg-reach-3 text-reach-fg',
  4: 'bg-reach-4 text-reach-fg',
}

/** 응시율 5단 — 서버와 무관한 **화면 표현**이라 연동 후에도 그대로 산다 */
function attendanceReachLevel(attended: number, target: number): 0 | 1 | 2 | 3 | 4 {
  if (target <= 0) return 0
  const ratio = attended / target
  if (ratio >= 1) return 4
  if (ratio >= 0.75) return 3
  if (ratio >= 0.5) return 2
  if (ratio >= 0.25) return 1
  return 0
}

/**
 * 진행 — **화면이 다시 세지 않는다.** 서버가 담당 반 집계를 준다.
 *
 * `progress`가 `null`인 조건이 스펙에 셋 적혀 있다 — 빅프로젝트 · `PLANNED` ·
 * 회차 없음. 「0명이 응시했다」가 아니라 **「셀 대상이 아니다」**라 `—`로 둔다.
 */
export function ProgressColCell({
  progress,
  status,
}: {
  progress: ProjectProgress | null
  status: ProjectRow['status']
}) {
  if (status === 'CLOSED' && !progress) {
    return (
      <div className="text-sm">
        <span className="text-fg-subtle block text-2xs font-bold tracking-wide">프로젝트</span>
        <span className="text-fg-muted font-bold">종료</span>
      </div>
    )
  }
  if (!progress) return <span className="text-fg-subtle text-sm">—</span>

  const level = attendanceReachLevel(progress.assessed, progress.target)
  return (
    <div className="text-sm">
      <span className="text-fg-subtle block text-2xs font-bold tracking-wide">응시</span>
      <span className="flex items-center gap-1 tabular-nums">
        <span
          className={cn(
            'inline-flex items-center rounded-[4px] px-1.5 py-0.5 text-xs font-bold',
            REACH_CHIP[level],
          )}
        >
          {progress.assessed}
        </span>
        <span className="text-fg-muted">/{progress.target}</span>
      </span>
      {/* 담당 반이 둘 이상일 때만 온다 — 어느 반이 뒤처졌는지 */}
      {progress.laggingClass && (
        <span className="text-warning mt-0.5 block text-2xs font-semibold">
          {progress.laggingClass.className} {progress.laggingClass.assessedCount}/
          {progress.laggingClass.targetTraineeCount}
        </span>
      )}
    </div>
  )
}

/**
 * 조치 — 이 화면의 질문(「무엇이 밀렸는지」)에 직접 답한다. 비면 `—`(축하 문구 없음).
 *
 * 목은 `prefix()`로 반 이름을 붙였는데 **서버가 `className`을 실어 준다.**
 * 🔴 종료 회차의 「면담 N명」은 서버에 자리가 없어 빠졌다(요청서 §5).
 */
const ACTION_TEXT: Record<ProjectAction['type'], { label: string; tone: string }> = {
  UNSUBMITTED_TEAMS: { label: '미제출', tone: 'text-warning font-semibold' },
  ANALYSIS_FAILED_TEAMS: { label: '분석 실패', tone: 'text-danger font-semibold' },
}

export function ActionColCell({ items }: { items: ProjectAction[] }) {
  if (items.length === 0) return <span className="text-fg-subtle text-xs">—</span>
  return (
    <div className="flex flex-col gap-0.5 text-xs">
      {items.map((a, i) => {
        const t = ACTION_TEXT[a.type]
        return (
          <span key={`${a.classId}-${a.type}-${i}`} className={t.tone}>
            {a.className} {t.label} {a.teamCount}팀
          </span>
        )
      })}
    </div>
  )
}
