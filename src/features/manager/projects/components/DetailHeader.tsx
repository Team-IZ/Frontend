import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { STATUS_LABEL, MANAGED_CLASSES, formatDue, scopeLabel, type Project } from '../mockData'

/*
  MG-08 헤더 — 한 줄 요약(정의서 §3 "구성 탭이 없다"). 교안·검증 개념·요구사항은
  OP-04가 정하고 여기선 읽기만 하므로, 편집 진입점을 두지 않고 텍스트로만 보여준다.
*/

const STATUS_BADGE: Record<Project['status'], 'neutral' | 'success' | 'info'> = {
  PLANNED: 'neutral',
  RUNNING: 'info',
  DONE: 'success',
}

export default function DetailHeader({ project }: { project: Project }) {
  const classNames =
    project.classes.length > 0
      ? project.classes.map((c) => c.className)
      : MANAGED_CLASSES.map((c) => c.name)
  const totalByClass = Object.fromEntries(MANAGED_CLASSES.map((c) => [c.name, c.total])) as Record<
    string,
    number
  >
  const classScope = scopeLabel(classNames, totalByClass as never)

  return (
    <div className="mb-4">
      <Button
        variant="ghost"
        size="sm"
        aria-label="프로젝트 목록으로 돌아가기"
        nativeButton={false}
        render={<Link to="/manager/projects" />}
        className="mb-2 -ml-1.5 p-1.5"
      >
        <ArrowLeft className="size-4" />
        프로젝트
      </Button>
      <div className="flex flex-wrap items-baseline gap-2">
        <h1 className="text-xl font-bold tracking-[-0.01em]">{project.name}</h1>
        <Badge variant={STATUS_BADGE[project.status]}>{STATUS_LABEL[project.status]}</Badge>
      </div>
      <div className="text-fg-subtle mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span>{classScope}</span>
        <span>
          교안{' '}
          <b className="text-fg-muted font-bold">
            {project.curricula.length > 0 ? project.curricula.join(' · ') : '연결 안 됨'}
          </b>
        </span>
        <span>
          검증 개념{' '}
          {project.concepts === null ? (
            <b className="text-warning font-bold">
              ⚠ 미확정 · 후보 {project.conceptCandidateCount}건에서 3건
            </b>
          ) : project.concepts.length === 0 ? (
            <b className="text-fg-muted font-bold">해당 없음</b>
          ) : (
            <b className="text-fg-muted font-bold">{project.concepts.join(' · ')}</b>
          )}
        </span>
        {project.dueAt && <span>제출 마감 {formatDue(project.dueAt)}</span>}
      </div>
    </div>
  )
}
