import { cn } from '@/lib/utils/cn'
import { dueLabel, formatDue } from '../../rules'
import type { Project } from '../../types'

/*
  교안·검증 개념 셀. 한때 상세 헤더와 공유해서 `projects/components/`에 있었는데,
  **개요 탭이 자체 요약 카드를 그리면서 소비자가 목록 하나만 남았다** — 공유물이
  아니게 되면 내려온다(mock-first §3-1의 반대 방향).
*/
export {
  CurriculumSummary as CurriculumCell,
  ConceptSummary as ConceptCell,
} from './ProjectSummaryCells'

/*
  목록 표의 셀 셋. 화면 파일에서 뺀 이유 —

  이 셋은 전부 **"값이 없을 때 무엇을 대신 말하나"** 를 정하는 분기다(빈 칸이 곧 할
  일이라는 이 화면의 원칙, OP-03 목업 doc-head). 화면 파일에 두면 레이아웃 사이에
  분기 30여 줄이 끼어 표의 골격이 안 읽힌다.

  **목록 전용이다.** 상세(OP-04)는 같은 데이터를 다른 방식으로 그린다 — 교안은 등록일과
  함께, 개념은 출처·페이지와 함께, 마감은 응시 창·재시험 창과 함께. 그래서 `list/`
  아래에 두고 공유 위치로 올리지 않는다.
*/

/**
 * 회차 기간 — **시작 ~ 마감**과 남은 일수.
 *
 * **마감만 보여주던 자리다.** 회차는 기간인데 한쪽 끝만 그리면 *"언제 시작하지"* 를 상세를
 * 열어야 안다. 오퍼레이터에게는 **시작일이 더 급한 날짜다** — 준비를 그 전에 끝내야 하므로
 * 준비 마감 시한이 곧 시작일이다.
 *
 * 날짜가 하나뿐인 상태도 그린다(마감만 있고 시작이 없는 옛 데이터 등) — 없는 쪽을 비워
 * 두면 무엇이 빠졌는지가 그 자리에서 보인다.
 *
 * `now`는 화면이 넘긴다(목 단계에서는 목업 기준일).
 */
export function PeriodCell({ project, now }: { project: Project; now: string }) {
  if (!project.endDate) {
    // 시작일은 서버가 필수로 받으므로 비지 않는다 — 비는 것은 마감뿐이다
    return (
      <div className="flex flex-col gap-0.5">
        <span className="tabular-nums">
          {formatDue(project.startDate, true)}
          <span className="text-fg-subtle"> ~ </span>
          <span className="text-warning font-semibold">미설정</span>
        </span>
      </div>
    )
  }
  const due = dueLabel(project.endDate, now)
  return (
    <div className="flex flex-col gap-0.5">
      <span className="tabular-nums">
        {formatDue(project.startDate, true)}
        <span className="text-fg-subtle"> ~ </span>
        {formatDue(project.endDate, true)}
      </span>
      {due && (
        // 색만으로 상태를 구분하지 않는다 — 남은 시간 텍스트가 같이 있다(F4)
        <span className={cn('text-2xs', due.urgent ? 'text-danger font-bold' : 'text-fg-subtle')}>
          {due.text}
        </span>
      )}
    </div>
  )
}
