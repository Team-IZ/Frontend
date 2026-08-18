/*
  등록 진행률 폴링 — 목 전용 계약. #224.

  착수 시점(2026-08) 백엔드 PR이 아직 없다(SMTP 한도로 보류 — `docs/dev/handoff.md`
  "오늘(2026-08-16) 추가" 참고). 아는 사실은 셋뿐이다:
    · 이메일 발송이 100명 단위 배치로 비동기 처리된다
    · 새 상태 조회 API가 생겼다 —
      `GET /api/v0/cohorts/{cohortId}/trainees/registrations/{batchRequestId}`
    · 등록 응답은 즉시 오고(항상 초대 0명), 발송은 뒤에서 채워진다

  그 외 전부(필드 이름 · 상태 값 종류 · 실패 표현 방식)는 **⚠ estimated** — 이 파일과
  `mockDb.ts`는 화면을 그리기 위한 가정이다. 실제 스펙이 오면(`npm run api:pull`) 생성
  타입 기준으로 다시 쓴다 — 지금 이 모양은 계약이 아니다.
*/

/**
 * 배치 처리 상태.
 *
 * ⚠ estimated — 3단계로 나눌지, 이 이름을 쓸지 전부 추정이다. "발송 완료 인원 수"만
 * 와도 `sent === total`로 완료를 판정할 수 있어 상태값 자체가 없을 수도 있다 — 그래도
 * 화면이 "지금 몇 번째 단계인지"를 한 단어로 말할 자리가 필요해 넣어 둔다.
 */
export type RegistrationBatchStatus = 'WAITING' | 'IN_PROGRESS' | 'COMPLETED'

/**
 * 폴링 응답 한 번.
 *
 * ⚠ estimated 필드 — `failed`. 확인된 사실은 "0명 발송으로 응답 온 뒤 뒤에서 채워진다"
 * 뿐이고 실패 · 재시도 개념 자체는 백엔드에서 언급된 적이 없다. 화면이 실패를 구분해
 * 보여줘야 할 수도 있어 자리만 잡아 둔다 — 스펙에 없으면 이 필드부터 지운다
 * (YAGNI, `docs/dev/mock-first-screens.md` §5).
 */
export type RegistrationProgress = {
  batchRequestId: string
  status: RegistrationBatchStatus
  /** 이 요청으로 초대돼야 할 전체 인원 */
  total: number
  /** 지금까지 초대 메일이 나간 인원 — status가 WAITING이면 항상 0 */
  sent: number
  /** ⚠ estimated — 실패로 표시할 인원. 백엔드가 이 개념을 줄지 미확인 */
  failed: number
}
