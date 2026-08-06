import Badge from '@/components/ui/Badge'
import { STATUS_LABEL, type InterviewCaseStatus } from '../mockData'

/*
  상태 3종(정의서 §3) — 예정/종결/제외. 목업 `.st.plan2`(파랑 계열)는 공용 Badge에
  없는 primary 색이라, 가장 뜻이 가까운 `info`로 옮긴다(파랑 계열 유지 — "아직 처리할
  일이 남았다"는 뜻). 종결·제외는 둘 다 `.st.cl`/`.st.ex`처럼 회색이라 `neutral` —
  둘의 시각적 구분은 배지가 아니라 행 자체의 옅어짐으로 준다(`InterviewListScreen`의
  `EXCLUDED` 행 `opacity-45`, 목업 `tr.off{opacity:.45}`와 같다). 라벨은
  `mockData.ts`의 `STATUS_LABEL`이 원천이다 — `InterviewFilters`와 같은 값을 쓴다.
*/
const VARIANT: Record<InterviewCaseStatus, 'info' | 'neutral'> = {
  PLANNED: 'info',
  DONE: 'neutral',
  EXCLUDED: 'neutral',
}

export default function InterviewStatusBadge({ status }: { status: InterviewCaseStatus }) {
  return <Badge variant={VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
}
