import { Badge } from '@/components/ui/Badge'
import type { AccountStatus } from '../mockData'

const LABEL: Record<AccountStatus, string> = {
  ACTIVE: '활성',
  INVITED: '초대 대기',
  INACTIVE: '비활성',
}

const VARIANT: Record<AccountStatus, 'success' | 'info' | 'neutral'> = {
  ACTIVE: 'success',
  INVITED: 'info',
  INACTIVE: 'neutral',
}

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  return <Badge variant={VARIANT[status]}>{LABEL[status]}</Badge>
}
