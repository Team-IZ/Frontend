import Badge from '@/components/ui/Badge'
import { STATUS_LABEL } from '../labels'
import type { ProjectStatus } from '../types'

/*
  상태 배지 — 목업 `.st`는 이미 Badge와 같은 디자인이다(rounded-full · 11px · 600).
  손으로 다시 만들지 않는다.

  `준비됨`만 목업이 primary(브랜드 색)를 쓰는데 그대로 옮기지 않았다. Badge의 변형은
  **의미 색과 1:1**이고 primary는 브랜드 색이라 상태 의미가 없다. 그리고 `준비됨`은
  오퍼레이터가 **할 일이 없는 상태**라 색으로 끌 이유가 없다 — 눈에 띄어야 하는 것은
  `준비 중`(손댈 것이 남았다)이다. E1(처리하면 줄어드는 것만 강조)과 같은 결.
*/
const VARIANT: Record<ProjectStatus, 'warning' | 'info' | 'success' | 'neutral'> = {
  PREP: 'warning',
  READY: 'neutral',
  RUNNING: 'info',
  DONE: 'success',
}

export default function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge variant={VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
}
