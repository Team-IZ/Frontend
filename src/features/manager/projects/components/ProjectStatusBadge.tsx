import Badge from '@/components/ui/Badge'
import { STATUS_LABEL, type ProjectStatus } from '../_/api/listTypes'

/*
  목업 `.st.plan`(회색) · `.st.run`(파랑) · `.st.done`(초록)을 그대로 옮긴다.
  OP-03 ProjectStatusBadge와 색을 맞추되(같은 의미는 같은 색) `준비 중`·`준비됨`
  구분이 없어 매핑이 더 단순하다.
*/
const VARIANT: Record<ProjectStatus, 'neutral' | 'info' | 'success'> = {
  PLANNED: 'neutral',
  RUNNING: 'info',
  /* 목은 `DONE`이었다 — 서버 값은 `CLOSED`다(이름만 다르다) */
  CLOSED: 'success',
}

export default function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge variant={VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
}
