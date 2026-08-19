/*
  등록 진행률 폴링 — 실제 계약. 이슈 224(목업) → 이슈 263(연동)에서 실제 스펙으로 교체.

  백엔드 PR(`feat: derive batch registration progress from the invitation ledger`)로
  `GET /api/v0/cohorts/{cohortId}/trainees/registrations/{batchRequestId}`가 실제로
  생겼고, `npm run api:pull`로 생성 타입(`schema.d.ts`의 `TraineeRegistrationProgressResponse`)에
  이미 반영돼 있다. 그래서 여기서 새로 추정하지 않고 **생성 타입을 그대로 별칭**한다 —
  필드 이름·상태값을 손으로 다시 적으면 스펙이 바뀌었을 때 여기만 낡은 채로 남는다.
*/
import type { findTraineeRegistrationProgress_Response } from '@/api/member/memberTypes'

/** `RUNNING`=발송 중(계속 폴링) · `PARTIAL`=발송이 끝났고 실패가 있음 · `SUCCEEDED`=전부 발송됨 */
export type RegistrationBatchStatus = RegistrationProgress['status']

/** 폴링 응답 한 번. 필드는 스펙 그대로다 — `registeredCount`·`invitationSentCount`·`mailFailedCount`·`mailPendingCount`·`status` */
export type RegistrationProgress = findTraineeRegistrationProgress_Response
