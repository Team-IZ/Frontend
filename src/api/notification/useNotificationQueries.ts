/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { useQuery } from '@tanstack/react-query'
import type { QueryOptions } from '@/api/_contract'
import { findManagerNotificationInbox } from './notificationApi'
import { notificationKeys } from './notificationKeys'
import type {
  findManagerNotificationInbox_Path,
  findManagerNotificationInbox_Query,
  findManagerNotificationInbox_Response,
} from './notificationTypes'

/** 매니저 인박스 조회 */
export function useFindManagerNotificationInbox(
  params: { path: findManagerNotificationInbox_Path; query?: findManagerNotificationInbox_Query },
  options?: QueryOptions<findManagerNotificationInbox_Response>,
) {
  return useQuery({
    queryKey: notificationKeys.findManagerNotificationInbox(params),
    queryFn: ({ signal }) => findManagerNotificationInbox({ ...params, signal }),
    ...options,
  })
}
