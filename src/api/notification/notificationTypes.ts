/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import type { operations } from '@/api/schema'

/*
  operationId별 타입 별칭. 규칙이 고정이라 스키마 이름을 몰라도 찾을 수 있다:
    {operationId}_Body · _Query · _Path · _Header · _Response · _Item · _Errors
*/

// GET /api/v0/cohorts/{cohortId}/notifications/inbox — 매니저 인박스 조회
export type findManagerNotificationInbox_Path =
  operations['findManagerNotificationInbox']['parameters']['path']
export type findManagerNotificationInbox_Query = NonNullable<
  operations['findManagerNotificationInbox']['parameters']['query']
>
export type findManagerNotificationInbox_Response =
  operations['findManagerNotificationInbox']['responses'][200]['content']['application/json']
export type findManagerNotificationInbox_Item = NonNullable<
  findManagerNotificationInbox_Response['items']
>[number]
export type findManagerNotificationInbox_Errors =
  'INBOX_CURSOR_INVALID' | 'UNAUTHENTICATED' | 'ACCESS_DENIED' | 'MANAGER_SCOPE_NOT_FOUND'
