import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatDateTime } from '@/lib/format'
import type { Project, ProjectStatus } from '../_/api/types'

/*
  MG-08 헤더 — 한 줄 요약(정의서 §3 "구성 탭이 없다"). 교안·검증 개념·요구사항은
  OP-04가 정하고 여기선 읽기만 하므로, 편집 진입점을 두지 않고 텍스트로만 보여준다.

  ⚠ **상태가 `DONE`이 아니라 `CLOSED`다** — 목이 지어낸 이름이었고 서버는
  `PLANNED · RUNNING · CLOSED`를 쓴다(`ProjectStatus`).

  ⚠ **담당 반 문구는 `classScope`로 받는다.** 목은 `MANAGED_CLASSES` 상수(A반 26 ·
  B반 26 · C반 23)를 박아 뒀는데 그건 목업 그림에서 역산한 값이었다. 실제 담당
  반과 인원은 `class-progress`가 주고, 그 조회는 화면이 갖고 있어 여기로 내려온다.

  ⚠ **제출 마감은 `submissionDueAt`이다.** `endDate`는 회차 기간의 종료 날짜일 뿐
  시각 의미가 없어 「제출 마감」으로 그리면 안 된다고 스펙이 못박았다 — 둘은 서버에서
  연결돼 있지 않아 기간을 늘려도 마감은 안 움직인다.
*/

const STATUS_LABEL: Record<ProjectStatus, string> = {
  PLANNED: '예정',
  RUNNING: '진행 중',
  CLOSED: '종료',
}

const STATUS_BADGE: Record<ProjectStatus, 'neutral' | 'success' | 'info'> = {
  PLANNED: 'neutral',
  RUNNING: 'info',
  CLOSED: 'success',
}

export default function DetailHeader({
  project,
  classScope,
}: {
  project: Project
  /** `A반·B반 · 52명`. 아직 반별 현황을 못 읽었으면 없다 */
  classScope?: string
}) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        {/*
          (이슈 277 QA) **기수를 실어 간다** — 오퍼레이터 상세와 같은 이유(`DetailHeader.tsx`
          주석 참고). 고정 경로였으면 스위처로 다른 기수를 골라 두고 들어온 회차에서
          여기를 누를 때 목록이 기본값으로 되돌아간다.
        */}
        <Button
          variant="ghost"
          size="sm"
          aria-label="프로젝트 목록으로 돌아가기"
          nativeButton={false}
          render={<Link to={`/manager/projects?cohort=${project.cohortId}`} />}
          className="-ml-1.5 p-1.5"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <div className="flex flex-wrap items-baseline gap-2">
          {/* 실제 h1은 위 PageHeader(sr-only)가 갖는다 — 화면당 h1 하나 원칙(교안 상세와 같은 패턴) */}
          <span className="text-xl font-bold tracking-[-0.01em]">{project.name}</span>
          <Badge variant={STATUS_BADGE[project.status]}>{STATUS_LABEL[project.status]}</Badge>
        </div>
      </div>
      <div className="text-fg-subtle mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {classScope && <span>{classScope}</span>}
        <span>
          교안{' '}
          <b className="text-fg-muted font-bold">
            {project.curriculumCount > 0
              ? project.curricula.map((c) => c.originalFileName ?? '이름 없음').join(' · ')
              : '연결 안 됨'}
          </b>
        </span>
        <span>
          검증 개념 {/* 미확정 판정은 **개수로 한다** — 이름 배열은 못 찾은 항목이 빠질 수 있다 */}
          {project.conceptCount === 0 ? (
            <b className="text-warning font-bold">
              ⚠ 미확정 · 후보 {project.conceptCandidateCount}건
            </b>
          ) : (
            <b className="text-fg-muted font-bold">
              {project.concepts.map((c) => c.extractedName).join(' · ')}
            </b>
          )}
        </span>
        {project.submissionDueAt && (
          <span>제출 마감 {formatDateTime(project.submissionDueAt)}</span>
        )}
      </div>
    </div>
  )
}
