/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { izClient, unwrap, type RequestOptions } from '@/api/_contract'
import type {
  findProjectClassProgress_Path,
  findProjectClassProgress_Query,
  findProjectClassProgress_Response,
} from './projectTypes'

/** 반별 제출·분석·응시 현황 조회 — `GET /api/v0/projects/{projectId}/class-progress` */
export const findProjectClassProgress = (
  params: {
    path: findProjectClassProgress_Path
    query?: findProjectClassProgress_Query
  } & RequestOptions,
) =>
  unwrap<findProjectClassProgress_Response>(
    izClient.GET('/api/v0/projects/{projectId}/class-progress', {
      params: { path: params.path, query: params.query ?? {} },
      signal: params.signal,
    }) as never,
  )
