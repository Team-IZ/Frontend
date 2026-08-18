/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { izClient, unwrap, type RequestOptions } from '@/api/_contract'
import type {
  findManagerNotificationInbox_Path,
  findManagerNotificationInbox_Query,
  findManagerNotificationInbox_Response,
} from './notificationTypes'

/** 매니저 인박스 조회 — `GET /api/v0/cohorts/{cohortId}/notifications/inbox` */
export const findManagerNotificationInbox = (
  params: {
    path: findManagerNotificationInbox_Path
    query?: findManagerNotificationInbox_Query
  } & RequestOptions,
) =>
  unwrap<findManagerNotificationInbox_Response>(
    izClient.GET('/api/v0/cohorts/{cohortId}/notifications/inbox', {
      params: { path: params.path, query: params.query ?? {} },
      signal: params.signal,
    }) as never,
  )
