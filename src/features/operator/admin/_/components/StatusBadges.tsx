import { Badge } from '@/components/ui/Badge'
import {
  ACCOUNT_STATUS_LABEL,
  COHORT_STATUS_LABEL,
  CURRICULUM_STATUS_LABEL,
  LINKED_PROJECT_STATUS_LABEL,
  MANAGER_STATUS_LABEL,
} from '../labels'
import type {
  AccountStatus,
  CohortStatus,
  CurriculumStatus,
  LinkedProjectStatus,
} from '../api/types'

/*
  상태 배지 다섯 벌.

  **색을 여기서 한 번만 정한다.** 같은 상태가 탭마다 다른 색이면 화면을 오갈 때 무엇이
  같은 상태인지 안 보인다 — 라벨은 labels.ts가, 색은 여기가 주인이다.

  **글자가 상태를 그대로 말한다**(Badge.tsx 주석 · F4). 색을 구분하기 어려운 사용자에게
  색은 아무 정보도 주지 않으므로, 배지 안의 글자가 유일한 전달 수단이다.

  변형 어휘는 토큰 이름과 1:1이다 — `success` 정상·활성 / `warning` 주의 / `danger`
  위험·실패 / `info` 안내 / `neutral` 비활성·보류.
*/
type Variant = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const COHORT: Record<CohortStatus, Variant> = {
  // 개강 전은 **아직**이다 — 할 일이 남았다는 뜻이라 안내색을 쓴다(경고는 아니다)
  PLANNED: 'info',
  RUNNING: 'success',
  // 종료는 나쁜 것이 아니라 **끝난 것**이다 — 의미 색을 쓰지 않는다
  CLOSED: 'neutral',
}

const ACCOUNT: Record<AccountStatus, Variant> = {
  ACTIVE: 'success',
  INVITED: 'info',
  INACTIVE: 'neutral',
}

const MANAGER: Record<AccountStatus, Variant> = {
  ACTIVE: 'success',
  INVITED: 'info',
  // 정지는 되돌릴 수 있고(재활성) 사고가 아니다 — danger가 아니라 회색이다
  INACTIVE: 'neutral',
}

const CURRICULUM: Record<CurriculumStatus, Variant> = {
  DONE: 'success',
  ANALYZING: 'info',
  // 실패한 교안은 **프로젝트에 연결할 수 없다** — 조치가 필요한 상태라 danger다
  FAILED: 'danger',
}

const LINKED_PROJECT: Record<LinkedProjectStatus, Variant> = {
  PREP: 'warning',
  READY: 'info',
  RUNNING: 'success',
  DONE: 'neutral',
}

export const CohortStatusBadge = ({ status }: { status: CohortStatus }) => (
  <Badge variant={COHORT[status]}>{COHORT_STATUS_LABEL[status]}</Badge>
)

export const AccountStatusBadge = ({ status }: { status: AccountStatus }) => (
  <Badge variant={ACCOUNT[status]}>{ACCOUNT_STATUS_LABEL[status]}</Badge>
)

export const ManagerStatusBadge = ({ status }: { status: AccountStatus }) => (
  <Badge variant={MANAGER[status]}>{MANAGER_STATUS_LABEL[status]}</Badge>
)

export const CurriculumStatusBadge = ({ status }: { status: CurriculumStatus }) => (
  <Badge variant={CURRICULUM[status]}>{CURRICULUM_STATUS_LABEL[status]}</Badge>
)

export const LinkedProjectStatusBadge = ({ status }: { status: LinkedProjectStatus }) => (
  <Badge variant={LINKED_PROJECT[status]}>{LINKED_PROJECT_STATUS_LABEL[status]}</Badge>
)

/**
 * 담당 없는 반 표시. **배지가 아니라 경고다** — 처리하면 없어지는 상태이고, OP-01
 * `조치 필요`가 같은 사실을 올린다.
 */
export const NoManagerBadge = () => <Badge variant="warning">담당 필요</Badge>
