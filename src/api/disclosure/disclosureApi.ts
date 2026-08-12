/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { izClient, unwrap, type RequestOptions } from '@/api/_contract'
import type {
  findMyDisclosure_Path,
  findMyDisclosure_Response,
  updateDisclosure_Path,
  updateDisclosure_Body,
  updateDisclosure_Response,
} from './disclosureTypes'

/** 내 리포트 공개 상태 조회 — `GET /api/v0/reports/{reportId}/disclosure` */
export const findMyDisclosure = (params: { path: findMyDisclosure_Path } & RequestOptions) =>
  unwrap<findMyDisclosure_Response>(
    izClient.GET('/api/v0/reports/{reportId}/disclosure', {
      params: { path: params.path },
      signal: params.signal,
    }) as never,
  )

/** 리포트 공개 범위 설정 — `PUT /api/v0/reports/{reportId}/disclosure` */
export const updateDisclosure = (
  params: { path: updateDisclosure_Path; body: updateDisclosure_Body } & RequestOptions,
) =>
  unwrap<updateDisclosure_Response>(
    izClient.PUT('/api/v0/reports/{reportId}/disclosure', {
      params: { path: params.path },
      body: params.body,
      signal: params.signal,
    }) as never,
  )
