/*
  올릴 수 있는 최대 크기 — **지금은 실측 진행 중인 임시값이다(이슈 #265, TEMP).**

  ⚠ **이 상한은 지금 교안 PDF(`registerCurriculum`) 하나에만 쓰인다.** CSV·ZIP은 이
  상수를 안 읽는다 — import하는 곳이 `RegisterCurriculumDialog.tsx`뿐이다.

  ## 옛 계산(4.5MB)은 더 이상 이 경로의 실제 제약이 아니다
  아래는 `registerCurriculum`이 Lambda Function URL(`izClient`)을 거치던 시절 근거였다 —
  그 앞단 AWS 플랫폼 한도(요청 6,291,456바이트, 바이너리 본문 base64 ×4/3 감안 실질
  4.5MB)가 벽이었다. **이슈 #265로 `registerCurriculum`이 App Runner origin
  도메인(`izOriginClient`)으로 직접 쏘도록 바뀌면서 이 Lambda 벽 자체를 안 지난다** —
  아래 숫자는 새 경로의 진짜 상한이 아니라 아직 정하기 전의 여유값이다.

  ## 지금 값(30MB)은 실측 전까지의 임시 여유일 뿐, 계산값이 아니다
  진용님이 배포된 Vercel 프리뷰에서 실제 크기별 PDF로 이분 탐색 중이다(로컬 dev는 Vite
  프록시를 쓰기 때문에 Vercel든 App Runner든 배포 환경의 한도를 안 거친다 — 그래서 배포본
  에서 재는 것). **결과가 나오면 이 상수를 실측값으로 교체하고, 옛 4.5MB 절이 하던 것처럼
  "왜 이 숫자인지" 근거(경계 실측값)를 이 주석에 남길 것.** 지금 30MB는 그 근거가 없는
  임시값이니, 실측이 끝나기 전엔 이 상수의 크기 자체에 의미를 두지 말 것.

  ⚠ **그래도 서버 실패는 계속 처리해야 한다.** 여기 검사는 "어차피 실패할 요청을 안
  보낸다"는 것이지 마지막 방어선이 아니다.

  ⚠ **이 파일은 아무것도 import 하지 않는다.** `scripts/check-admin-rules.mts`가 별칭 없이
  직접 읽어 상한을 검산한다(`node --experimental-strip-types`는 `@/`를 못 푼다).
*/

/** TEMP(#265) — 실측 전까지의 임시 상한. 실측 끝나면 계산 근거와 함께 진짜 값으로 교체할 것 */
export const MAX_UPLOAD_BYTES = 30 * 1024 * 1024

/** 사용자에게 보여줄 상한 — 계산값과 어긋나지 않게 여기서 만든다 */
export const MAX_UPLOAD_LABEL = `${(MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(1)}MB`

/** 이 파일을 지금 경로로 올릴 수 있나. 못 올리면 **보내지 않는다** */
export const tooLargeToUpload = (file: File) => file.size > MAX_UPLOAD_BYTES
