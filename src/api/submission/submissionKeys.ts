/* 자동 생성 — 손으로 고치지 마세요. 다시 만들려면: npm run api:gen */

import type {
  getSubmissionAnalysis_Path,
  getSubmissionAnalysisResult_Path,
  findProjectSubmissionStatus_Path,
  findProjectSubmissionStatus_Query,
  findMySubmission_Path,
} from './submissionTypes'

/*
  `all`이 이 도메인 전체를 가리킨다 — 쓰기 훅이 성공하면 이 접두어로 한 번에 무효화한다.
  "이 상세가 어느 목록에 속하는가"는 스펙에 없어 생성기가 알 수 없다. **넓게 지우는 것은
  틀리지 않는다**(과잉 재조회일 뿐). 부분 무효화가 필요해지면 그 도메인만 계층을 넣는다.
*/
export const submissionKeys = {
  all: ['submission'] as const,
  getSubmissionAnalysis: (params: { path: getSubmissionAnalysis_Path }) =>
    [...submissionKeys.all, 'getSubmissionAnalysis', params.path ?? null] as const,
  getSubmissionAnalysisResult: (params: { path: getSubmissionAnalysisResult_Path }) =>
    [...submissionKeys.all, 'getSubmissionAnalysisResult', params.path ?? null] as const,
  findProjectSubmissionStatus: (params: {
    path: findProjectSubmissionStatus_Path
    query?: findProjectSubmissionStatus_Query
  }) =>
    [
      ...submissionKeys.all,
      'findProjectSubmissionStatus',
      params.path ?? null,
      params.query ?? null,
    ] as const,
  findMySubmission: (params: { path: findMySubmission_Path }) =>
    [...submissionKeys.all, 'findMySubmission', params.path ?? null] as const,
}
