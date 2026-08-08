/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { izClient, unwrap, type RequestOptions } from '@/api/_contract'
import type {
  inviteManager_Path,
  inviteManager_Body,
  inviteManager_Response,
  registerTrainees_Path,
  registerTrainees_Body,
  registerTrainees_Response,
  getCurrentMember_Response,
} from './memberTypes'

/** 매니저 초대 — `POST /api/v0/members/organizations/{organizationId}/manager-invitations` */
export const inviteManager = (
  params: { path: inviteManager_Path; body: inviteManager_Body } & RequestOptions,
) =>
  unwrap<inviteManager_Response>(
    izClient.POST('/api/v0/members/organizations/{organizationId}/manager-invitations', {
      params: { path: params.path },
      body: params.body,
      signal: params.signal,
    }) as never,
  )

/** 직접 입력 교육생 등록 및 초대 — `POST /api/v0/cohorts/{cohortId}/trainees/invitations` */
export const registerTrainees = (
  params: { path: registerTrainees_Path; body: registerTrainees_Body } & RequestOptions,
) =>
  unwrap<registerTrainees_Response>(
    izClient.POST('/api/v0/cohorts/{cohortId}/trainees/invitations', {
      params: { path: params.path },
      body: params.body,
      signal: params.signal,
    }) as never,
  )

/** 내 정보 조회 — `GET /api/v0/members/me` */
export const getCurrentMember = (params: RequestOptions = {}) =>
  unwrap<getCurrentMember_Response>(
    izClient.GET('/api/v0/members/me', { signal: params.signal }) as never,
  )
