/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import { izClient, unwrap, type RequestOptions } from '@/api/_contract'
import type { getMyAssessmentRounds_Response } from './assessmentTypes'

/** 교육생 홈 3구획 조회 — `GET /api/v0/assessment-rounds` */
export const getMyAssessmentRounds = (params: RequestOptions = {}) =>
  unwrap<getMyAssessmentRounds_Response>(
    izClient.GET('/api/v0/assessment-rounds', { signal: params.signal }) as never,
  )
