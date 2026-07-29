import { Link } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { AccountStatusBadge } from './AccountStatusBadge'
import type { TraineeDetail } from '../mockData'

/*
  헤더 — 팀은 프로젝트마다 재편성되는 유동값이라(D77~90) 단수로 박지 않고
  "참여 프로젝트: MSA 배포 실습(팀A) · API 서버(팀C)"처럼 프로젝트 컨텍스트와
  함께 표기한다(D105, 리스트 D104 팀 제거와 동일 규범).
*/
export function DetailHeader({ trainee }: { trainee: TraineeDetail }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <Button
        variant="ghost"
        size="sm"
        aria-label="교육생 목록으로 돌아가기"
        nativeButton={false}
        render={<Link to="/manager/trainees" />}
        className="p-1.5"
      >
        <ArrowLeft className="size-5" />
      </Button>
      <div>
        <h1 className="text-xl leading-tight font-bold tracking-[-0.01em]">{trainee.name}</h1>
        <p className="mt-1.5 text-sm text-fg-muted">
          {trainee.cohort} · {trainee.className} ·{' '}
          <AccountStatusBadge status={trainee.accountStatus} />
          {trainee.projects.length > 0 && (
            <span className="ml-1 text-xs text-fg-subtle">
              · 참여 프로젝트: {trainee.projects.map((p) => `${p.name}(${p.team})`).join(' · ')}
            </span>
          )}
        </p>
      </div>
    </div>
  )
}
