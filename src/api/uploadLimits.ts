/*
  올릴 수 있는 최대 크기 — **실측해봤지만 계산값을 못 정해서, 일부러 여유값으로 둔다**
  (이슈 265, 2026-08-18 결정, 근거는 `decision-log.md` D39 참고).

  ⚠ **이 상한은 지금 교안 PDF(`registerCurriculum`) 하나에만 쓰인다.** CSV·ZIP은 이
  상수를 안 읽는다 — import하는 곳이 `RegisterCurriculumDialog.tsx`뿐이다.

  ## 옛 계산(4.5MB)은 더 이상 이 경로의 실제 제약이 아니다
  아래는 `registerCurriculum`이 Lambda Function URL(`izClient`)을 거치던 시절 근거였다 —
  그 앞단 AWS 플랫폼 한도(요청 6,291,456바이트, 바이너리 본문 base64 ×4/3 감안 실질
  4.5MB)가 벽이었다. 이슈 265로 `registerCurriculum`이 App Runner origin
  도메인(`izOriginClient`)으로 직접 쏘도록 바뀌면서 이 Lambda 벽 자체를 안 지난다.

  ## 실측해봤는데, "정확한 바이트 상한"이 없다는 게 결론이다
  배포된 Vercel 프리뷰(App Runner origin 직결)에서 크기별 PDF로 이분 탐색했다 — 15MB·
  20MB는 통과할 때도, 서버가 순수 Spring 기본 500(`{timestamp,status,error,path}`,
  우리 `{code,message}` 계약이 아님)을 낼 때도 있었다. **같은 크기가 왔다 갔다 한** 데다,
  파일 없이 몇 바이트짜리인 뒤이은 `POST .../analyses` 호출까지 연쇄로 실패한 적이 있어
  — 크기 자체의 벽이 아니라 **큰 업로드를 반복하면 App Runner 인스턴스가 일시적으로
  불안정해지는 것**으로 보인다. 이건 프론트가 계산해서 피할 수 있는 종류가 아니다.

  ## 그래서 아래 값은 "측정한 안전선"이 아니라 "명백한 오조작만 거르는 여유선"이다
  정상적인 교안 PDF가 이 근처까지 클 일은 없다 — 이 상수의 역할은 사람이 실수로 완전히
  엉뚱한 대용량 파일(예: 영상 파일)을 고르는 것만 거르는 것이지, 서버가 실제로 받아줄지를
  보장하는 게 아니다. **진짜 성공 여부는 언제나 서버가 결정하고, 실패하면 화면의 재시도
  안내(「등록하지 못했습니다 — 잠시 후 다시 시도해 주세요」 등)가 받는다.** App Runner
  안정성 자체는 백엔드 요청서 후보로 남긴다(`file-upload-csv-pdf.md` 참고).

  ⚠ **이 파일은 아무것도 import 하지 않는다.** `scripts/check-admin-rules.mts`가 별칭 없이
  직접 읽어 상한을 검산한다(`node --experimental-strip-types`는 `@/`를 못 푼다).
*/

/** 측정한 안전선이 아니라 명백한 오조작만 거르는 여유선이다(이슈 265) — 위 주석 참고 */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024

/** 사용자에게 보여줄 상한 — 계산값과 어긋나지 않게 여기서 만든다 */
export const MAX_UPLOAD_LABEL = `${(MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(1)}MB`

/** 이 파일을 지금 경로로 올릴 수 있나. 못 올리면 **보내지 않는다** */
export const tooLargeToUpload = (file: File) => file.size > MAX_UPLOAD_BYTES
