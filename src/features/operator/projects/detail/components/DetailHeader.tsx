import { Link } from 'react-router'
import { ChevronLeftIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { dueLabel, formatDue } from '../../rules'
import ProjectStatusBadge from '../../components/ProjectStatusBadge'
import type { Project } from '../../types'

/*
  상세 머리 — **정체와 마감만.** 탭을 옮겨도 지금 보는 회차가 무엇인지가 사라지면 안 된다.

  **한때 여기에 요약 카드(검증 개념·교안·기간)가 있었다.** 탭을 열어야 그 값이 보이는
  것이 문제였기 때문인데, `개요`가 첫 탭이자 기본 탭이 되면서 그 문제가 사라졌다 —
  들어오면 바로 보인다. 카드를 그대로 뒀으면 **같은 값을 두 곳에 그리는 것**이라
  한쪽만 고쳐질 때 두 곳이 다른 말을 한다(D1). → 값은 개요 탭이 갖는다.

  **마감만 남긴 이유:** 되돌릴 수 없는 마감은 화면에서 가장 크게 보여야 하고(B1),
  현황·구성 탭에서 작업하는 동안에도 *"언제까지인지"* 가 사라지면 안 된다. 나머지
  값들은 그 탭에서 할 일과 무관하다.
*/
export default function DetailHeader({
  project,
  now,
}: {
  project: Project
  /** 남은 일수 기준일. 화면이 넘긴다 */
  now: string
}) {
  const due = project.endDate ? dueLabel(project.endDate, now) : null

  return (
    <div className="mb-4">
      <Link
        to="/operator/projects"
        className="text-fg-subtle hover:text-fg mb-1.5 inline-flex items-center gap-0.5 text-xs"
      >
        <ChevronLeftIcon className="size-3.5" />
        프로젝트 목록
      </Link>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-[-0.01em]">
          {project.name}
          <ProjectStatusBadge status={project.status} />
        </h1>
        {/* 마감은 오른쪽 끝으로 — 제목과 같은 줄에 있되 읽는 순서는 나중이다 */}
        <span className="ml-auto text-sm">
          {project.endDate ? (
            <span className="flex items-baseline gap-1.5">
              <span className="text-fg-subtle text-xs">마감</span>
              <b className="font-semibold tabular-nums">{formatDue(project.endDate)}</b>
              {due && (
                // 색만으로 상태를 구분하지 않는다 — 남은 시간 텍스트가 같이 있다(F4)
                <span
                  className={cn(
                    'text-2xs',
                    due.urgent ? 'text-danger font-bold' : 'text-fg-subtle',
                  )}
                >
                  {due.text}
                </span>
              )}
            </span>
          ) : (
            <span className="text-warning text-xs font-semibold">마감 미설정</span>
          )}
        </span>
      </div>
    </div>
  )
}
